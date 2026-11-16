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

function clearReview(message) {
  generation++;
  clearTimeout(expiry);
  session = undefined;
  $('review').hidden = true;
  $('groups').replaceChildren();
  $('filter').replaceChildren();
  $('counts').replaceChildren();
  $('selection').textContent = '0 fields selected';
  $('fill-results').replaceChildren();
  $('fill').disabled = true;
  $('clear-selection').disabled = true;
  $('fill-all').disabled = true;
  $('fill-all').textContent = 'Fill all matched';
  $('notice').textContent = message;
  $('analyze').disabled = !boundTab;
  $('analyze').removeAttribute('aria-busy');
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
  const card = element('article', null, 'card');
  card.append(element('h3', label));
  if (entry.filled) card.append(element('p', entry.filled === 'already_correct' ? 'Already correct' : 'Filled', 'filled-label'));
  if (fillableTypes.has(field.type) && result.value != null && ['matched', 'needs_review'].includes(result.status)) {
    const answer = element('p', entry.edited ?? String(result.displayValue ?? result.value), 'answer');
    const select = element('input');
    select.type = 'checkbox';
    select.checked = entry.selected;
    select.setAttribute('aria-label', `Select suggestion for ${label}`);
    const choice = element('label', null, 'choice');
    choice.append(select, result.status === 'needs_review' ? 'Approve this answer' : 'Select suggestion');
    select.addEventListener('change', () => {
      entry.selected = select.checked;
      updateSelection();
    });

    const editor = element('details', null, 'answer-edit');
    const input = element('input');
    input.value = entry.edited ?? String(result.displayValue ?? result.value);
    input.setAttribute('aria-label', `Edit suggestion for ${label}`);
    input.addEventListener('input', () => {
      entry.edited = input.value;
      entry.filled = false;
      card.querySelector('.filled-label')?.remove();
      answer.textContent = input.value;
      select.disabled = !input.value.trim();
      if (select.disabled) entry.selected = select.checked = false;
      updateSelection();
    });
    select.disabled = entry.edited != null && !entry.edited.trim();
    const overwrite = element('input');
    overwrite.type = 'checkbox';
    overwrite.checked = Boolean(entry.overwrite);
    overwrite.addEventListener('change', () => { entry.overwrite = overwrite.checked; });
    const overwriteLabel = element('label', null, 'choice');
    overwriteLabel.append(overwrite, 'Replace an existing answer in this field');
    editor.append(element('summary', 'Edit or approve replacement'), input, overwriteLabel);
    card.append(answer, choice, editor);
  }
  const detail = explanation(result);
  if (detail) card.append(element('p', detail, 'explanation'));
  return card;
}

function renderGroups() {
  $('groups').replaceChildren();
  const filter = $('filter').value;
  for (const [key, label] of statuses) {
    if (filter !== 'all' && filter !== key) continue;
    const entries = session.entries.filter(({ result }) => result.status === key);
    if (!entries.length) continue;
    const group = element('details');
    group.open = filter !== 'all' || key === 'matched' || key === 'needs_review';
    group.append(element('summary', `${label} (${entries.length})`));
    if (key === 'matched') group.append(bulkSelection());
    const list = element('div', null, 'cards');
    for (const entry of entries) list.append(renderCard(entry));
    group.append(list);
    $('groups').append(group);
  }
  if (!$('groups').childElementCount) $('groups').append(element('p', 'No fields in this category.', 'notice'));
  updateSelection();
}

function showResults(data) {
  const results = new Map(data.results.map((result) => [result.fieldId, result]));
  const entries = data.fields.flatMap((field) => {
    const result = results.get(field.fieldId);
    return result ? [{ field, result, selected: false }] : [];
  });
  session = { id: data.analysisId, entries };
  $('total').textContent = `${data.fields.length} ${data.fields.length === 1 ? 'field' : 'fields'} detected`;
  const options = [['all', 'All fields', data.fields.length], ...statuses.map(([key, label]) =>
    [key, label, entries.filter(({ result }) => result.status === key).length])];
  $('counts').replaceChildren(...options.slice(1).map(([, label, count]) => {
    const item = element('div');
    item.append(element('dt', label), element('dd', count));
    return item;
  }));
  $('filter').replaceChildren(...options.map(([key, label, count]) => {
    const option = element('option', `${label} (${count})`);
    option.value = key;
    return option;
  }));
  $('review').hidden = false;
  renderGroups();
  updateSelection();
  if (data.expiresAt) {
    expiry = setTimeout(() => clearReview('This review expired. Analyze the form again for fresh suggestions.'), Math.max(0, data.expiresAt - Date.now()));
  }
}

