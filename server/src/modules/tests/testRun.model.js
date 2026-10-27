import mongoose from 'mongoose';
import { BadRequestError } from '../../shared/errors/AppError.js';

export const TEST_RUN_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

export const TERMINAL_STATUSES = [
  TEST_RUN_STATUS.COMPLETED,
  TEST_RUN_STATUS.FAILED,
  TEST_RUN_STATUS.CANCELLED,
];

/**
 * Valid state machine transitions.
 * Terminal states (completed, failed, cancelled) cannot transition to any new state.
 */
const VALID_TRANSITIONS = {
  [TEST_RUN_STATUS.QUEUED]: [TEST_RUN_STATUS.RUNNING, TEST_RUN_STATUS.CANCELLED, TEST_RUN_STATUS.FAILED],
  [TEST_RUN_STATUS.RUNNING]: [TEST_RUN_STATUS.COMPLETED, TEST_RUN_STATUS.FAILED, TEST_RUN_STATUS.CANCELLED],
  [TEST_RUN_STATUS.COMPLETED]: [],
  [TEST_RUN_STATUS.FAILED]: [],
  [TEST_RUN_STATUS.CANCELLED]: [],
};

const testRunSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Test run must belong to an authenticated user'],
      index: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Target',
      required: [true, 'Test run must be linked to a valid target API'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Test run name is required'],
      trim: true,
      maxlength: [100, 'Test name cannot exceed 100 characters'],
    },
    configuration: {
      targetSnapshot: {
        name: { type: String, required: true },
        baseUrl: { type: String, required: true },
      },
      method: {
        type: String,
        required: true,
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      endpoint: {
        type: String,
        required: true,
        trim: true,
      },
      headers: {
        type: Map,
        of: String,
        default: {},
      },
      body: {
        type: String,
        default: null,
      },
      vus: {
        type: Number,
        required: true,
        min: 1,
        max: 50,
      },
      duration: {
        type: Number,
        required: true,
        min: 5,
        max: 300,
      },
      rampUpDuration: {
        type: Number,
        default: 0,
      },
      thresholds: {
        httpReqDurationP95: { type: Number, default: null },
        httpReqFailedRate: { type: Number, default: null },
      },
    },
    status: {
      type: String,
      enum: Object.values(TEST_RUN_STATUS),
      default: TEST_RUN_STATUS.QUEUED,
      index: true,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    actualDurationMs: {
      type: Number,
      default: null,
    },
    progress: {
      percent: { type: Number, default: 0, min: 0, max: 100 },
      stage: { type: String, default: 'Pending execution' },
      message: { type: String, default: 'Test queued in scheduler' },
    },
    // Metrics summary is initially null and populated upon test completion
    metrics: {
      totalRequests: { type: Number, default: null },
      successfulRequests: { type: Number, default: null },
      failedRequests: { type: Number, default: null },
      requestsPerSecond: { type: Number, default: null },
      avgLatency: { type: Number, default: null },
      medianLatency: { type: Number, default: null },
      p90Latency: { type: Number, default: null },
      p95Latency: { type: Number, default: null },
      maxLatency: { type: Number, default: null },
      failureRate: { type: Number, default: null },
      networkErrors: { type: Number, default: null },
      statusCodeCounts: {
        type: Map,
        of: Number,
        default: undefined,
      },
    },
    error: {
      category: {
        type: String,
        enum: ['NONE', 'NETWORK_ERROR', 'TIMEOUT', 'CANCELLED_BY_USER', 'TARGET_UNREACHABLE', 'EXECUTION_ERROR', 'INTERNAL_ERROR'],
        default: 'NONE',
      },
      message: { type: String, default: null },
    },
    isSimulated: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for querying user tests sorted by creation time
testRunSchema.index({ owner: 1, createdAt: -1 });
testRunSchema.index({ status: 1, owner: 1 });

/**
 * Checks whether a transition from current status to target status is valid.
 */
testRunSchema.methods.canTransitionTo = function (targetStatus) {
  const allowed = VALID_TRANSITIONS[this.status] || [];
  return allowed.includes(targetStatus);
};

/**
 * Transitions test run to a new lifecycle status while enforcing invariant rules.
 */
testRunSchema.methods.transitionTo = function (targetStatus, metadata = {}) {
  if (this.status === targetStatus) {
    return this;
  }

  if (!this.canTransitionTo(targetStatus)) {
    throw new BadRequestError(
      `Invalid lifecycle status transition: Cannot transition TestRun from '${this.status}' to '${targetStatus}'.`
    );
  }

  this.status = targetStatus;

  const now = new Date();

  // If transitioning to RUNNING, record start time
  if (targetStatus === TEST_RUN_STATUS.RUNNING && !this.startTime) {
    this.startTime = now;
    this.progress = {
      percent: metadata.percent ?? 10,
      stage: metadata.stage ?? 'Workload Executing',
      message: metadata.message ?? 'Generating synthetic traffic',
    };
  }

  // If transitioning to a terminal status, record end time and calculate elapsed duration
  if (TERMINAL_STATUSES.includes(targetStatus)) {
    this.endTime = now;
    if (this.startTime) {
      this.actualDurationMs = this.endTime.getTime() - new Date(this.startTime).getTime();
    }
  }

  if (targetStatus === TEST_RUN_STATUS.COMPLETED) {
    this.progress = {
      percent: 100,
      stage: 'Completed',
      message: 'Test run finished successfully',
    };
    if (metadata.metrics) {
      this.metrics = metadata.metrics;
    }
  }

  if (targetStatus === TEST_RUN_STATUS.CANCELLED) {
    this.error = {
      category: 'CANCELLED_BY_USER',
      message: metadata.reason || 'Test run cancelled by user request',
    };
    this.progress = {
      percent: this.progress?.percent || 0,
      stage: 'Cancelled',
      message: metadata.reason || 'Test run was cancelled',
    };
  }

  if (targetStatus === TEST_RUN_STATUS.FAILED) {
    this.error = {
      category: metadata.category || 'EXECUTION_ERROR',
      message: metadata.message || 'Test execution failed',
    };
    this.progress = {
      percent: this.progress?.percent || 0,
      stage: 'Failed',
      message: metadata.message || 'Execution error encountered',
    };
  }

  if (metadata.isSimulated !== undefined) {
    this.isSimulated = metadata.isSimulated;
  }

  return this;
};

/**
 * Mongoose pre-save safety hook to catch any bypass of transitionTo
 */
testRunSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('status')) {
    const originalStatus = this.$locals?.originalStatus;
    if (originalStatus && originalStatus !== this.status) {
      const allowed = VALID_TRANSITIONS[originalStatus] || [];
      if (!allowed.includes(this.status)) {
        return next(
          new BadRequestError(
            `Illegal status transition prevented: Cannot update TestRun from '${originalStatus}' to '${this.status}'.`
          )
        );
      }
    }
  }
  next();
});

testRunSchema.post('save', function () {
  if (!this.$locals) this.$locals = {};
  this.$locals.originalStatus = this.status;
});

testRunSchema.post('init', function () {
  if (!this.$locals) this.$locals = {};
  this.$locals.originalStatus = this.status;
});

const TestRun = mongoose.model('TestRun', testRunSchema);

export default TestRun;
