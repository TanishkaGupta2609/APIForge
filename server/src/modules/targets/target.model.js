import mongoose from 'mongoose';

const headerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Header key is required'],
      trim: true,
    },
    value: {
      type: String,
      required: [true, 'Header value is required'],
    },
    isSecret: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const targetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target must have an owner'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Target name is required'],
      trim: true,
      maxlength: [100, 'Target name cannot exceed 100 characters'],
    },
    baseUrl: {
      type: String,
      required: [true, 'Target base URL is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    defaultHeaders: {
      type: [headerSchema],
      default: [],
    },
    lastHealthCheck: {
      status: {
        type: String,
        enum: ['unknown', 'online', 'degraded', 'offline'],
        default: 'unknown',
      },
      statusCode: { type: Number, default: null },
      latencyMs: { type: Number, default: null },
      checkedAt: { type: Date, default: null },
      message: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for user targets listing
targetSchema.index({ owner: 1, createdAt: -1 });

export const Target = mongoose.model('Target', targetSchema);
export default Target;
