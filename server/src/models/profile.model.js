import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, trim: true, default: null },
    addressLine2: { type: String, trim: true, default: null },
    city: { type: String, trim: true, default: null },
    district: { type: String, trim: true, default: null },
    state: { type: String, trim: true, default: null },
    country: { type: String, trim: true, default: null },
    postalCode: { type: String, trim: true, default: null }
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    qualificationLevel: {
      type: String,
      required: [true, 'Qualification level is required'],
      trim: true
    },
    degreeName: {
      type: String,
      required: [true, 'Degree or examination name is required'],
      trim: true
    },
    institution: { type: String, trim: true, default: null },
    boardOrUniversity: { type: String, trim: true, default: null },
    specialization: { type: String, trim: true, default: null },
    subjects: { type: [String], default: [] },
    startDate: { type: String, trim: true, default: null },
    completionDate: { type: String, trim: true, default: null },
    passingYear: { type: Number, default: null },
    marksObtained: { type: Number, default: null },
    maxMarks: { type: Number, default: null },
    percentage: { type: Number, default: null },
    cgpa: { type: Number, default: null },
    cgpaScale: { type: Number, default: null },
    sgpa: { type: Number, default: null },
    resultStatus: {
      type: String,
      enum: ['passed', 'appearing', 'awaited', 'failed', 'other'],
      default: 'passed'
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const workExperienceSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, trim: true, required: true },
    company: { type: String, trim: true, required: true },
    location: { type: String, trim: true, default: null },
    startDate: { type: String, trim: true, default: null },
    endDate: { type: String, trim: true, default: null },
    isCurrent: { type: Boolean, default: false },
    description: { type: String, trim: true, default: null }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Profile must belong to a user'],
      unique: true,
      index: true
    },
    personal: {
      fullName: { type: String, trim: true, default: null },
      dateOfBirth: { type: String, trim: true, default: null },
      gender: {
        type: String,
        trim: true,
        enum: ['male', 'female', 'other', 'prefer_not_to_say', null],
        default: null
      },
      fatherName: { type: String, trim: true, default: null },
      motherName: { type: String, trim: true, default: null },
      guardianName: { type: String, trim: true, default: null },
      guardianRelation: { type: String, trim: true, default: null }
    },
    contact: {
      primaryPhone: { type: String, trim: true, default: null },
      alternatePhone: { type: String, trim: true, default: null },
      contactEmail: { type: String, trim: true, lowercase: true, default: null }
    },
    addresses: {
      permanent: { type: addressSchema, default: () => ({}) },
      correspondence: { type: addressSchema, default: () => ({}) }
    },
    education: {
      type: [educationSchema],
      default: []
    },
    professional: {
      skills: { type: [String], default: [] },
      workExperience: { type: [workExperienceSchema], default: [] },
      profileLinks: {
        linkedin: { type: String, trim: true, default: null },
        github: { type: String, trim: true, default: null },
        portfolio: { type: String, trim: true, default: null },
        other: { type: String, trim: true, default: null }
      }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret._id;
        delete ret.__v;
        if (Array.isArray(ret.education)) {
          ret.education = ret.education.map((edu) => {
            if (edu._id) {
              edu.id = edu._id.toString();
              delete edu._id;
            }
            delete edu.__v;
            return edu;
          });
        }
        if (Array.isArray(ret.professional?.workExperience)) {
          ret.professional.workExperience = ret.professional.workExperience.map((exp) => {
            if (exp._id) {
              exp.id = exp._id.toString();
              delete exp._id;
            }
            delete exp.__v;
            return exp;
          });
        }
        return ret;
      }
    }
  }
);

export const Profile = mongoose.model('Profile', profileSchema);

