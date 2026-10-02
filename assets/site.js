// The two download links live here, in one place.
//
// WINDOWS_REPO: the repository whose latest GitHub release holds the Windows
// installer (Noggin-Setup-<version>.exe). The buttons link to its
// /releases/latest page. When the repository is public, the script also asks
// GitHub's API for that release and points the buttons straight at the .exe.
//
// PLAY_URL: the Play Store listing.
//
// TESTING_GROUP_URL: while Noggin is in closed testing, Play only shows the
// listing to members of this Google Group, so the Android buttons open a
// two-step guide (join the group, then open the listing) instead of linking
// straight to Play. Without JavaScript the buttons link to the group. Set it to
// '' once the app is public and the buttons go straight to PLAY_URL.
const WINDOWS_REPO = 'LandChit/Noggin-Page';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=dev.landchit.noggin';
const TESTING_GROUP_URL = 'https://groups.google.com/g/noggin-testing';

(function () {
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const toggle = document.querySelector('.nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Android
  const androidButtons = document.querySelectorAll('[data-download="android"]');
  if (!TESTING_GROUP_URL) {
    androidButtons.forEach((btn) => {
      btn.href = PLAY_URL;
      const label = btn.querySelector('[data-label]');
      if (label) label.textContent = 'Get it on Google Play';
    });
  } else if (androidButtons.length && window.HTMLDialogElement) {
    const guide = buildTestingGuide();
    androidButtons.forEach((btn) => {
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        guide.open();
      });
    });
  }

  // Windows, and the hero's What's new box: both come from the latest release,
  // fetched once.
  const winButtons = document.querySelectorAll('[data-download="windows"]');
  const whatsNew = document.querySelector('[data-whats-new]');
  const releasesPage = `https://github.com/${WINDOWS_REPO}/releases/latest`;
  winButtons.forEach((btn) => { btn.href = releasesPage; });
  if ((winButtons.length || whatsNew) && window.fetch) {
    fetch(`https://api.github.com/repos/${WINDOWS_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((release) => {
        if (!release) return;
        showWhatsNew(release);
        if (!Array.isArray(release.assets)) return;
        const exe = release.assets.find((a) => /\.exe$/i.test(a.name));
        if (!exe) return;
        winButtons.forEach((btn) => {
          btn.href = exe.browser_download_url;
          const sub = btn.querySelector('[data-version]');
          if (sub && release.tag_name) sub.textContent = `Windows · ${release.tag_name}`;
        });
      })
      .catch(() => { /* the releases page link already works, and the box stays hidden */ });
  }

  // The release notes are the same "• " bullets as the app's What's new. Only
  // bullet lines are shown, as text, so nothing in a release body can inject
  // markup. With no bullets the box stays hidden.
  function showWhatsNew(release) {
    if (!whatsNew || typeof release.body !== 'string') return;
    const items = release.body.split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^[•*-]\s+/.test(line))
      .map((line) => line.replace(/^[•*-]\s+/, ''))
      .filter(Boolean);
    if (!items.length) return;
    const list = whatsNew.querySelector('ul');
    items.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      list.appendChild(li);
    });
    const version = whatsNew.querySelector('[data-whats-new-version]');
    if (version && release.tag_name) version.textContent = ` in ${release.tag_name}`;
    whatsNew.hidden = false;
  }

  // Screenshot tabs
  const tabs = document.querySelectorAll('.tabs [role="tab"]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
      });
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const list = Array.from(tabs);
      const next = list[(list.indexOf(tab) + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
      next.focus();
      next.click();
    });
  });
})();

// The closed-testing guide. Step 2 stays dimmed until step 1 is done, so the
// order is obvious: Play says "not found" to anyone who isn't in the group yet.
function buildTestingGuide() {
  const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  const dialog = document.createElement('dialog');
  dialog.className = 'guide';
  dialog.setAttribute('aria-labelledby', 'guide-title');
  dialog.innerHTML = `<div class="guide-body">
    <div class="guide-top">
      <p class="eyebrow">Android · closed test</p>
      <button class="guide-close" type="button" aria-label="Close">×</button>
    </div>
    <h2 id="guide-title">Two steps to get <span class="hl">Noggin</span> on Android</h2>
    <p class="muted">Noggin is in closed testing on Google Play. Anyone can join, and it's free.</p>
    <ol class="steps">
      <li class="step" data-step="1">
        <span class="step-num"><span>1</span>${check}</span>
        <div>
          <h3>Join the testers group</h3>
          <p class="muted">Open the Google Group and tap <b>Join group</b>. Use the same Google account as the Play Store on your phone.</p>
          <div class="step-actions">
            <a class="btn btn-primary btn-sm" href="${TESTING_GROUP_URL}" target="_blank" rel="noopener" data-join>Open the group ${arrow}</a>
            <button class="link-btn" type="button" data-joined>I've already joined</button>
          </div>
        </div>
      </li>
      <li class="step" data-step="2" aria-disabled="true">
        <span class="step-num"><span>2</span>${check}</span>
        <div>
          <h3>Install from Google Play</h3>
          <p class="muted">Open the Noggin listing and tap <b>Install</b>.</p>
          <div class="step-actions">
            <a class="btn btn-sm" href="${PLAY_URL}" target="_blank" rel="noopener" data-play tabindex="-1">Open Google Play ${arrow}</a>
          </div>
          <p class="guide-note"><b>Says "not found"?</b> Joining can take a while to reach Google Play. Wait a few minutes, then open the link again. Check that you're signed in to Play with the account you joined with.</p>
        </div>
      </li>
    </ol>
  </div>`;
  document.body.appendChild(dialog);

  const step1 = dialog.querySelector('[data-step="1"]');
  const step2 = dialog.querySelector('[data-step="2"]');
  const join = dialog.querySelector('[data-join]');
  const play = dialog.querySelector('[data-play]');
  const setJoined = (joined) => {
    step1.classList.toggle('done', joined);
    join.classList.toggle('btn-primary', !joined);
    if (joined) step2.removeAttribute('aria-disabled');
    else step2.setAttribute('aria-disabled', 'true');
    play.classList.toggle('btn-primary', joined);
    if (joined) play.removeAttribute('tabindex');
    else play.setAttribute('tabindex', '-1');
  };
  const markJoined = () => {
    setJoined(true);
    try { localStorage.setItem('noggin-joined-test', '1'); } catch (_) { /* private mode */ }
  };
  let remembered = false;
  try { remembered = localStorage.getItem('noggin-joined-test') === '1'; } catch (_) { /* private mode */ }
  setJoined(remembered);

  join.addEventListener('click', markJoined);
  dialog.querySelector('[data-joined]').addEventListener('click', () => {
    markJoined();
    play.focus();
  });
  play.addEventListener('click', (e) => { if (step2.hasAttribute('aria-disabled')) e.preventDefault(); });
  dialog.querySelector('.guide-close').addEventListener('click', () => dialog.close());
  // The dialog has no padding of its own, so a click that lands on it is on the backdrop.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

  return {
    open: () => {
      dialog.showModal();
      // Start on the next thing to do rather than the close button.
      (step2.hasAttribute('aria-disabled') ? join : play).focus();
    },
  };
}