async function analyze() {
  if (!boundTab || filling) return;
  const tabId = boundTab.id;
  const connected = account.state === 'connected';
  clearReview('Checking fields and looking for saved answers…');
  const request = generation;
  $('analyze').disabled = true;
  $('analyze').setAttribute('aria-busy', 'true');
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
    $('notice').textContent = !count ? 'No supported fields were found. If the form is still loading, try again.'
      : connected ? '' : `${count} ${count === 1 ? 'field' : 'fields'} detected. Connect your account to get suggestions.`;
  } catch (error) {
    if (request === generation) clearReview(error.message || 'Analysis could not be completed.');
  } finally {
    clearTimeout(timer);
    if (request === generation) {
      $('analyze').disabled = filling;
      $('analyze').removeAttribute('aria-busy');
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
  let filled = 0;
  let alreadyCorrect = 0;
  const labels = new Map(selected.map(({ field }) => [field.fieldId, field.label || 'Unlabeled field']));
  const groups = new Map();
  for (const result of results) {
    if (result.status === 'filled') filled++;
    else if (result.status === 'already_correct') alreadyCorrect++;
    else {
      const label = { conflict: 'Needs approval', skipped: 'Skipped', failed: 'Failed' }[result.status] || 'Check field';
      const reason = label + ' · ' + (result.reason || 'Check this field on the page.');
      if (!groups.has(reason)) groups.set(reason, []);
      groups.get(reason).push(labels.get(result.fieldId));
    }
  }
  const attention = results.length - filled - alreadyCorrect;
  $('fill-results').replaceChildren(
    element('p', `${filled} filled ? ${alreadyCorrect} already correct ? ${attention} need attention`),
    element('small', 'formER did not submit the form.')
  );
  if (attention) {
    const details = element('details');
    const list = element('ul');
    for (const [reason, fields] of groups) list.append(element('li', `${reason} (${fields.join(', ')})`));
    details.append(element('summary', 'See details'), list);
    $('fill-results').append(details);
  }
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
  $('fill-results').textContent = 'Applying selected answers?';
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
    if (request === generation) $('fill-results').textContent = error.message || 'Check the page before trying again.';
  } finally {
    filling = false;
    $('analyze').disabled = !boundTab;
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

function renderAccount(status) {
  account = status;
  const connected = status.state === 'connected';
  const pending = status.state === 'pending';
  $('account-title').textContent = connected ? 'Account connected' : pending ? 'Waiting for approval' : 'Account not connected';
  $('account-description').textContent = connected ? status.account.email : pending
    ? 'Compare this code on the formER website and approve the connection.'
    : status.message || 'Connect to get suggestions from your saved information.';
  $('pair-code').hidden = !pending;
  $('pair-code').textContent = pending ? status.verificationCode : '';
  $('connect').hidden = connected;
  $('connect').textContent = pending ? 'Open approval page' : 'Connect account';
  $('disconnect').hidden = !connected && !pending;
  $('disconnect').textContent = pending ? 'Cancel connection' : 'Disconnect';
  $('analyze').textContent = connected ? 'Analyze form' : 'Detect fields';
}

async function accountAction(type) {
  if (accountBusy) return;
  clearTimeout(pollTimer);
  accountBusy = true;
  $('connect').disabled = $('disconnect').disabled = true;
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
    $('connect').disabled = $('disconnect').disabled = false;
    if (account.state === 'pending') pollTimer = setTimeout(() => accountAction('CONNECTION_STATUS'), 3200);
  }
}

async function refreshTab(message) {
  boundTab = undefined;
  $('page').textContent = '';
  clearReview(message);
  const request = generation;
  try {
    const [tab] = await chrome.tabs.query({ active: true, windowId });
    if (request !== generation || !tab) return;
    boundTab = tab;
    $('page').textContent = tab.title || 'Current tab';
    $('analyze').disabled = false;
  } catch {
    if (request === generation) clearReview('The current page could not be found.');
  }
}

$('filter').addEventListener('change', renderGroups);
$('analyze').addEventListener('click', analyze);
$('connect').addEventListener('click', () => accountAction('CONNECT_ACCOUNT'));
$('disconnect').addEventListener('click', () => accountAction('DISCONNECT_ACCOUNT'));
chrome.tabs.onActivated.addListener((info) => {
  if (info.windowId === windowId) refreshTab('Check this page to start a new review.');
});
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === boundTab?.id && (change.status === 'loading' || change.url !== undefined)) {
    clearReview('This page changed. Check the current form again.');
  }
  if (id === boundTab?.id && change.title) $('page').textContent = change.title;
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
