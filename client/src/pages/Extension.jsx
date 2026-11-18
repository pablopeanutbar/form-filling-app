import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ArrowUpRight, ChevronDown, Chrome, Copy, Download, FileCheck2, Globe, Hand, Info, ListFilter, ScanLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { FloatingPathsBackground } from '../components/ui/floating-paths';
import { AntiMetalButton } from '../components/ui/anti-metal-button.tsx';
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

function ExtensionDownload() {
  return (
    <section className="ext-development" aria-labelledby="development-title">
      <div>
        <span className="ext-kicker">Ready to install</span>
        <h3 id="development-title">Get the formER extension.</h3>
        <p>This package installs directly in desktop Google Chrome on Windows, macOS, or Linux via Developer mode.</p>
      </div>
      <div className="ext-download-action">
        <div role="status" aria-live="polite">
          <p>Version 0.2.0 · Production ZIP package</p>
        </div>
        <AntiMetalButton
          href="/downloads/former-extension.zip"
          download="former-extension.zip"
          label="Download extension"
          accentFrom="#0071E3"
          accentTo="#005bb5"
          dotColor="#ffffff"
        />
        <a className="ext-text-link" href="#installation">Follow the installation guide <ArrowRight size={15} aria-hidden="true" /></a>
      </div>
    </section>
  );
}

function SidePanelPreview() {
  return <figure className="ext-preview">
    <div className="ext-browser-showcase" aria-hidden="true">
      <div className="ext-browser-toolbar">
        <span className="ext-browser-dots"><i /><i /><i /></span>
        <span className="ext-browser-address"><Globe size={13} />Current webpage</span>
      </div>
      <div className="ext-browser-content">
        <div className="ext-browser-page"></div>
        <div className="ext-browser-panel">
          <div className="ext-browser-brand"><FileCheck2 size={19} /><strong>formER</strong></div>
          <strong className="ext-browser-title">Review form</strong>
          <p>Analyze a form to start reviewing fields.</p>
        </div>
      </div>
    </div>
    <figcaption>formER side panel preview</figcaption>
  </figure>;
}

function InstallationGuide() {
  const [copyStatus, setCopyStatus] = useState('');
  const copyAddress = async () => {
    try { await navigator.clipboard.writeText('chrome://extensions'); setCopyStatus('Address copied. Paste it into a new Chrome tab.'); }
    catch { setCopyStatus('Select chrome://extensions below and copy it into a new Chrome tab.'); }
  };
  const steps = [
    ['Download the ZIP', 'Download former-extension.zip using the Download extension button above.'],
    ['Extract the ZIP', 'Right-click the downloaded ZIP and choose Extract All (or your computer’s archive utility). Keep the extracted folder somewhere permanent.'],
    ['Open chrome://extensions', <><p>Paste this address into desktop Chrome’s address bar:</p><div className="ext-copy-row"><code>chrome://extensions</code><button onClick={copyAddress} aria-label="Copy Chrome extensions address"><Copy size={16} aria-hidden="true" />Copy</button></div><p className="ext-copy-status" role="status">{copyStatus}</p></>],
    ['Enable Developer mode', 'Turn on Developer mode in the upper-right corner of the extensions page.'],
    ['Click Load unpacked', 'Click the Load unpacked button in the upper-left toolbar of the extensions page.'],
    ['Select the extracted folder', <>Select the extracted extension folder containing <code>manifest.json</code>. Choose that folder, not the original ZIP file.</>],
    ['Pin formER to your toolbar', 'Select the puzzle-piece Extensions icon in Chrome’s toolbar, then select the pin next to formER. Open a webpage with a form, click formER, and choose Detect fields.']
  ];
  return <section className="ext-guide" id="installation" aria-labelledby="installation-title">
    <div className="ext-section-intro"><span className="ext-kicker">One small setup</span><h2 id="installation-title">From download<br />to your toolbar.</h2>
      <p>These steps are for desktop Google Chrome (Windows, macOS, or Linux). Requires desktop Chrome.</p>
      <div className="ext-callout"><Info size={19} aria-hidden="true" /><p>Extract first. Chrome’s <strong>Load unpacked</strong> option accepts an unzipped folder, not a ZIP archive.</p></div>
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
        </div><SidePanelPreview />
      </section>

      <section className="ext-capabilities" id="capabilities" aria-label="Current extension capabilities">
        {[[ScanLine, 'Find the fields', 'Detect supported text boxes, dropdowns, dates, and other common form controls.'], [ListFilter, 'See the details', 'Review field labels, required fields, and available choices in a compact list.'], [Hand, 'Stay in control', 'Detection starts when you ask. The extension doesn’t fill answers or submit forms.']].map(([Icon, title, description]) => <article key={title}><span className="ext-feature-icon"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /></span><h2>{title}</h2><p>{description}</p></article>)}
      </section>

      <section className="ext-distribution" id="get-extension" aria-labelledby="download-title">
        <div className="ext-store"><div className="ext-store-heading"><Chrome size={30} strokeWidth={1.5} aria-hidden="true" /><span className="ext-kicker">Installation</span></div>
          <h2 id="download-title">Give formER a place<br />in your browser.</h2>
          <p>{storeUrl ? 'Install from the official Chrome Web Store listing. Chrome will guide you through the steps and show the requested permissions.' : 'The Chrome Web Store version is currently pending review. You can install the verified extension package directly below in desktop Chrome.'}</p>
          {storeUrl ? <a className="ext-button" href={storeUrl} target="_blank" rel="noopener noreferrer">Add to Chrome<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
            : <span className="ext-unavailable"><Info size={15} aria-hidden="true" />Chrome Web Store listing pending review</span>}
        </div>
        <ExtensionDownload />
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
