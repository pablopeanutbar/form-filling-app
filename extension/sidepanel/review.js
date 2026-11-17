const $ = (id) => document.getElementById(id);
const fillableTypes = new Set(['text', 'email', 'tel', 'number', 'date', 'url', 'textarea', 'select', 'radio']);
const statuses = [
  ['matched', 'Matched'],
  ['needs_review', 'Needs review'],
  ['unmatched', 'Unmatched'],
  ['unsupported', 'Unsupported']
];

let session;
let filling = false;
let generation = 0;
let expiry;
let resumeTimer;
let restoring = false;
let boundTab;
let windowId;
let account = { state: 'checking' };
let accountBusy = false;
let pollTimer;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function setNotice(message, state = 'idle') {
  $('notice').textContent = message;
  $('notice-panel').hidden = !message;
  $('notice-panel').dataset.state = state;
}

function updateAnalyzeLabel() {
  const connected = account.state === 'connected';
  $('analyze-label').textContent = $('analyze').hasAttribute('aria-busy')
    ? (connected ? 'Analyzing…' : 'Checking…')
    : connected ? (session ? 'Reanalyze' : 'Analyze form') : 'Detect fields';
}

function showTabContext(tab) {
  let domain = 'Current tab';
  try {
    const url = new URL(tab?.url);
    domain = url.protocol === 'file:' ? 'Local file' : url.hostname || domain;
  } catch { /* Chrome may withhold the URL until the user grants tab access. */ }
  $('page').textContent = domain;
  $('page').title = domain;
}

function setFillFeedback(message, showResults = false, state = 'idle') {
  $('fill-status').textContent = message;
  $('fill-feedback').hidden = !message;
  $('fill-feedback').dataset.state = state;
  $('show-fill-results').hidden = !showResults;
}

function clearReview(message) {
  generation++;
  clearTimeout(expiry);
  clearTimeout(resumeTimer);
  restoring = false;
  session = undefined;
  $('review').hidden = true;
  $('analysis-status').textContent = '';
  $('groups').replaceChildren();
  $('filter').replaceChildren();
  $('counts').replaceChildren();
  $('selection').textContent = '0 fields selected';
  $('fill-results').replaceChildren();
  $('fill-results').hidden = true;
  setFillFeedback('');
  $('fill').disabled = true;
  $('clear-selection').disabled = true;
  $('fill-all').disabled = true;
  $('fill-all').textContent = 'Fill all matched';
  setNotice(message);
  $('analyze').disabled = !boundTab || filling || account.state === 'checking';
  $('analyze').removeAttribute('aria-busy');
  updateAnalyzeLabel();
}

function updateSelection() {
  const count = session.entries.filter(({ selected }) => selected).length;
  $('selection').textContent = `${count} ${count === 1 ? 'field' : 'fields'} selected`;
  const matches = eligibleMatches();
  const selectedMatches = matches.filter((entry) => entry.selected).length;
  const disabled = !session.id || filling || account.state !== 'connected';
  $('fill').disabled = !count || disabled;
  $('fill-all').disabled = !matches.length || disabled;
  $('fill-all').textContent = matches.length ? `Fill all matched (${matches.length})` : 'Fill all matched';
  const checkbox = $('select-all');
  if (checkbox) {
    checkbox.checked = matches.length > 0 && selectedMatches === matches.length;
    checkbox.indeterminate = selectedMatches > 0 && selectedMatches < matches.length;
    checkbox.disabled = disabled || !matches.length;
  }
  const clear = $('clear-selection');
  if (clear) clear.disabled = disabled || !count;
}

function explanation(result) {
  if (result.status === 'unsupported') return 'Complete this field on the page.';
  if (result.status === 'unmatched') {
    if (/ambiguous|conflicting/i.test(result.reason || '')) return 'The form does not make clear which saved detail it needs.';
    return 'No compatible saved answer was found.';
  }
  if (result.status === 'matched') return '';
  if (result.value != null) return 'Check that this suggestion answers the question before selecting it.';
  const reason = result.reason || '';
  if (/empty|not set|no (education|educational|explicit saved)/i.test(reason)) return 'The needed information is missing from your saved details.';
  if (/multiple qualification|addresses differ|ambiguous|conflicting/i.test(reason)) return 'More than one answer or interpretation is possible.';
  return 'Check your saved details and the choices or format required by this field.';
}

