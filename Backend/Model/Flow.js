import mongoose from 'mongoose';

const flowSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    spreadsheetId: {
      type: String,
      required: true,
    },
    sheetName: {
      type: String,
      required: true,
    },
    phoneColumn: {
      type: String,
      required: true,
    },
    countryCodeColumn: {
      type: String,
      default: '',
    },
    mergeFieldColumns: {
      type: [String],
      default: [],
    },
    messageTemplate: {
      type: String,
      required: true,
    },
    scheduleType: {
      type: String,
      enum: ['one_time', 'recurring'],
      default: 'one_time',
    },
    scheduleTime: {
      type: Date,
      default: null,
    },
    cronExpression: {
      type: String,
      default: '',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    twilioSidEncrypted: {
      type: String,
      required: true,
    },
    twilioAuthTokenEncrypted: {
      type: String,
      required: true,
    },
    twilioFromNumber: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed', 'error'],
      default: 'draft',
      index: true,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    nextRunAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Flow', flowSchema);
