import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const extensionRoot = path.join(repository, 'extension');
const artifactRoot = path.join(repository, 'artifacts', 'extension');
const statusPath = '/__former-extension/status';
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const loopback = (address) => address === '::1' || /^127\./.test(address || '') || /^::ffff:127\./.test(address || '');

async function verifiedPackage() {
  try {
    const [zip, receiptText, listText, manifestText] = await Promise.all([
      readFile(path.join(artifactRoot, 'formER-development.zip')),
      readFile(path.join(artifactRoot, 'formER-development.json'), 'utf8'),
      readFile(path.join(extensionRoot, 'package-files.json'), 'utf8'),
      readFile(path.join(extensionRoot, 'manifest.json'), 'utf8')
    ]);
    const receipt = JSON.parse(receiptText);
    const files = JSON.parse(listText);
    const manifest = JSON.parse(manifestText);
    if (manifest.manifest_version !== 3 || receipt.version !== manifest.version || digest(zip) !== receipt.sha256
      || !Array.isArray(receipt.files) || receipt.files.length !== files.length) return null;
    for (const file of files) {
      if (typeof file !== 'string' || file.includes('..') || !/^[a-zA-Z0-9_./-]+$/.test(file) || file.startsWith('/')) return null;
      const entries = receipt.files.filter((entry) => entry.path === file);
      if (entries.length !== 1 || digest(await readFile(path.join(extensionRoot, file))) !== entries[0].sha256) return null;
    }
    return { zip, version: manifest.version };
  } catch { return null; }
}

export function extensionDownload({ downloadUrl = '/__former-extension/formER-development.zip' } = {}) {
  // A configurable same-origin path, never an unchecked external ZIP link.
  if (!/^\/[a-zA-Z0-9_/-]+\.zip$/.test(downloadUrl) || downloadUrl.startsWith('/api/')) {
    throw new Error('FORMER_EXTENSION_ZIP_URL must be a local absolute .zip path outside /api/.');
  }
  return {
    name: 'former-local-extension-download',
    apply: 'serve',
    // configureServer is intentionally absent from production build and preview.
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== statusPath && pathname !== downloadUrl) return next();
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        if (!loopback(req.socket.remoteAddress)) { res.statusCode = 403; return res.end('Local development only.'); }
        if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; res.setHeader('Allow', 'GET, HEAD'); return res.end(); }
        const artifact = await verifiedPackage();
        if (pathname === statusPath) {
          res.setHeader('Content-Type', 'application/json');
          return res.end(req.method === 'HEAD' ? undefined : JSON.stringify(artifact
            ? { available: true, url: downloadUrl, version: artifact.version, bytes: artifact.zip.length }
            : { available: false }));
        }
        if (!artifact) { res.statusCode = 404; return res.end('Development package unavailable. Rebuild it explicitly.'); }
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="formER-development.zip"');
        res.setHeader('Content-Length', artifact.zip.length);
        res.end(req.method === 'HEAD' ? undefined : artifact.zip);
      });
    }
  };
}
