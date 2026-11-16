import { randomBytes, createHash } from 'node:crypto';
import { ExtensionPairing, ExtensionGrant } from '../models/extension.model.js';
import { getUserById } from './auth.service.js';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('base64url');
const fail = (statusCode, code, message) => { throw Object.assign(new Error(message), { statusCode, code }); };
const MINUTE = 60000;
const DAY = 24 * 60 * MINUTE;

// Injectable persistence/clock permits isolated tests without touching real profiles or accounts.
export function createExtensionService({ Pairing = ExtensionPairing, Grant = ExtensionGrant, getUser = getUserById, now = () => Date.now() } = {}) {
  const activeUser = async (id) => {
    const user = await getUser(String(id));
    if (!user || user.status !== 'active') fail(401, 'CONNECTION_EXPIRED', 'Please connect your account again.');
    return { id: user.id, email: user.email };
  };
  const credentials = (end) => {
    const accessToken = secret();
    const refreshToken = secret();
    const accessExpiresAt = new Date(Math.min(now() + 5 * MINUTE, end));
    const refreshExpiresAt = new Date(Math.min(now() + 7 * DAY, end));
    return {
      stored: { accessHash: hash(accessToken), refreshHash: hash(refreshToken), accessExpiresAt, refreshExpiresAt },
      public: { accessToken, refreshToken, accessExpiresAt: accessExpiresAt.toISOString(), refreshExpiresAt: refreshExpiresAt.toISOString() }
    };
  };
  const live = () => ({ expiresAt: { $gt: new Date(now()) } });
  return {
    async start(extensionId) {
      const deviceCode = secret();
      const pairingId = randomBytes(18).toString('hex');
      const verificationCode = randomBytes(4).toString('hex').toUpperCase();
      const expiresAt = new Date(now() + 5 * MINUTE);
      await Pairing.create({ pairingId, deviceHash: hash(deviceCode), extensionId, verificationCode, expiresAt, status: 'pending' });
      return { pairingId, deviceCode, verificationCode, expiresAt: expiresAt.toISOString(), interval: 3 };
    },
    async inspect(pairingId) {
      const pair = await Pairing.findOne({ pairingId, ...live(), status: 'pending' });
      if (!pair) fail(410, 'PAIRING_EXPIRED', 'This connection request has expired or already been handled.');
      return { pairingId, verificationCode: pair.verificationCode, extensionId: pair.extensionId, expiresAt: pair.expiresAt, scope: 'match:read' };
    },
    async decide(pairingId, verificationCode, approved, userId) {
      await activeUser(userId);
      const pair = await Pairing.findOneAndUpdate({ pairingId, verificationCode, status: 'pending', ...live() },
        { $set: { status: approved ? 'approved' : 'denied', userId } }, { new: true });
      if (!pair) fail(410, 'PAIRING_EXPIRED', 'This connection request has expired or already been handled.');
      return { approved };
    },
    async cancel(extensionId, deviceCode) {
      await Pairing.findOneAndUpdate({ extensionId, deviceHash: hash(deviceCode), status: { $in: ['pending', 'approved'] } }, { $set: { status: 'denied' } });
      return { disconnected: true };
    },
    async exchange(extensionId, deviceCode) {
      const query = { extensionId, deviceHash: hash(deviceCode), ...live() };
      const pending = await Pairing.findOne(query);
      if (!pending || ['denied', 'consumed'].includes(pending.status)) fail(410, 'PAIRING_EXPIRED', 'The connection was cancelled, expired, or already used.');
      if (pending.status === 'pending') return { pending: true };
      // Compare-and-set makes concurrent exchanges single use, independent of TTL cleanup.
      const pair = await Pairing.findOneAndUpdate({ ...query, status: 'approved' }, { $set: { status: 'consumed' } }, { new: true });
      if (!pair) fail(410, 'PAIRING_EXPIRED', 'This connection request was already used.');
      const account = await activeUser(pair.userId);
      const expiresAt = new Date(now() + 30 * DAY);
      const token = credentials(expiresAt.getTime());
      // A revoke-only secret survives refresh rotation and lost renewal responses.
      const revocationToken = secret();
      await Grant.create({ userId: pair.userId, extensionId, scope: 'match:read', ...token.stored, revocationHash: hash(revocationToken), expiresAt, revokedAt: null });
      return { ...token.public, revocationToken, account, scope: 'match:read' };
    },
    async refresh(extensionId, refreshToken) {
      const query = { extensionId, refreshHash: hash(refreshToken), revokedAt: null, refreshExpiresAt: { $gt: new Date(now()) }, ...live() };
      const previous = await Grant.findOne(query);
      if (!previous) fail(401, 'CONNECTION_EXPIRED', 'Please connect your account again.');
      const account = await activeUser(previous.userId);
      const token = credentials(new Date(previous.expiresAt).getTime());
      const rotated = await Grant.findOneAndUpdate(query, { $set: token.stored }, { new: true });
      if (!rotated) fail(401, 'CONNECTION_EXPIRED', 'Please connect your account again.');
      return { ...token.public, account, scope: 'match:read' };
    },
    async authenticate(extensionId, accessToken) {
      const grant = await Grant.findOne({ extensionId, accessHash: hash(accessToken), scope: 'match:read', revokedAt: null, accessExpiresAt: { $gt: new Date(now()) }, ...live() });
      if (!grant) fail(401, 'CONNECTION_EXPIRED', 'Please connect your account again.');
      return { account: await activeUser(grant.userId), grantId: String(grant._id) };
    },
    async revoke(extensionId, revocationToken) {
      await Grant.findOneAndUpdate({ extensionId, revocationHash: hash(revocationToken) }, { $set: { revokedAt: new Date(now()) } });
      return { disconnected: true };
    },
    async list(userId) {
      const grants = await Grant.find({ userId, revokedAt: null, ...live() }).select('_id extensionId createdAt expiresAt').lean();
      return grants.map((g) => ({ id: String(g._id), extensionId: g.extensionId, createdAt: g.createdAt, expiresAt: g.expiresAt }));
    },
    async revokeOwned(userId, id) {
      const grant = await Grant.findOneAndUpdate({ _id: id, userId }, { $set: { revokedAt: new Date(now()) } });
      if (!grant) fail(404, 'CONNECTION_NOT_FOUND', 'Connection not found.');
      return { disconnected: true };
    }
  };
}
export const extensionService = createExtensionService();
