import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false // Exclude from queries by default to prevent accidental exposure
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'pending'],
      default: 'active'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

// Helpful helper to query user with passwordHash included explicitly
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
};

export const User = mongoose.model('User', userSchema);

