# TradeDiary
Personal trading journal (static PWA, Firebase Auth + Realtime DB).

## Structure
- `index.html` – markup only
- `css/style.css` – all styles
- `js/config.js` – **edit `AI_PROXY` and `NSE_API_BASE` here**
- `js/firebase.js` – Firebase init (ES module); other `js/*.js` are classic scripts loaded in the order listed in `index.html`
- `sw.js` – service worker (bump `CACHE_VERSION` every deploy)

No build step: push to GitHub Pages as-is.
