import express from 'express';
import { handleTwilioStatusWebhook } from '../Controllers/webhookController.js';

const router = express.Router();

// Twilio status webhook endpoint
router.post('/twilio/status', handleTwilioStatusWebhook);

export default router;
