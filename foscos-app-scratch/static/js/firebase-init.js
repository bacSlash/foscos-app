/* Firebase initialisation — fetches config from Flask so each
   deployment only needs its own .env file.                     */
(async function () {
  try {
    const res = await fetch('/api/firebase-config');
    const config = await res.json();
    firebase.initializeApp(config);
  } catch (e) {
    console.error('[FOSCOS] Firebase init failed:', e);
  }
  document.dispatchEvent(new Event('firebase-ready'));
})();
