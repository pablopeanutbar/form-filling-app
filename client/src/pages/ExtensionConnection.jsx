import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileCheck2, Link2 } from 'lucide-react';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from '../components/common/Button.jsx';
import { Alert } from '../components/common/Alert.jsx';
import { FloatingPathsBackground } from '../components/ui/floating-paths';
import '../styles/extension-page.css';

export function ExtensionConnection() {
  const { pairingId } = useParams();
  const { user } = useAuth();
  const [pair, setPair] = useState(null);
  const [connections, setConnections] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setPair(null); setConfirmed(false);
    async function load() {
      try {
        const requests = [apiClient('/api/v1/extension/connections')];
        if (pairingId && !outcome) requests.push(apiClient(`/api/v1/extension/pairing/${encodeURIComponent(pairingId)}`));
        const [list, pending] = await Promise.all(requests);
        if (active) { setConnections(list.data); setPair(pending?.data || null); }
      } catch (err) { if (active) setError(err.status === 410 ? 'This request expired or was already handled. Start a new connection from the extension.' : 'We couldn’t load your connections. Please try again.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [pairingId, refresh, outcome]);

  async function decide(approved) {
    setBusy(true); setError('');
    try {
      await apiClient(`/api/v1/extension/pairing/${encodeURIComponent(pairingId)}/decision`, { method: 'POST', body: { verificationCode: pair.verificationCode, approved } });
      setOutcome(approved ? 'approved' : 'denied'); setPair(null);
    } catch { setError('We couldn’t complete this request. It may have expired or been cancelled. Please try again.'); }
    finally { setBusy(false); }
  }
  async function revoke(id) {
    setBusy(true); setError('');
    try { await apiClient(`/api/v1/extension/connections/${id}/revoke`, { method: 'POST', body: {} }); setConnections((items) => items.filter((item) => item.id !== id)); }
    catch { setError('The connection could not be revoked. Please try again.'); }
    finally { setBusy(false); }
  }
  return <FloatingPathsBackground className="extension-page min-h-screen" position={-1}><header className="ext-header"><Link to="/" className="ext-brand"><FileCheck2 size={26} />formER</Link><Link to="/app" className="ext-text-link">Dashboard</Link></header>
    <main className="ext-connection-page"><section className="ext-distribution ext-connection-card">
      <span className="ext-feature-icon"><Link2 size={22} /></span><h1>{pairingId ? 'Connect your extension' : 'Your extension connections'}</h1>
      <p>Signed in as <strong>{user.email}</strong>.</p>
      {loading && <p role="status">Loading your connections…</p>}
      {error && <><Alert message={error} /><Button variant="secondary" onClick={() => setRefresh((n) => n + 1)} disabled={busy || loading}>Try again</Button></>}
      {pair && !outcome && <>
        <p>Only continue if you started this request in formER’s extension. Open the extension and check that it shows this same code:</p>
        <p className="ext-pair-code">{pair.verificationCode}</p>
        <p>This lets the extension request suggestions from your saved information when you choose Analyze form. It cannot change your saved profile or fill or submit a webpage.</p>
        <p>You can disconnect below or from the popup. You’ll need to reconnect after 30 days, or sooner if the connection expires.</p>
        <label className="ext-pair-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} />I started this request and the code matches my extension.</label>
        <div className="ext-hero-actions"><Button onClick={() => decide(true)} disabled={!confirmed || busy} isLoading={busy}>Approve connection</Button><Button variant="secondary" disabled={busy} onClick={() => decide(false)}>Cancel request</Button></div>
      </>}
      {outcome && <div role="status"><h2>{outcome === 'approved' ? 'Connection approved.' : 'Request cancelled.'}</h2><p>{outcome === 'approved' ? 'Open the formER extension again to finish connecting. Then return to your form and choose Analyze form.' : 'No connection was granted. You can start again from the extension.'}</p></div>}
      <div className="ext-connections"><h2>Connected extensions</h2><p>Disconnecting stops future requests from that copy of formER.</p>
        {!loading && !connections.length && <p>No active connections to show. An approved request appears after the extension finishes connecting.</p>}
        {connections.map((connection) => <div className="ext-connection-row" key={connection.id}><div><strong>formER for Chrome</strong><small>Connected {new Date(connection.createdAt).toLocaleDateString()}</small><small>Extension ID: {connection.extensionId}</small></div><Button variant="secondary" disabled={busy} onClick={() => revoke(connection.id)}>Disconnect</Button></div>)}
        <Button variant="ghost" onClick={() => setRefresh((n) => n + 1)} disabled={busy || loading}>Refresh connections</Button>
      </div>
    </section></main></FloatingPathsBackground>;
}
