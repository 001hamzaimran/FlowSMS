import Flow from '../Model/Flow.js';
import User from '../Model/User.js';
import SentRecord from '../Model/SentRecord.js';
import FlowRun from '../Model/FlowRun.js';
import { fetchFullSheetData } from './googleSheets.js';
import { normalizeToE164 } from './phoneValidator.js';
import { renderTemplate } from './templateRenderer.js';
import { sendSmsWithTwilio } from './twilioSender.js';
import { decrypt } from './encryption.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const runFlow = async (flowId, isManualRun = false) => {
  const flow = await Flow.findById(flowId);
  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }

  if (flow.status !== 'active' && !isManualRun) {
    console.log(`Flow ${flowId} is not active (status: ${flow.status}). Skipping execution.`);
    return null;
  }

  const user = await User.findById(flow.userId);
  if (!user) {
    flow.status = 'error';
    flow.errorMessage = 'Flow owner user not found.';
    await flow.save();
    throw new Error(`User not found for flow: ${flowId}`);
  }

  const flowRun = await FlowRun.create({
    flowId: flow._id,
    startedAt: new Date(),
    status: 'running',
  });

  try {
    // 1. Fetch spreadsheet rows
    let sheetData;
    try {
      sheetData = await fetchFullSheetData(user, flow.spreadsheetId, flow.sheetName);
    } catch (err) {
      if (err.code === 'TOKEN_REVOKED') {
        flow.status = 'error';
        flow.errorMessage = 'Google account authorization revoked or expired. Please reconnect.';
        await flow.save();
      }
      flowRun.status = 'failed';
      flowRun.finishedAt = new Date();
      flowRun.errorSummary = err.message;
      await flowRun.save();
      return flowRun;
    }

    const rows = sheetData.rows || [];
    flowRun.rowsProcessed = rows.length;

    // 2. Fetch all previously sent numbers for this flow to physically deduplicate
    const existingRecords = await SentRecord.find({ flowId: flow._id }).select('phoneNumberE164');
    const sentNumbersSet = new Set(existingRecords.map((r) => r.phoneNumberE164));

    let twilioSid, twilioAuthToken;
    try {
      twilioSid = decrypt(flow.twilioSidEncrypted);
      twilioAuthToken = decrypt(flow.twilioAuthTokenEncrypted);
    } catch (e) {
      flow.status = 'error';
      flow.errorMessage = 'Failed to decrypt Twilio credentials.';
      await flow.save();

      flowRun.status = 'failed';
      flowRun.finishedAt = new Date();
      flowRun.errorSummary = 'Decryption error for Twilio credentials';
      await flowRun.save();
      return flowRun;
    }

    const hostUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const statusCallbackUrl = `${hostUrl}/webhooks/twilio/status`;

    // 3. Process rows sequentially / small rate-limited batches
    for (const row of rows) {
      const rawPhone = row[flow.phoneColumn];
      const rawCountryCode = flow.countryCodeColumn ? row[flow.countryCodeColumn] : '';

      const e164Phone = normalizeToE164(rawPhone, rawCountryCode);

      if (!e164Phone) {
        flowRun.rowsInvalid += 1;
        continue;
      }

      // Check if already sent
      if (sentNumbersSet.has(e164Phone)) {
        flowRun.rowsSkipped += 1;
        continue;
      }

      // Render message template
      const messageBody = renderTemplate(flow.messageTemplate, row);

      // Send SMS via Twilio
      const sendResult = await sendSmsWithTwilio({
        accountSid: twilioSid,
        authToken: twilioAuthToken,
        from: flow.twilioFromNumber,
        to: e164Phone,
        body: messageBody,
        statusCallbackUrl,
      });

      if (sendResult.success) {
        try {
          await SentRecord.create({
            flowId: flow._id,
            phoneNumberE164: e164Phone,
            sentAt: new Date(),
            twilioMessageSid: sendResult.messageSid,
            status: sendResult.status === 'queued' ? 'queued' : 'delivered',
          });
          sentNumbersSet.add(e164Phone);
          flowRun.rowsSent += 1;
        } catch (dbErr) {
          // If unique index violation occurs (duplicate send attempt), catch & skip
          if (dbErr.code === 11000) {
            sentNumbersSet.add(e164Phone);
            flowRun.rowsSkipped += 1;
          } else {
            flowRun.rowsFailed += 1;
          }
        }
      } else {
        flowRun.rowsFailed += 1;
      }

      // Rate limit delay (100ms between sends)
      await delay(100);
    }

    flowRun.status = 'completed';
    flowRun.finishedAt = new Date();
    await flowRun.save();

    flow.lastRunAt = new Date();
    if (flow.scheduleType === 'one_time') {
      flow.status = 'completed';
    }
    await flow.save();

    return flowRun;
  } catch (error) {
    console.error(`Flow execution error for ${flowId}:`, error);
    flowRun.status = 'failed';
    flowRun.finishedAt = new Date();
    flowRun.errorSummary = error.message;
    await flowRun.save();
    return flowRun;
  }
};
