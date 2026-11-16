import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Chrome, Copy, Download, FileCheck2, Globe, Hand, Info, ListFilter, ScanLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { FloatingPathsBackground } from '../components/ui/floating-paths';
import '../styles/extension-page.css';

function officialStoreUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'chromewebstore.google.com'
      && !url.username && !url.password && !url.port
      && /^\/detail\/(?:[^/]+\/)?[a-p]{32}\/?$/.test(url.pathname) ? url.href : null;
  } catch { return null; }
}
const storeUrl = officialStoreUrl(import.meta.env.VITE_CHROME_WEB_STORE_URL);

function DevelopmentDownload() {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ checking: true, available: false });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 8000);
    setState({ checking: true, available: false });
    async function check() {
      try {
        const response = await fetch('/__former-extension/status', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Package unavailable');
        const result = await response.json();
        const available = result.available === true && typeof result.url === 'string'
          && /^\/[a-zA-Z0-9_/-]+\.zip$/.test(result.url);
        if (active) setState({ ...result, checking: false, available });
      } catch { if (active) setState({ checking: false, available: false }); }
      finally { clearTimeout(timeout); }
    }
    check();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [attempt]);

  return <section className="ext-development" aria-labelledby="development-title">
    <div><span className="ext-kicker">For development & testing</span><h3 id="development-title">Try the development version.</h3>
      <p>This copy is installed by hand in Chrome. It isn’t a Chrome Web Store release.</p></div>
    <div className="ext-download-action">
      <div role="status" aria-live="polite">
        {state.checking ? <p>Checking download availability…</p> : state.available
          ? <p>Version {state.version} · ZIP package{Number.isFinite(state.bytes) ? ` · ${Math.ceil(state.bytes / 1024)} KB` : ''}</p>
          : <p>The development package isn’t available right now. A current package needs to be prepared before you can download it.</p>}
      </div>
      {state.available && !state.checking
        ? <a className="ext-button" href={state.url} download="formER-development.zip"><Download size={17} aria-hidden="true" />Download Extension</a>
        : <button className="ext-button ext-button-secondary" disabled={state.checking} onClick={() => setAttempt((value) => value + 1)}>{state.checking ? 'Checking…' : 'Check availability again'}</button>}
      <a className="ext-text-link" href="#installation">Follow the installation guide <ArrowRight size={15} aria-hidden="true" /></a>
    </div>
  </section>;
}

function PopupPreview() {
  return <figure className="ext-preview">
    <div className="ext-preview-backdrop" aria-hidden="true"><span /><span /><span /></div>
    <div className="ext-popup" aria-hidden="true">
      <div className="ext-popup-header"><FileCheck2 size={28} /><div><strong>formER</strong><small>Ready to detect</small></div><ArrowUpRight size={18} /></div>
      <div className="ext-popup-body"><div className="ext-popup-page"><Globe size={19} /><span>Your current webpage<small>A form you want to check</small></span></div>
        <h2>Start with the fields.</h2><p>Find the form fields on this page. Nothing will be filled in or submitted.</p>
        <span className="ext-preview-button"><ScanLine size={18} />Detect fields</span>
      </div>
      <div className="ext-popup-footer"><strong><i />Account not connected</strong><p>Connect to review suggestions from your saved information.</p><span>Open formER <ArrowUpRight size={14} /></span></div>
    </div>
    <figcaption>Popup preview · field detection, at your request.</figcaption>
  </figure>;
}

