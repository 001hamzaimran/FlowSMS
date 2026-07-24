import SentRecord from '../Model/SentRecord.js';

export const handleTwilioStatusWebhook = async (req, res) => {
  try {
    const { MessageSid, MessageStatus } = req.body;

    if (MessageSid && MessageStatus) {
      const normalizedStatus = ['delivered', 'failed', 'undelivered', 'queued'].includes(MessageStatus)
        ? MessageStatus
        : 'queued';

      await SentRecord.findOneAndUpdate(
        { twilioMessageSid: MessageSid },
        { status: normalizedStatus }
      );
    }

    // Twilio expects TwiML XML or 200 OK response
    res.type('text/xml');
    return res.send('<Response></Response>');
  } catch (error) {
    console.error('Error handling Twilio status webhook:', error);
    return res.status(500).send('<Response></Response>');
  }
};