function renderCard(entry) {
  const { field, result } = entry;
  const label = field.label || 'Field without a label';
  const suggested = result.displayValue ?? result.value;
  const value = entry.edited ?? (suggested == null ? '' : String(suggested));
  const card = element('article', null, 'card');
  card.dataset.state = entry.filled || result.status;
  const disclosure = element('details', null, 'field-disclosure');
  disclosure.open = Boolean(entry.expanded);
  disclosure.addEventListener('toggle', () => { entry.expanded = disclosure.open; });

  const heading = element('summary', null, 'field-summary');
  const copy = element('span', null, 'field-copy');
  const title = element('strong', label, 'field-label');
  const detail = explanation(result);
  const preview = element('span', value || detail, 'field-preview');
  const state = element('span', entry.filled === 'already_correct' ? 'Already correct' : entry.filled === 'filled'
    ? 'Filled' : statuses.find(([key]) => key === result.status)?.[1] || 'Needs review', 'field-state');
  copy.append(title, preview, state);
  heading.append(copy);
  const body = element('div', null, 'field-detail');
  if (suggested != null) {
    body.append(element('span', 'Suggested answer', 'detail-label'), element('p', String(suggested), 'answer'));
  }
  if (result.source?.label) {
    const source = [result.source.label, result.source.record].filter(Boolean).join(' · ');
    body.append(element('p', `From your saved information: ${source}`, 'field-source'));
  }
  if (detail) body.append(element('p', detail, 'explanation'));
  const eligible = fillableTypes.has(field.type) && result.value != null && ['matched', 'needs_review'].includes(result.status);
  if (eligible) {
    const select = element('input');
    select.type = 'checkbox';
    select.checked = entry.selected;
    const approval = result.status === 'needs_review' ? 'Approve this answer' : 'Select suggestion';
    select.setAttribute('aria-label', result.status === 'needs_review'
      ? `Approve suggestion for ${label}` : `Select suggestion for ${label}`);
    const choice = element('label', null, 'row-choice');
    choice.title = approval;
    choice.append(select, element('span', approval, 'sr-only'));
    select.addEventListener('change', () => {
      entry.selected = select.checked;
      card.toggleAttribute('data-selected', entry.selected);
      updateSelection();
    });
    card.toggleAttribute('data-selected', entry.selected);

    const edit = element('label', null, 'answer-edit');
    const input = element('input');
    input.type = 'text';
    input.value = value;
    input.setAttribute('aria-label', `Edit suggestion for ${label}`);
    input.addEventListener('input', () => {
      entry.edited = input.value;
      entry.filled = false;
      card.dataset.state = result.status;
      state.textContent = statuses.find(([key]) => key === result.status)?.[1];
      preview.textContent = input.value || detail;
      select.disabled = !input.value.trim();
      if (select.disabled) entry.selected = select.checked = false;
      card.toggleAttribute('data-selected', entry.selected);
      updateSelection();
    });
    select.disabled = entry.edited != null && !entry.edited.trim();
    edit.append(element('span', 'Edit answer', 'detail-label'), input);

    const overwrite = element('input');
    overwrite.type = 'checkbox';
    overwrite.checked = Boolean(entry.overwrite);
    overwrite.addEventListener('change', () => { entry.overwrite = overwrite.checked; });
    const overwriteLabel = element('label', null, 'choice');
    overwriteLabel.append(overwrite, 'Replace an existing answer in this field');
    body.append(edit, overwriteLabel);
    if (result.status === 'needs_review') {
      const approve = element('button', entry.selected ? 'Remove approval' : 'Approve this answer', 'text-action');
      approve.type = 'button';
      approve.addEventListener('click', () => select.click());
      select.addEventListener('change', () => { approve.textContent = select.checked ? 'Remove approval' : 'Approve this answer'; });
      input.addEventListener('input', () => {
        approve.disabled = select.disabled;
        approve.textContent = select.checked ? 'Remove approval' : 'Approve this answer';
      });
      approve.disabled = select.disabled;
      body.append(approve);
    }
    card.append(choice);
  }
  disclosure.append(heading, body);
  card.prepend(disclosure);
  return card;
}

