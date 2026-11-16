import { API_URL, WEBSITE_URL } from '../config.js';

let storageReady;
let queue = Promise.resolve();
const secureStorage = () => storageReady ||= chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const read = async () => { await secureStorage(); return chrome.storage.local.get(['authorization', 'pairing']); };
const write = async (data) => { await secureStorage(); await chrome.storage.local.set(data); };
const remove = async (key) => { await secureStorage(); await chrome.storage.local.remove(key); };
const expired = (date) => !date || new Date(date).getTime() <= Date.now();
const failure = (code, message) => Object.assign(new Error(message), { code });

export function trustedPopup(sender) {
  return sender.id === chrome.runtime.id && !sender.tab && sender.url === chrome.runtime.getURL('popup/popup.html');
}

async function api(path, { body, token, method = 'POST' } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API_URL}/api/v1/extension${path}`, {
      method, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Extension-Id': chrome.runtime.id, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      const messages = { 401: 'Your connection has expired. Connect your account again.', 403: 'This extension is not enabled on the server. Check the local connection setup.', 410: 'This connection request was cancelled or expired.', 429: 'Please wait a moment before trying again.' };
      throw failure(data.error?.code || 'REQUEST_FAILED', messages[response.status] || 'The request could not be completed. Please try again.');
    }
    return data.data;
  } catch (error) {
    if (error.code) throw error;
    throw failure('NETWORK_ERROR', 'We couldn’t reach formER. Check that the website and server are running, then try again.');
  } finally { clearTimeout(timer); }
}

async function authorization() {
  let { authorization: auth } = await read();
  if (!auth || expired(auth.refreshExpiresAt)) {
    await remove('authorization');
    throw failure('CONNECTION_EXPIRED', 'Connect your account to analyze this form.');
  }
  if (new Date(auth.accessExpiresAt).getTime() <= Date.now() + 30000) {
    try {
      auth = { ...auth, ...await api('/refresh', { body: { refreshToken: auth.refreshToken } }) };
      await write({ authorization: auth });
    } catch (error) {
      if (error.code === 'CONNECTION_EXPIRED') await remove('authorization');
      throw error;
    }
  }
  return auth;
}

export async function connectionStatus() {
  const saved = await read();
  if (saved.pairing) {
    const pair = saved.pairing;
    if (expired(pair.expiresAt)) { await remove('pairing'); return { state: 'disconnected', message: 'The connection request expired. Please start again.' }; }
    if (!pair.lastPoll || Date.now() - pair.lastPoll >= 3000) {
      await write({ pairing: { ...pair, lastPoll: Date.now() } });
      try {
        const result = await api('/exchange', { body: { deviceCode: pair.deviceCode } });
        if (!result.pending) {
          await write({ authorization: result });
          await remove('pairing');
          return { state: 'connected', account: result.account };
        }
      } catch (error) {
        if (error.code === 'PAIRING_EXPIRED') { await remove('pairing'); return { state: 'disconnected', message: error.message }; }
        throw error;
      }
    }
    // The polling secret is never included in popup responses.
    return { state: 'pending', verificationCode: pair.verificationCode, expiresAt: pair.expiresAt };
  }
  if (!saved.authorization) return { state: 'disconnected' };
  try {
    const auth = await authorization();
    const { account } = await api('/me', { token: auth.accessToken, method: 'GET' });
    return { state: 'connected', account };
  } catch (error) {
    if (error.code === 'CONNECTION_EXPIRED') { await remove('authorization'); return { state: 'disconnected', message: error.message }; }
    throw error;
  }
}

async function connect() {
  const saved = await read();
  if (saved.authorization) return connectionStatus();
  if (saved.pairing && !expired(saved.pairing.expiresAt)) {
    await chrome.tabs.create({ url: `${WEBSITE_URL}/extension/connect/${encodeURIComponent(saved.pairing.pairingId)}` });
    return connectionStatus();
  }
  const pair = await api('/pairing', { body: {} });
  await write({ pairing: pair });
  try {
    // Only the public request ID is placed in the URL, never a credential.
    await chrome.tabs.create({ url: `${WEBSITE_URL}/extension/connect/${encodeURIComponent(pair.pairingId)}` });
  } catch {
    await api('/cancel', { body: { deviceCode: pair.deviceCode } });
    await remove('pairing');
    throw failure('OPEN_FAILED', 'The approval page couldn’t be opened. Please try connecting again.');
  }
  return { state: 'pending', verificationCode: pair.verificationCode, expiresAt: pair.expiresAt };
}

async function disconnect() {
  const saved = await read();
  // Keep credentials on network failure so a retry can actually revoke them.
  if (saved.authorization) await api('/disconnect', { body: { revocationToken: saved.authorization.revocationToken } });
  if (saved.pairing) await api('/cancel', { body: { deviceCode: saved.pairing.deviceCode } });
  await remove(['authorization', 'pairing']);
  return { state: 'disconnected' };
}

export async function analyzeFields(fields) {
  const auth = await authorization();
  // Explicit metadata allowlist: no URL, page title, entered values, or whole DOM.
  const permitted = ['fieldId', 'label', 'name', 'type', 'id', 'placeholder', 'section', 'options', 'optionsTruncated', 'required', 'constraints'];
  const metadata = fields.map((field) => Object.fromEntries(permitted.filter((key) => field[key] !== undefined).map((key) => [key, field[key]])));
  try { return await api('/match', { token: auth.accessToken, body: { fields: metadata } }); }
  catch (error) { if (error.code === 'CONNECTION_EXPIRED') await remove('authorization'); throw error; }
}

export function withConnectionLock(action) {
  const next = queue.then(action);
  queue = next.catch(() => {});
  return next;
}
export const connectionActions = { CONNECT_ACCOUNT: connect, CONNECTION_STATUS: connectionStatus, DISCONNECT_ACCOUNT: disconnect };
