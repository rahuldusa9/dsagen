import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  problem: {
    title: { type: String, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], required: true },
    description: { type: String }
  },
  code: { type: String, required: true },
  language: { type: String, enum: ['javascript', 'java'], required: true },
  result: { type: String, enum: ['pass', 'fail', 'partial', 'error'], required: true },
  passedCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  executionTime: { type: Number, default: 0 },
  testResults: [{
    passed: Boolean,
    input: String,
    expected: String,
    actual: String,
    executionTime: Number
  }],
  complexity: {
    time: String,
    space: String
  },
  timestamp: { type: Date, default: Date.now }
});

submissionSchema.index({ 'problem.topic': 1, timestamp: -1 });
submissionSchema.index({ timestamp: -1 });

export default mongoose.model('Submission', submissionSchema);
