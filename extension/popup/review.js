const status = document.querySelector('.popup-status');

try {
  // Mount the packaged review markup in the toolbar document so messages
  // originate from the popup itself. Both surfaces use the same controller.
  const response = await fetch(chrome.runtime.getURL('sidepanel/review.html'));
  if (!response.ok) throw new Error('Review markup unavailable');
  const review = new DOMParser().parseFromString(await response.text(), 'text/html');
  if (!review.querySelector('.panel-scroll') || !review.querySelector('.action-footer')) {
    throw new Error('Review markup incomplete');
  }
  document.body.replaceChildren(...review.body.children);
  await import('../sidepanel/review.js');
} catch {
  status.textContent = 'Could not open formER. Close and reopen the popup to try again.';
  document.body.replaceChildren(status);
}