function renderGroups() {
  $('groups').replaceChildren();
  const filter = $('filter').value;
  for (const [key, label] of statuses) {
    if (filter !== 'all' && filter !== key) continue;
    const entries = session.entries.filter(({ result }) => result.status === key);
    if (!entries.length) continue;
    const group = element('details', null, 'field-group');
    const openGroups = session.openGroups;
    group.open = filter !== 'all' || (openGroups.get(key) ?? (key === 'matched' || key === 'needs_review'));
    group.dataset.state = key;
    if (filter === 'all') group.addEventListener('toggle', () => openGroups.set(key, group.open));
    const summary = element('summary', null, 'group-heading');
    summary.append(element('span', label), element('span', entries.length, 'group-count'));
    group.append(summary);
    if (key === 'matched') group.append(bulkSelection());
    const list = element('div', null, 'cards');
    for (const entry of entries) list.append(renderCard(entry));
    group.append(list);
    $('groups').append(group);
  }
  if (!$('groups').childElementCount) $('groups').append(element('p', 'No fields in this category.', 'notice'));
  updateSelection();
}

function showResults(data, completed = []) {
  const results = new Map(data.results.map((result) => [result.fieldId, result]));
  const outcomes = new Map(completed);
  const entries = data.fields.flatMap((field) => {
    const result = results.get(field.fieldId);
    return result ? [{ field, result, selected: false, filled: outcomes.get(field.fieldId) }] : [];
  });
  session = { id: data.analysisId, entries, openGroups: new Map() };
  $('total').textContent = `${data.fields.length} ${data.fields.length === 1 ? 'field' : 'fields'} detected`;
  const options = [['all', 'All fields', data.fields.length], ...statuses.map(([key, label]) =>
    [key, label, entries.filter(({ result }) => result.status === key).length])];
  $('counts').replaceChildren(...options.slice(1).map(([key, label, count]) => {
    const item = element('div');
    item.dataset.state = key;
    item.append(element('dt', label), element('dd', count));
    return item;
  }));
  $('filter').replaceChildren(...options.map(([key, label, count]) => {
    const option = element('option', `${label} (${count})`);
    option.value = key;
    return option;
  }));
  $('review').hidden = false;
  $('analysis-status').textContent = `Analysis complete. ${$('total').textContent}.`;
  renderGroups();
  updateSelection();
  if (data.expiresAt) {
    expiry = setTimeout(() => clearReview('This review expired. Analyze the form again for fresh suggestions.'), Math.max(0, data.expiresAt - Date.now()));
  }
}

async function analyze() {
  if (!boundTab || filling || restoring || account.state === 'checking') return;
  const tabId = boundTab.id;
  const connected = account.state === 'connected';
  clearReview('');
  setNotice(connected ? 'Looking for saved answers…' : 'Checking this page for fields…', 'loading');
  const request = generation;
  $('analyze').disabled = true;
  $('analyze').setAttribute('aria-busy', 'true');
  updateAnalyzeLabel();
  let timer;
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: connected ? 'ANALYZE_FORM' : 'DETECT_FIELDS', tabId, windowId }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Analysis took too long. Try again.')), 60000);
      })
    ]);
    if (request !== generation) return;
    if (!response?.success) throw new Error(response?.message || 'This page could not be checked. Try again.');
    const data = connected ? response.data : response;
    if (connected) showResults(data);
    const count = data.fields.length;
    setNotice(!count ? 'No supported fields were found. If the form is still loading, try again.'
      : connected ? '' : `${count} ${count === 1 ? 'field' : 'fields'} detected. Connect your account to get suggestions.`);
  } catch (error) {
    if (request === generation) clearReview(error.message || 'Analysis could not be completed.');
  } finally {
    clearTimeout(timer);
    if (request === generation) {
      $('analyze').disabled = filling;
      $('analyze').removeAttribute('aria-busy');
      updateAnalyzeLabel();
    }
  }
}


