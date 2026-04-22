/* ============================================================
   GLOBAL JS — Login modal · Chatbot panel
   ============================================================ */

(function () {
  'use strict';

  // ── Login Modal ──────────────────────────────────────────────
  const modalOverlay = document.getElementById('loginModalOverlay');
  const btnLogin     = document.getElementById('btnLogin');
  const btnModalClose = document.getElementById('btnModalClose');

  function openModal()  { modalOverlay.classList.add('open'); }
  function closeModal() { modalOverlay.classList.remove('open'); }

  if (btnLogin)      btnLogin.addEventListener('click', openModal);
  if (btnModalClose) btnModalClose.addEventListener('click', closeModal);

  // Close on overlay click (outside modal box)
  if (modalOverlay) {
    modalOverlay.addEventListener('click', function (e) {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  // ── Chatbot Panel ─────────────────────────────────────────────
  const chatFab   = document.getElementById('chatbotFab');
  const chatPanel = document.getElementById('chatbotPanel');
  const chatClose = document.getElementById('chatbotClose');

  function openChat()  { chatPanel.classList.add('open'); }
  function closeChat() { chatPanel.classList.remove('open'); }

  function toggleChat() {
    chatPanel.classList.contains('open') ? closeChat() : openChat();
  }

  if (chatFab)   chatFab.addEventListener('click', toggleChat);
  if (chatClose) chatClose.addEventListener('click', closeChat);

})();
