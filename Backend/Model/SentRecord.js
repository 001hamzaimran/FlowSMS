import mongoose from 'mongoose';

const sentRecordSchema = new mongoose.Schema(
  {
    flowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flow',
      required: true,
      index: true,
    },
    phoneNumberE164: {
      type: String,
      required: true,
    },
    rowHash: {
      type: String,
      default: '',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    twilioMessageSid: {
      type: String,
      default: '',
      index: true,
    },
    status: {
      type: String,
      enum: ['queued', 'delivered', 'failed', 'undelivered'],
      default: 'queued',
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL: Unique compound index on (flowId, phoneNumberE164) prevents duplicate sends
sentRecordSchema.index({ flowId: 1, phoneNumberE164: 1 }, { unique: true });

export default mongoose.model('SentRecord', sentRecordSchema);
