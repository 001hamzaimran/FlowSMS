import mongoose from 'mongoose';

const flowRunSchema = new mongoose.Schema(
  {
    flowId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Flow',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
      default: null,
    },
    rowsProcessed: {
      type: Number,
      default: 0,
    },
    rowsSent: {
      type: Number,
      default: 0,
    },
    rowsSkipped: {
      type: Number,
      default: 0,
    },
    rowsInvalid: {
      type: Number,
      default: 0,
    },
    rowsFailed: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    errorSummary: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('FlowRun', flowRunSchema);