function fillValue(entry) {
  if (entry.edited === undefined || entry.edited === String(entry.result.displayValue ?? entry.result.value)) {
    return String(entry.result.value);
  }
  if (!['select', 'radio'].includes(entry.field.type)) return entry.edited;
  const choices = (entry.field.options || []).filter((choice) => !choice.disabled
    && (choice.label === entry.edited || choice.value === entry.edited));
  return choices.length === 1 ? choices[0].value : null;
}

function eligibleMatches() {
  return session.entries.filter((entry) => {
    if (entry.result.status !== 'matched' || entry.result.value == null || entry.filled
        || !fillableTypes.has(entry.field.type) || entry.field.optionsTruncated || entry.field.constraints?.multiple) return false;
    const value = fillValue(entry);
    return value != null && !!value.trim() && value.length <= 2000;
  });
}

function bulkSelection() {
  const row = element('div', null, 'bulk-selection');
  const checkbox = element('input');
  checkbox.type = 'checkbox';
  checkbox.id = 'select-all';
  const label = element('label', null, 'choice');
  label.append(checkbox, 'Select all eligible matches');
  checkbox.addEventListener('change', () => {
    for (const entry of eligibleMatches()) entry.selected = checkbox.checked;
    renderGroups();
    $('select-all')?.focus();
  });
  row.append(label);
  return row;
}

function showFillResults(results, selected) {
  const counts = { filled: 0, already_correct: 0, skipped: 0, failed: 0 };
  const labels = new Map(selected.map(({ field }) => [field.fieldId, field.label || 'Unlabeled field']));
  const groups = new Map();
  for (const result of results) {
    const key = Object.hasOwn(counts, result.status) ? result.status : 'skipped';
    counts[key]++;
    if (key === 'filled' || key === 'already_correct') continue;
    const label = { conflict: 'Needs approval', skipped: 'Skipped', failed: 'Failed' }[result.status] || 'Check field';
    const reason = label + ' · ' + (result.reason || 'Check this field on the page.');
    if (!groups.has(reason)) groups.set(reason, []);
    groups.get(reason).push(labels.get(result.fieldId));
  }
  const attention = counts.skipped + counts.failed;
  const report = $('fill-results');
  const grid = element('dl', null, 'result-counts');
  for (const [key, label] of [['filled', 'Newly filled'], ['already_correct', 'Already correct'], ['skipped', 'Skipped'], ['failed', 'Failed']]) {
    const item = element('div');
    item.dataset.state = key;
    item.append(element('dt', label), element('dd', counts[key]));
    grid.append(item);
  }
  report.hidden = false;
  report.replaceChildren(element('h2', 'Fill results'), grid, element('small', 'formER did not submit the form.'));
  if (attention) {
    const details = element('details', null, 'result-details');
    const list = element('ul');
    for (const [reason, fields] of groups) list.append(element('li', `${reason} (${fields.join(', ')})`));
    details.append(element('summary', 'See details'), list);
    report.append(details);
  }
  setFillFeedback(`${counts.filled} filled · ${counts.already_correct} already correct${attention ? ' · ' + attention + ' need attention' : ''}`, true, attention ? 'attention' : 'complete');
}

