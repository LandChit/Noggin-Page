// The download links live here, in one place.
//
// RELEASE_REPO: the repository whose latest GitHub release holds the Windows
// installer (Noggin-Setup-<version>.exe) and the Linux AppImage
// (Noggin-<version>-x86_64.AppImage). The buttons link to its /releases/latest
// page. When the repository is public, the script also asks GitHub's API for
// that release and points each button straight at its file.
//
// PLAY_URL: the Play Store listing.
//
// TESTING_GROUP_URL: while Noggin is in closed testing, Play only shows the
// listing to members of this Google Group, so the Android buttons open a
// two-step guide (join the group, then open the listing) instead of linking
// straight to Play. Without JavaScript the buttons link to the group. Set it to
// '' once the app is public and the buttons go straight to PLAY_URL.
const RELEASE_REPO = 'LandChit/Noggin-Page';
const PLAY_URL = 'https://play.google.com/store/apps/details?id=dev.landchit.noggin';
const TESTING_GROUP_URL = 'https://groups.google.com/g/noggin-testing';

// Shared by the download guides. Declared up here because the code below runs
// as soon as the file loads, before anything further down is initialised.
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';

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

  // Linux visitors get the AppImage as the main button. Phones are left alone:
  // Android's user agent says Linux too.
  const ua = navigator.userAgent;
  if (/Linux/.test(ua) && !/Android/.test(ua)) {
    document.querySelectorAll('.btn-row').forEach((row) => {
      const win = row.querySelector('[data-download="windows"]');
      const linux = row.querySelector('[data-download="linux"]');
      if (!win || !linux) return;
      win.classList.remove('btn-primary');
      linux.classList.add('btn-primary');
      row.insertBefore(linux, win);
    });
  }

  // Windows, Linux, and the hero's What's new box: all come from the latest
  // release, fetched once.
  const whatsNew = document.querySelector('[data-whats-new]');
  const releasesPage = `https://github.com/${RELEASE_REPO}/releases/latest`;
  const desktops = [
    { key: 'windows', label: 'Windows', file: /\.exe$/i, guide: buildWindowsGuide },
    // The .zsync beside the AppImage is for updaters; only the guide links it.
    { key: 'linux', label: 'Linux', file: /\.AppImage$/i, extra: /\.AppImage\.zsync$/i, guide: buildLinuxGuide },
  ].map((d) => {
    const buttons = document.querySelectorAll(`[data-download="${d.key}"]`);
    buttons.forEach((btn) => { btn.href = releasesPage; });
    // Neither file is signed, so each system warns about it. A click still
    // follows the link: the file downloads (the page stays put), or the
    // releases page opens in a new tab. The guide opens alongside to explain.
    const guide = buttons.length && window.HTMLDialogElement ? d.guide(releasesPage) : null;
    if (guide) {
      buttons.forEach((btn) => {
        btn.setAttribute('aria-haspopup', 'dialog');
        btn.addEventListener('click', (e) => {
          const direct = d.file.test(btn.href);
          if (!direct) {
            e.preventDefault();
            window.open(btn.href, '_blank', 'noopener');
          }
          guide.open(direct);
        });
      });
    }
    return { ...d, buttons, guide };
  });

  if ((desktops.some((d) => d.buttons.length) || whatsNew) && window.fetch) {
    fetch(`https://api.github.com/repos/${RELEASE_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((release) => {
        if (!release) return;
        showWhatsNew(release);
        if (!Array.isArray(release.assets)) return;
        desktops.forEach((d) => {
          const asset = release.assets.find((a) => d.file.test(a.name));
          if (!asset) return;
          d.buttons.forEach((btn) => {
            btn.href = asset.browser_download_url;
            const sub = btn.querySelector('[data-version]');
            if (sub && release.tag_name) sub.textContent = `${d.label} · ${release.tag_name}`;
          });
          if (d.guide) d.guide.setDownload(asset.browser_download_url, asset.name);
          const extra = d.extra && release.assets.find((a) => d.extra.test(a.name));
          if (extra && d.guide && d.guide.setExtra) d.guide.setExtra(extra.browser_download_url, extra.name);
        });
      })
      .catch(() => { /* the releases page links already work, and the box stays hidden */ });
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

  // Scroll reveal. Only things that start below the fold are hidden, so
  // nothing on screen at load blinks, and without JavaScript nothing is hidden
  // at all. Once an item has arrived its `reveal` class goes, so hover lifts
  // aren't held back by the reveal's transition delay.
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.IntersectionObserver && !reduceMotion) {
    const items = Array.from(document.querySelectorAll(
      '.section-head, .cards > *, .promise > li, .feature-list > li, .shots, .frow > *, .coffee-card, .cta .wrap > *'
    )).filter((el) => el.getBoundingClientRect().top > window.innerHeight);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add('shown');
        const delay = Number(el.style.getPropertyValue('--i') || 0) * 70;
        setTimeout(() => el.classList.remove('reveal'), delay + 800);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => {
      el.style.setProperty('--i', String(Math.min(Array.from(el.parentElement.children).indexOf(el), 5)));
      el.classList.add('reveal');
      observer.observe(el);
    });
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

// The guides' shared shell: a modal dialog with a close button that also closes
// on a backdrop click. `id` names the dialog's title element.
function makeGuideDialog(id, eyebrow, content) {
  const dialog = document.createElement('dialog');
  dialog.className = 'guide';
  dialog.setAttribute('aria-labelledby', id);
  dialog.innerHTML = `<div class="guide-body">
    <div class="guide-top">
      <p class="eyebrow">${eyebrow}</p>
      <button class="guide-close" type="button" aria-label="Close">×</button>
    </div>
    ${content}
  </div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.guide-close').addEventListener('click', () => dialog.close());
  // The dialog has no padding of its own, so a click that lands on it is on the backdrop.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  return dialog;
}

// The closed-testing guide. Step 2 stays dimmed until step 1 is done, so the
// order is obvious: Play says "not found" to anyone who isn't in the group yet.
function buildTestingGuide() {
  const check = CHECK_ICON;
  const arrow = ARROW_ICON;
  const dialog = makeGuideDialog('android-guide-title', 'Android · closed test', `
    <h2 id="android-guide-title">Two steps to get <span class="hl">Noggin</span> on Android</h2>
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
    </ol>`);

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

  return {
    open: () => {
      dialog.showModal();
      // Start on the next thing to do rather than the close button.
      (step2.hasAttribute('aria-disabled') ? join : play).focus();
    },
  };
}

// The Windows guide: how to get the unsigned installer past the browser's
// download check and SmartScreen's "Windows protected your PC". The mock-ups
// copy what Windows shows, so the student knows which link to press.
function buildWindowsGuide(releasesPage) {
  const dialog = makeGuideDialog('windows-guide-title', 'Windows · installer', `
    <h2 id="windows-guide-title">Installing <span class="hl">Noggin</span> on Windows</h2>
    <p class="muted">The installer isn't code-signed yet, so Windows doesn't know who made it and warns you before it runs. That's expected. Only run it if it came from this site.</p>
    <ol class="steps">
      <li class="step" data-step="1">
        <span class="step-num"><span>1</span>${CHECK_ICON}</span>
        <div>
          <h3>Download the installer</h3>
          <p class="muted" data-download-status>Get <b data-file-name>Noggin-Setup.exe</b> from the latest release.</p>
          <div class="step-actions">
            <a class="btn btn-sm" href="${releasesPage}" target="_blank" rel="noopener" data-file>Download ${ARROW_ICON}</a>
          </div>
          <p class="guide-note"><b>Browser says it "isn't commonly downloaded"?</b> In Edge, open the <b>⋯</b> menu on the download, choose <b>Keep</b>, then <b>Show more → Keep anyway</b>. In Chrome, choose <b>Keep</b>.</p>
        </div>
      </li>
      <li class="step" data-step="2">
        <span class="step-num"><span>2</span>${CHECK_ICON}</span>
        <div>
          <h3>Open it, then choose <i>More info</i></h3>
          <p class="muted">Windows shows a blue <b>Windows protected your PC</b> box with only a <b>Don't run</b> button. Click the <b>More info</b> link under the message.</p>
          <div class="smartscreen" aria-hidden="true">
            <p class="ss-title">Windows protected your PC</p>
            <p>Microsoft Defender SmartScreen prevented an unrecognised app from starting. Running this app might put your PC at risk.</p>
            <p><span class="ss-link ss-target">More info</span></p>
            <div class="ss-buttons"><span class="ss-btn">Don't run</span></div>
          </div>
        </div>
      </li>
      <li class="step" data-step="3">
        <span class="step-num"><span>3</span>${CHECK_ICON}</span>
        <div>
          <h3>Choose <i>Run anyway</i></h3>
          <p class="muted">The box now names the app and shows <b>Publisher: Unknown publisher</b>. Click <b>Run anyway</b>, and the installer opens. It doesn't need admin rights.</p>
          <div class="smartscreen" aria-hidden="true">
            <p class="ss-title">Windows protected your PC</p>
            <p>App: <span data-file-name>Noggin-Setup.exe</span><br>Publisher: Unknown publisher</p>
            <div class="ss-buttons"><span class="ss-btn ss-target">Run anyway</span><span class="ss-btn">Don't run</span></div>
          </div>
        </div>
      </li>
    </ol>`);

  return downloadGuide(dialog);
}

// The Linux guide: an AppImage needs no installing, only permission to run.
function buildLinuxGuide(releasesPage) {
  const dialog = makeGuideDialog('linux-guide-title', 'Linux · AppImage', `
    <h2 id="linux-guide-title">Running <span class="hl">Noggin</span> on Linux</h2>
    <p class="muted">Noggin for Linux is one AppImage file, with nothing to install. Your notes are kept in <code>~/.local/share/dev.landchit.noggin</code>, not in the file, so a newer AppImage picks up where the old one left off.</p>
    <ol class="steps">
      <li class="step" data-step="1">
        <span class="step-num"><span>1</span>${CHECK_ICON}</span>
        <div>
          <h3>Download the AppImage</h3>
          <p class="muted" data-download-status>Get <b data-file-name>Noggin-x86_64.AppImage</b> from the latest release.</p>
          <div class="step-actions">
            <a class="btn btn-sm" href="${releasesPage}" target="_blank" rel="noopener" data-file>Download ${ARROW_ICON}</a>
          </div>
        </div>
      </li>
      <li class="step" data-step="2">
        <span class="step-num"><span>2</span>${CHECK_ICON}</span>
        <div>
          <h3>Allow it to run</h3>
          <p class="muted">Right-click the file, open <b>Properties → Permissions</b> and tick <b>Allow executing file as program</b>. Or, in a terminal: <code>chmod +x Noggin-*.AppImage</code></p>
        </div>
      </li>
      <li class="step" data-step="3">
        <span class="step-num"><span>3</span>${CHECK_ICON}</span>
        <div>
          <h3>Double-click it</h3>
          <p class="muted">Noggin opens in its own window. Keep the file somewhere it can stay, such as an <b>Applications</b> folder in your home folder.</p>
          <p class="guide-note"><b>Nothing happens on Ubuntu or Mint?</b> AppImages need FUSE 2. Run <code>sudo apt install libfuse2</code> (on Ubuntu 24.04, <code>libfuse2t64</code>), then try again.</p>
          <p class="guide-note"><b>Updating later?</b> Put the new AppImage in the same folder as this one and open it; Noggin takes it from there. See <a href="support.html#updating-linux">Updating Noggin on Linux</a>.</p>
          <p class="guide-note"><b>Using Gear Lever or AppImageUpdate?</b> They fetch the update file themselves, so you don't need it. To download it anyway: <a href="${releasesPage}" target="_blank" rel="noopener" data-zsync><span data-zsync-name>Noggin-x86_64.AppImage.zsync</span></a>.</p>
        </div>
      </li>
    </ol>`);

  const zsync = dialog.querySelector('[data-zsync]');
  return {
    ...downloadGuide(dialog),
    // The release's .zsync, for AppImage updaters; optional for people.
    setExtra: (url, name) => {
      zsync.href = url;
      zsync.removeAttribute('target');
      dialog.querySelector('[data-zsync-name]').textContent = name;
    },
  };
}

// Step 1 of a desktop guide: its button turns into "Download again" once the
// download has started, and points straight at the file once it's known.
function downloadGuide(dialog) {
  const step1 = dialog.querySelector('[data-step="1"]');
  const file = dialog.querySelector('[data-file]');
  const status = dialog.querySelector('[data-download-status]');
  const setDownloading = (downloading) => {
    step1.classList.toggle('done', downloading);
    file.classList.toggle('btn-primary', !downloading);
    file.firstChild.textContent = downloading ? 'Download again ' : 'Download ';
    if (downloading) status.innerHTML = 'Your download has started. If it didn\'t, use the button below.';
  };
  file.addEventListener('click', () => setDownloading(true));

  return {
    setDownload: (url, name) => {
      file.href = url;
      file.removeAttribute('target');
      dialog.querySelectorAll('[data-file-name]').forEach((el) => { el.textContent = name; });
    },
    open: (started) => {
      if (started) setDownloading(true);
      dialog.showModal();
      file.focus();
    },
  };
}
