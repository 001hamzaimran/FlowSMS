import twilio from 'twilio';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const sendSmsWithTwilio = async ({
  accountSid,
  authToken,
  from,
  to,
  body,
  statusCallbackUrl = '',
  maxRetries = 2,
}) => {
  const client = twilio(accountSid, authToken);

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const messageOptions = {
        from,
        to,
        body,
      };

      if (statusCallbackUrl) {
        messageOptions.statusCallback = statusCallbackUrl;
      }

      const message = await client.messages.create(messageOptions);
      return { success: true, messageSid: message.sid, status: message.status };
    } catch (error) {
      attempt++;
      // Don't retry on non-retriable client errors (e.g. invalid phone number, unallocated number, invalid auth)
      const nonRetriableCodes = [21211, 21614, 21408, 20003, 20404];
      if (nonRetriableCodes.includes(error.code) || attempt > maxRetries) {
        return {
          success: false,
          error: error.message || 'Failed to send SMS via Twilio',
          code: error.code,
        };
      }
      // Wait before retrying (exponential backoff: 500ms, 1000ms)
      await delay(500 * attempt);
    }
  }

  return { success: false, error: 'Max retries exceeded' };
};
