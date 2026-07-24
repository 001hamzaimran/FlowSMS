import Flow from '../Model/Flow.js';
import SentRecord from '../Model/SentRecord.js';
import FlowRun from '../Model/FlowRun.js';
import { encrypt, decrypt, maskSecret } from '../Utils/encryption.js';

const sanitizeFlowForClient = (flowDoc) => {
  const flowObj = flowDoc.toObject ? flowDoc.toObject() : { ...flowDoc };
  if (flowObj.twilioAuthTokenEncrypted) {
    try {
      const rawToken = decrypt(flowObj.twilioAuthTokenEncrypted);
      flowObj.twilioAuthTokenMasked = maskSecret(rawToken);
    } catch (e) {
      flowObj.twilioAuthTokenMasked = '••••';
    }
    delete flowObj.twilioAuthTokenEncrypted;
  }
  if (flowObj.twilioSidEncrypted) {
    try {
      flowObj.twilioSid = decrypt(flowObj.twilioSidEncrypted);
    } catch (e) {
      flowObj.twilioSid = '';
    }
    delete flowObj.twilioSidEncrypted;
  }
  return flowObj;
};

export const createFlow = async (req, res) => {
  try {
    const {
      name,
      spreadsheetId,
      sheetName,
      phoneColumn,
      countryCodeColumn,
      mergeFieldColumns,
      messageTemplate,
      scheduleType,
      scheduleTime,
      cronExpression,
      timezone,
      twilioSid,
      twilioAuthToken,
      twilioFromNumber,
    } = req.body;

    if (!name || !spreadsheetId || !sheetName || !phoneColumn || !messageTemplate || !twilioSid || !twilioAuthToken || !twilioFromNumber) {
      return res.status(400).json({ success: false, message: 'Missing required flow fields' });
    }

    const flow = await Flow.create({
      userId: req.user._id,
      name,
      spreadsheetId,
      sheetName,
      phoneColumn,
      countryCodeColumn: countryCodeColumn || '',
      mergeFieldColumns: mergeFieldColumns || [],
      messageTemplate,
      scheduleType: scheduleType || 'one_time',
      scheduleTime: scheduleTime ? new Date(scheduleTime) : null,
      cronExpression: cronExpression || '',
      timezone: timezone || 'UTC',
      twilioSidEncrypted: encrypt(twilioSid),
      twilioAuthTokenEncrypted: encrypt(twilioAuthToken),
      twilioFromNumber,
      status: 'active',
    });

    return res.status(201).json({ success: true, flow: sanitizeFlowForClient(flow) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFlows = async (req, res) => {
  try {
    const flows = await Flow.find({ userId: req.user._id }).sort({ createdAt: -1 });
    const sanitized = flows.map(sanitizeFlowForClient);
    return res.json({ success: true, flows: sanitized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFlowById = async (req, res) => {
  try {
    const flow = await Flow.findOne({ _id: req.params.id, userId: req.user._id });
    if (!flow) {
      return res.status(404).json({ success: false, message: 'Flow not found' });
    }
    return res.json({ success: true, flow: sanitizeFlowForClient(flow) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFlow = async (req, res) => {
  try {
    const flow = await Flow.findOne({ _id: req.params.id, userId: req.user._id });
    if (!flow) {
      return res.status(404).json({ success: false, message: 'Flow not found' });
    }

    const {
      name,
      spreadsheetId,
      sheetName,
      phoneColumn,
      countryCodeColumn,
      mergeFieldColumns,
      messageTemplate,
      scheduleType,
      scheduleTime,
      cronExpression,
      timezone,
      twilioSid,
      twilioAuthToken,
      twilioFromNumber,
      status,
    } = req.body;

    if (name !== undefined) flow.name = name;
    if (spreadsheetId !== undefined) flow.spreadsheetId = spreadsheetId;
    if (sheetName !== undefined) flow.sheetName = sheetName;
    if (phoneColumn !== undefined) flow.phoneColumn = phoneColumn;
    if (countryCodeColumn !== undefined) flow.countryCodeColumn = countryCodeColumn;
    if (mergeFieldColumns !== undefined) flow.mergeFieldColumns = mergeFieldColumns;
    if (messageTemplate !== undefined) flow.messageTemplate = messageTemplate;
    if (scheduleType !== undefined) flow.scheduleType = scheduleType;
    if (scheduleTime !== undefined) flow.scheduleTime = scheduleTime ? new Date(scheduleTime) : null;
    if (cronExpression !== undefined) flow.cronExpression = cronExpression;
    if (timezone !== undefined) flow.timezone = timezone;
    if (twilioFromNumber !== undefined) flow.twilioFromNumber = twilioFromNumber;
    if (status !== undefined) flow.status = status;

    if (twilioSid) flow.twilioSidEncrypted = encrypt(twilioSid);
    if (twilioAuthToken) flow.twilioAuthTokenEncrypted = encrypt(twilioAuthToken);

    await flow.save();

    return res.json({ success: true, flow: sanitizeFlowForClient(flow) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFlow = async (req, res) => {
  try {
    const flow = await Flow.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!flow) {
      return res.status(404).json({ success: false, message: 'Flow not found' });
    }
    // Clean up related sent records and flow runs
    await SentRecord.deleteMany({ flowId: req.params.id });
    await FlowRun.deleteMany({ flowId: req.params.id });

    return res.json({ success: true, message: 'Flow deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const pauseFlow = async (req, res) => {
  try {
    const flow = await Flow.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'paused' },
      { new: true }
    );
    if (!flow) return res.status(404).json({ success: false, message: 'Flow not found' });
    return res.json({ success: true, flow: sanitizeFlowForClient(flow) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resumeFlow = async (req, res) => {
  try {
    const flow = await Flow.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'active', errorMessage: '' },
      { new: true }
    );
    if (!flow) return res.status(404).json({ success: false, message: 'Flow not found' });
    return res.json({ success: true, flow: sanitizeFlowForClient(flow) });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFlowRuns = async (req, res) => {
  try {
    const runs = await FlowRun.find({ flowId: req.params.id }).sort({ startedAt: -1 }).limit(50);
    return res.json({ success: true, runs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSentRecords = async (req, res) => {
  try {
    const records = await SentRecord.find({ flowId: req.params.id }).sort({ sentAt: -1 }).limit(100);
    return res.json({ success: true, records });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