function InstallationGuide() {
  const [copyStatus, setCopyStatus] = useState('');
  const copyAddress = async () => {
    try { await navigator.clipboard.writeText('chrome://extensions'); setCopyStatus('Address copied. Paste it into a new Chrome tab.'); }
    catch { setCopyStatus('Select chrome://extensions below and copy it into a new Chrome tab.'); }
  };
  const steps = [
    ['Download the ZIP', 'Use Download Extension above when the development package is available.'],
    ['Extract it to a folder', 'Right-click the downloaded ZIP and choose Extract All (or your computer’s extract option). Keep the extracted folder somewhere you won’t move or delete it.'],
    ['Open Chrome’s extensions page', <><p>Paste this address into Chrome’s address bar:</p><div className="ext-copy-row"><code>chrome://extensions</code><button onClick={copyAddress} aria-label="Copy Chrome extensions address"><Copy size={16} aria-hidden="true" />Copy</button></div><p className="ext-copy-status" role="status">{copyStatus}</p></>],
    ['Enable Developer Mode', 'Turn on Developer Mode in the upper-right corner of the extensions page.'],
    ['Select Load unpacked', 'A folder picker will open.'],
    ['Choose the extracted folder', <>Select the folder containing <code>manifest.json</code>. Choose that folder, not the ZIP file. If you see another folder inside, open it until you find <code>manifest.json</code>.</>],
    ['Pin formER to your toolbar', 'Select the puzzle-piece Extensions icon in Chrome’s toolbar, then select the pin next to formER. Open a webpage with a form, click formER, and choose Detect fields.']
  ];
  return <section className="ext-guide" id="installation" aria-labelledby="installation-title">
    <div className="ext-section-intro"><span className="ext-kicker">One small setup</span><h2 id="installation-title">From download<br />to your toolbar.</h2>
      <p>These steps are for development and testing on desktop Chrome. The eventual public release will install through the Chrome Web Store.</p>
      <div className="ext-callout"><Info size={19} aria-hidden="true" /><p>Extract first. Chrome’s <strong>Load unpacked</strong> option accepts a folder, not a ZIP.</p></div>
    </div>
    <ol className="ext-steps">{steps.map(([title, description], index) => <li key={title}>
      <span className="ext-step-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><div className="ext-step-description">{description}</div></div>
    </li>)}</ol>
  </section>;
}

export function Extension() {
  const { isAuthenticated, loading } = useAuth();
  useLayoutEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  useEffect(() => {
    const previous = document.title;
    document.title = 'Get the Chrome extension — formER';
    return () => { document.title = previous; };
  }, []);
  return <FloatingPathsBackground className="extension-page min-h-screen" position={-1}>
    <a className="ext-skip" href="#extension-content">Skip to content</a>
    <header className="ext-header"><Link to="/" className="ext-brand" aria-label="formER home"><FileCheck2 size={26} />formER</Link>
      <nav aria-label="Extension page navigation"><Link className="ext-home" to="/">Home</Link>{!loading && <Link className="ext-nav-action" to={isAuthenticated ? '/app' : '/login'}>{isAuthenticated ? 'Open dashboard' : 'Log in'}<ArrowUpRight size={16} aria-hidden="true" /></Link>}</nav>
    </header>
    <main id="extension-content">
      <section className="ext-hero">
        <div className="ext-hero-copy"><span className="ext-kicker"><Chrome size={17} aria-hidden="true" />formER for Chrome</span>
          <h1>A closer look.<br /><span>A clearer form.</span></h1>
          <p>Find the fields on your current page, see how they’re grouped, and understand what the form is asking for.</p>
          <div className="ext-hero-actions"><a className="ext-button" href="#get-extension">Get the Extension<ArrowRight size={17} aria-hidden="true" /></a><a className="ext-text-link" href="#capabilities">What it can do<ChevronDown size={16} aria-hidden="true" /></a></div>
          <p className="ext-hero-note">Connect your account for saved-answer suggestions. Automatic filling is not available yet.</p>
        </div><PopupPreview />
      </section>

      <section className="ext-capabilities" id="capabilities" aria-label="Current extension capabilities">
        {[[ScanLine, 'Find the fields', 'Detect supported text boxes, dropdowns, dates, and other common form controls.'], [ListFilter, 'See the details', 'Review field labels, required fields, and available choices in a compact list.'], [Hand, 'Stay in control', 'Detection starts when you ask. The extension doesn’t fill answers or submit forms.']].map(([Icon, title, description]) => <article key={title}><span className="ext-feature-icon"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span><h2>{title}</h2><p>{description}</p></article>)}
      </section>

      <section className="ext-distribution" id="get-extension" aria-labelledby="download-title">
        <div className="ext-store"><div className="ext-store-heading"><Chrome size={30} strokeWidth={1.5} aria-hidden="true" /><span className="ext-kicker">Installation</span></div>
          <h2 id="download-title">Give formER a place<br />in your browser.</h2>
          <p>{storeUrl ? 'Install from the official Chrome Web Store listing. Chrome will guide you through the steps and show the requested permissions.' : 'The Chrome Web Store version isn’t available yet. There’s no public installation link at the moment.'}</p>
          {storeUrl ? <a className="ext-button" href={storeUrl} target="_blank" rel="noopener noreferrer">Add to Chrome<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            : <span className="ext-unavailable"><Info size={15} aria-hidden="true" />Not on the Chrome Web Store yet</span>}
        </div>
        {import.meta.env.DEV ? <DevelopmentDownload /> : <div className="ext-public-note"><Info size={18} aria-hidden="true" /><p>Development ZIP downloads are available only on the local development website. They aren’t distributed from this public page.</p></div>}
      </section>

      <InstallationGuide />

      <section className="ext-privacy" aria-labelledby="privacy-title"><div><span className="ext-feature-icon"><ShieldCheck size={23} strokeWidth={1.6} aria-hidden="true" /></span><span className="ext-kicker">A clear view of permissions</span><h2 id="privacy-title">Only when you<br />choose to check.</h2><p>The current extension uses two Chrome permissions to inspect the page you choose.</p></div>
        <div className="ext-permissions"><article><h3>Access to the current tab</h3><p>After you open formER, Chrome grants temporary access to that tab so the extension can identify the page and its form fields.</p></article>
          <article><h3>Run the field detector</h3><p>When you select Detect fields, formER runs its detector on the current page to read field labels, types, and choices.</p></article>
          <p className="ext-privacy-note">Detection happens in your browser. When you connect and choose Analyze form, field labels, types, choices, and limits go to formER for suggestions from your saved information. Entered answers and unrelated page content aren’t sent. The detector skips sensitive fields it recognizes. Nothing is filled in or submitted.</p>
        </div>
      </section>

      <section className="ext-help" aria-labelledby="help-title"><div className="ext-section-intro"><span className="ext-kicker">A little help</span><h2 id="help-title">If you get stuck.</h2><p>A few answers for your first installation.</p></div>
        <div className="ext-faqs">{[
          ['Chrome won’t accept the ZIP', 'Extract the ZIP first, then use Load unpacked to select the extracted folder containing manifest.json. Chrome cannot load the ZIP itself.'],
          ['I can’t find Developer Mode', 'Open chrome://extensions in desktop Chrome. Developer Mode is at the upper right. If you use a work or school computer, your organization may restrict it; ask your administrator about installation.'],
          ['No fields appear on my page', 'Wait for the form to load, then choose Detect fields or Check again. Browser settings, the Chrome Web Store, some embedded forms, and custom controls cannot be checked.'],
          ['How do I connect my account?', 'Choose Connect account in the extension. Log in on the website, compare the code with the one in the popup, and approve. Reopen the extension to finish connecting. You can disconnect from the popup or Account Settings. Automatic filling is not available yet.'],
          ['How do I update or remove this copy?', 'For an update, extract the new ZIP into the same folder, then select Reload on formER’s card at chrome://extensions. To uninstall, select Remove. Keep the extracted folder in place while the extension is installed.'],
          ['The website link in the popup doesn’t open', 'This development copy opens the local formER website at http://localhost:5173. It works while that website is running on your computer. A deployed website address will be needed for public distribution.']
        ].map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={17} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div>
      </section>
    </main>
    <footer className="ext-footer"><Link className="ext-text-link" to={isAuthenticated ? '/app' : '/'}><ArrowLeft size={15} aria-hidden="true" />{isAuthenticated ? 'Back to dashboard' : 'Back to formER'}</Link><span>A little less repetition. A little more room.</span></footer>
  </FloatingPathsBackground>;
}