async function fillSelected(mode = 'selected') {
  if (filling || !boundTab || !session?.id || account.state !== 'connected') return;
  const selected = mode === 'matched' ? eligibleMatches() : session.entries.filter(({ selected }) => selected);
  if (!selected.length) return;
  const proposals = [];
  const skipped = [];
  for (const entry of selected) {
    const value = fillValue(entry);
    if (value == null || !value.trim() || value.length > 2000) {
      skipped.push({ fieldId: entry.field.fieldId, status: 'skipped', reason: 'Enter a valid answer or an exact available choice.' });
    } else {
      proposals.push({ fieldId: entry.field.fieldId, value, overwrite: Boolean(entry.overwrite), approved: true });
    }
  }
  if (!proposals.length) {
    showFillResults(skipped, selected);
    return;
  }
  const request = generation;
  filling = true;
  $('analyze').disabled = true;
  $('groups').inert = true;
  $('filter').disabled = true;
  updateSelection();
  $('fill-results').hidden = true;
  setFillFeedback('Applying selected answers…', false, 'loading');
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'FILL_FORM', mode, tabId: boundTab.id, windowId, analysisId: session.id, proposals
    });
    if (request !== generation) return;
    if (!response?.success) throw new Error(response?.message || 'Check the page before trying again.');
    showFillResults([...response.data, ...skipped], selected);
    const completed = new Map(response.data.filter((result) => ['filled', 'already_correct'].includes(result.status))
      .map(({ fieldId, status }) => [fieldId, status]));
    for (const entry of selected) {
      if (completed.has(entry.field.fieldId)) {
        entry.filled = completed.get(entry.field.fieldId);
        entry.selected = false;
        entry.overwrite = false;
      }
    }
    renderGroups();
  } catch (error) {
    if (request === generation) setFillFeedback(error.message || 'Check the page before trying again.', false, 'attention');
  } finally {
    filling = false;
    $('analyze').disabled = !boundTab || restoring || account.state === 'checking';
    $('groups').inert = false;
    $('filter').disabled = false;
    if (session) updateSelection();
  }
}

$('clear-selection').addEventListener('click', () => {
  if (!session || filling) return;
  for (const entry of session.entries) entry.selected = false;
  renderGroups();
});
$('fill').addEventListener('click', () => fillSelected());
$('fill-all').addEventListener('click', () => fillSelected('matched'));
$('show-fill-results').addEventListener('click', () => {
  $('fill-results').focus({ preventScroll: true });
  $('fill-results').scrollIntoView({ block: 'nearest' });
});

function renderAccount(status) {
  const accountDetails = $('account');
  const accountSummary = accountDetails.querySelector('summary');
  const focusInDetails = accountDetails.contains(document.activeElement);
  const focusOnConnect = document.activeElement === $('connect');
  const previousState = account.state;
  account = status;
  const connected = status.state === 'connected';
  const pending = status.state === 'pending';
  const disconnected = !connected && !pending;
  $('account-title').textContent = connected ? 'Connected' : 'Approval pending';
  $('account-caption').hidden = !connected;
  $('account-description').textContent = connected ? status.account.email
    : pending ? 'Compare this code on the formER website and approve the connection.' : '';
  $('pair-code').hidden = !pending;
  $('pair-code').textContent = pending ? status.verificationCode : '';
  $('connect').hidden = !disconnected;
  $('approval-page').hidden = !pending;
  $('disconnect').hidden = disconnected;
  $('disconnect').textContent = pending ? 'Cancel connection' : 'Disconnect';
  accountDetails.dataset.state = status.state;
  accountDetails.hidden = disconnected;
  accountSummary.removeAttribute('aria-disabled');
  if (status.state !== previousState) accountDetails.open = pending;
  $('account-error').textContent = disconnected ? status.message || '' : '';
  if (disconnected && focusInDetails) queueMicrotask(() => $('connect').focus());
  if (!disconnected && (focusOnConnect || (connected && focusInDetails && previousState === 'pending'))) {
    accountSummary.focus();
  }
  $('analyze').disabled = !boundTab || restoring || filling || $('analyze').hasAttribute('aria-busy');
  updateAnalyzeLabel();
}

