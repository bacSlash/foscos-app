/* ============================================================
   GLOBAL JS — Chatbot panel toggle
   (Login modal is handled by auth.js)
   ============================================================ */

(function () {
  'use strict';

  // ── Chatbot Panel ─────────────────────────────────────────────
  var chatFab   = document.getElementById('chatbotFab');
  var chatPanel = document.getElementById('chatbotPanel');
  var chatClose = document.getElementById('chatbotClose');

  function openChat()  { chatPanel.classList.add('open'); }
  function closeChat() { chatPanel.classList.remove('open'); }
  function toggleChat() {
    chatPanel.classList.contains('open') ? closeChat() : openChat();
  }

  if (chatFab)   chatFab.addEventListener('click', toggleChat);
  if (chatClose) chatClose.addEventListener('click', closeChat);

})();
