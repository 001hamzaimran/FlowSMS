import express from 'express';
import {
  createFlow,
  getFlows,
  getFlowById,
  updateFlow,
  deleteFlow,
  pauseFlow,
  resumeFlow,
  getFlowRuns,
  getSentRecords,
} from '../Controllers/flowController.js';
import { protect } from '../Middlewares/authMiddleware.js';
import { protectInternal } from '../Middlewares/internalOnlyMiddleware.js';
import { runFlow } from '../Utils/flowRunner.js';
import { sendSmsWithTwilio } from '../Utils/twilioSender.js';

const router = express.Router();

// Internal trigger endpoint for scheduler
router.post('/:id/internal-run', protectInternal, async (req, res) => {
  try {
    const runResult = await runFlow(req.params.id, false);
    return res.json({ success: true, run: runResult });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// All other flow routes require user authentication
router.use(protect);

router.get('/', getFlows);
router.post('/', createFlow);

// Test SMS endpoint for Twilio credential verification in Flow Builder
router.post('/test-sms', async (req, res) => {
  try {
    const { twilioSid, twilioAuthToken, twilioFromNumber, testPhoneNumber, sampleMessage } = req.body;
    if (!twilioSid || !twilioAuthToken || !twilioFromNumber || !testPhoneNumber) {
      return res.status(400).json({ success: false, message: 'Missing required Twilio fields or test recipient' });
    }

    const result = await sendSmsWithTwilio({
      accountSid: twilioSid,
      authToken: twilioAuthToken,
      from: twilioFromNumber,
      to: testPhoneNumber,
      body: sampleMessage || 'Test message from Scheduled SMS Automation Platform',
    });

    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error || 'Failed to send test SMS' });
    }

    return res.json({ success: true, messageSid: result.messageSid });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Manual run trigger from frontend
router.post('/:id/run', async (req, res) => {
  try {
    const runResult = await runFlow(req.params.id, true);
    return res.json({ success: true, run: runResult });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', getFlowById);
router.put('/:id', updateFlow);
router.delete('/:id', deleteFlow);
router.patch('/:id/pause', pauseFlow);
router.patch('/:id/resume', resumeFlow);
router.get('/:id/runs', getFlowRuns);
router.get('/:id/records', getSentRecords);

export default router;