async function accountAction(type) {
  if (accountBusy) return;
  clearTimeout(pollTimer);
  accountBusy = true;
  $('connect').disabled = $('approval-page').disabled = $('disconnect').disabled = true;
  $('connect-label').textContent = type === 'CONNECT_ACCOUNT' ? 'Connecting…' : 'Connect account';
  if (type === 'CONNECT_ACCOUNT') $('connect').setAttribute('aria-busy', 'true');
  $('account-error').textContent = '';
  try {
    const response = await chrome.runtime.sendMessage({ type });
    if (!response?.success) throw new Error(response?.message || 'Could not check your account. Try again.');
    renderAccount(response.data);
  } catch (error) {
    if (account.state === 'checking') renderAccount({ state: 'disconnected' });
    $('account-error').textContent = error.message;
  } finally {
    accountBusy = false;
    $('connect').disabled = $('approval-page').disabled = $('disconnect').disabled = false;
    $('connect-label').textContent = 'Connect account';
    $('connect').removeAttribute('aria-busy');
    if (account.state === 'pending') pollTimer = setTimeout(() => accountAction('CONNECTION_STATUS'), 3200);
  }
}

async function resumeReview(tab, request, message) {
  let data;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'RESTORE_REVIEW', tabId: tab.id, windowId });
    if (response?.success) data = response.data;
  } catch { /* A fresh analysis remains available. */ }
  if (request !== generation) return;
  if (data?.operation) {
    setNotice(data.operation === 'FILL_FORM' ? 'Applying selected answers…' : 'Looking for saved answers…', 'loading');
    resumeTimer = setTimeout(() => resumeReview(tab, request, message), 600);
    return;
  }
  restoring = false;
  $('analyze').disabled = filling || account.state === 'checking';
  if (!data?.view || Date.now() >= data.view.expiresAt) {
    setNotice(message);
    return;
  }
  showResults(data.view, data.completed);
  setNotice(data.view.fields.length ? '' : 'No supported fields were found.');
  if (data.fill?.length) showFillResults(data.fill, session.entries);
  else if (data.fillUnconfirmed) setFillFeedback('The last fill could not be confirmed. Check the page before trying again.', false, 'attention');
  updateAnalyzeLabel();
}

async function refreshTab(message) {
  boundTab = undefined;
  showTabContext();
  clearReview(message);
  const request = generation;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (request !== generation || !tab) return;
    boundTab = tab;
    showTabContext(tab);
    restoring = true;
    $('analyze').disabled = true;
    await resumeReview(tab, request, message);
  } catch {
    if (request === generation) clearReview('The current page could not be found.');
  }
}

$('filter').addEventListener('change', renderGroups);
$('analyze').addEventListener('click', analyze);
$('connect').addEventListener('click', () => accountAction('CONNECT_ACCOUNT'));
$('approval-page').addEventListener('click', () => accountAction('CONNECT_ACCOUNT'));
$('disconnect').addEventListener('click', () => accountAction('DISCONNECT_ACCOUNT'));
$('account').querySelector('summary').addEventListener('click', (event) => {
  if (account.state === 'checking') event.preventDefault();
});
$('account').addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || !$('account').open) return;
  $('account').open = false;
  $('account').querySelector('summary').focus();
});
document.addEventListener('pointerdown', (event) => {
  if ($('account').open && !$('account').contains(event.target)) $('account').open = false;
});
chrome.tabs.onActivated.addListener((info) => {
  if (info.windowId === windowId) refreshTab('Check this page to start a new review.');
});
chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if (id === boundTab?.id && (change.status === 'loading' || change.url !== undefined)) {
    clearReview('This page changed. Check the current form again.');
  }
  if (id === boundTab?.id && (change.url !== undefined || tab?.url)) showTabContext({ url: change.url ?? tab.url });
});
chrome.tabs.onRemoved.addListener((id) => {
  if (id === boundTab?.id) refreshTab('This tab closed. Check the current page to start a new review.');
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'FORMER_CLEAR_REVIEW' && sender.id === chrome.runtime.id && !sender.tab
      && (!sender.url || sender.url === chrome.runtime.getURL('background/service-worker.js'))
      && account.state === 'connected') {
    renderAccount({ state: 'disconnected' });
    if (boundTab) clearReview('Connect your account to get suggestions again.');
  }
});

chrome.windows.getCurrent().then((window) => {
  windowId = window.id;
  return refreshTab('Check this page to review its form fields.');
}).catch(() => clearReview('The current browser window could not be found.'));
accountAction('CONNECTION_STATUS');
