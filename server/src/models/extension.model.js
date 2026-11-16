import mongoose from 'mongoose';

const pairingSchema = new mongoose.Schema({
  pairingId: { type: String, required: true, unique: true },
  deviceHash: { type: String, required: true, unique: true },
  extensionId: { type: String, required: true },
  verificationCode: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'denied', 'consumed'], default: 'pending' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });
pairingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const grantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  extensionId: { type: String, required: true },
  scope: { type: String, enum: ['match:read'], default: 'match:read' },
  accessHash: { type: String, required: true, unique: true },
  refreshHash: { type: String, required: true, unique: true },
  revocationHash: { type: String, required: true, unique: true },
  accessExpiresAt: { type: Date, required: true },
  refreshExpiresAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null }
}, { timestamps: true });
grantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ExtensionPairing = mongoose.model('ExtensionPairing', pairingSchema);
export const ExtensionGrant = mongoose.model('ExtensionGrant', grantSchema);
