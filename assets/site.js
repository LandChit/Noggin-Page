// The two download links live here, in one place.
//
// WINDOWS_REPO: the repository whose latest GitHub release holds the Windows
// installer (Noggin-Setup-<version>.exe). The buttons link to its
// /releases/latest page. When the repository is public, the script also asks
// GitHub's API for that release and points the buttons straight at the .exe.
//
// PLAY_URL: leave empty until Noggin is on Google Play. While it is empty the
// Android buttons stay disabled and read "Coming soon".
const WINDOWS_REPO = 'LandChit/Noggin-Page';
const PLAY_URL = '';

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
  document.querySelectorAll('[data-download="android"]').forEach((btn) => {
    if (!PLAY_URL) {
      btn.addEventListener('click', (e) => e.preventDefault());
      return;
    }
    btn.href = PLAY_URL;
    btn.removeAttribute('aria-disabled');
    btn.removeAttribute('tabindex');
    const label = btn.querySelector('[data-label]');
    if (label) label.textContent = 'Get it on Google Play';
  });

  // Windows
  const winButtons = document.querySelectorAll('[data-download="windows"]');
  const releasesPage = `https://github.com/${WINDOWS_REPO}/releases/latest`;
  winButtons.forEach((btn) => { btn.href = releasesPage; });
  if (winButtons.length && window.fetch) {
    fetch(`https://api.github.com/repos/${WINDOWS_REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((release) => {
        if (!release || !Array.isArray(release.assets)) return;
        const exe = release.assets.find((a) => /\.exe$/i.test(a.name));
        if (!exe) return;
        winButtons.forEach((btn) => {
          btn.href = exe.browser_download_url;
          const sub = btn.querySelector('[data-version]');
          if (sub && release.tag_name) sub.textContent = `Windows · ${release.tag_name}`;
        });
      })
      .catch(() => { /* the releases page link already works */ });
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
