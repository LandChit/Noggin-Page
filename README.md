# Noggin-Page

The static website for [Noggin](index.html), the offline study app: landing page, features, privacy policy, terms of use and support. Plain HTML and CSS with one small script, no build step.

| Page | What it's for |
|---|---|
| `index.html` | Landing page with the download buttons |
| `features.html` | Full feature list |
| `privacy.html` | Privacy policy (the URL Google Play asks for) |
| `terms.html` | Terms of use |
| `support.html` | FAQ, contact and how to delete your data (for the Play data-deletion question) |
| `404.html` | Not-found page for GitHub Pages |

## Download links

Both are set at the top of `assets/site.js`:

- `WINDOWS_REPO` is `LandChit/Noggin-Page`. The Windows buttons open this repo's latest release, and the script points them at its `.exe` when the release has one. Attach `Noggin-Setup-<version>.exe` from `noggin_app/installer/build_installer.ps1` to each release here.
- `PLAY_URL` is empty, so the Android buttons read "coming soon". Once the app is on Google Play, set it to the listing URL.

## Publishing

Settings → Pages → *Deploy from a branch* → `main` / root. `.nojekyll` stops Jekyll from processing the files.

## Assets

Screenshots come from `marketing/phone` and `marketing/tablet` in the app repo, converted to WebP (660 px and 1376 px wide). `assets/img/og-image.png` is the Play feature graphic. The icon comes from `noggin_app/assets/icon`. `assets/fonts/nunito-var.woff2` is Nunito (SIL OFL, see `OFL-Nunito.txt`), trimmed to Latin characters.
