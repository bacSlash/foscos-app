/* ============================================================
   DOCUMENTS.JS — P10 Dynamic checklist; stores boolean flags in Firestore
   ============================================================ */
(function () {
  'use strict';

  var DOC_SPECS = {
    'selfie': {
      icon: '🤳',
      title: 'Photo of Applicant',
      sub: 'Clear, passport-style photo or selfie',
      tiers: ['temporary-basic', 'basic', 'state', 'central']
    },
    'idProof': {
      icon: '🪪',
      title: 'Identity Proof',
      sub: 'Aadhaar, PAN, Passport, Voter ID, or Driving Licence',
      tiers: ['basic', 'state', 'central']
    },
    'addressProof': {
      icon: '🏠',
      title: 'Address Proof',
      sub: 'Electricity bill, ration card, or lease agreement',
      tiers: ['basic', 'state', 'central']
    },
    'form9': {
      icon: '📋',
      title: 'Form IX — Nomination of Person',
      sub: 'Signed nomination form (download from FSSAI)',
      tiers: ['state', 'central']
    },
    'blueprint': {
      icon: '🗺️',
      title: 'Premises Blueprint / Layout',
      sub: 'Scaled layout plan of the food premises',
      tiers: ['state', 'central']
    },
    'nocFireDept': {
      icon: '🔥',
      title: 'NOC from Fire Department',
      sub: 'Required for large premises',
      tiers: ['central']
    },
    'waterTestReport': {
      icon: '💧',
      title: 'Water Analysis Report',
      sub: 'From approved lab — shows potability',
      tiers: ['state', 'central']
    }
  };

  var confirmedDocs = {};
  var currentTier   = null;

  // ── Build checklist based on tier ────────────────────────────
  function buildDocList(tier) {
    currentTier = tier;
    var list = document.getElementById('docList');
    if (!list) return;
    list.innerHTML = '';

    Object.keys(DOC_SPECS).forEach(function (key) {
      var spec = DOC_SPECS[key];
      if (spec.tiers.indexOf(tier) === -1) return;

      var done = !!confirmedDocs[key];
      var item = document.createElement('div');
      item.className = 'reg-doc-item' + (done ? ' uploaded' : '');
      item.id        = 'docItem-' + key;

      item.innerHTML =
        '<div class="reg-doc-item__icon">' + spec.icon + '</div>' +
        '<div class="reg-doc-item__info">' +
          '<div class="reg-doc-item__title">' + spec.title + '</div>' +
          '<div class="reg-doc-item__sub">' + spec.sub + '</div>' +
          '<div class="reg-doc-item__filename" id="docName-' + key + '"' + (done ? '' : ' style="display:none;"') + '>' +
            (done ? '✓ Provided' : '') +
          '</div>' +
        '</div>' +
        '<button class="reg-doc-item__upload-btn' + (done ? ' done' : '') + '" id="docBtn-' + key + '">' +
          (done ? '✓ Provided' : 'Mark as ready') +
          '<input type="file" data-key="' + key + '" accept="image/*,.pdf" />' +
        '</button>';

      list.appendChild(item);

      var fileInput = item.querySelector('input[type="file"]');
      fileInput.addEventListener('change', function () {
        if (fileInput.files[0]) handleDocProvided(key, fileInput.files[0].name);
      });
    });
  }

  // ── Mark document as provided (store boolean in Firestore) ────
  function handleDocProvided(key, filename) {
    var user = firebase.auth().currentUser;
    if (!user) return;

    confirmedDocs[key] = true;
    markDone(key, filename);
    document.getElementById('docsError').textContent = '';

    var update = {};
    update['documents.' + key] = true;
    update['updatedAt'] = firebase.firestore.FieldValue.serverTimestamp();
    firebase.firestore().collection('users').doc(user.uid).update(update).catch(function (e) {
      console.error('[FOSCOS] Firestore save doc flag:', e);
    });
  }

  function markDone(key, filename) {
    var item = document.getElementById('docItem-' + key);
    var btn  = document.getElementById('docBtn-' + key);
    var name = document.getElementById('docName-' + key);
    if (item) item.classList.add('uploaded');
    if (btn)  { btn.classList.add('done'); btn.childNodes[0].textContent = '✓ Provided'; }
    if (name) { name.textContent = filename || '✓ Provided'; name.style.display = ''; }
  }

  function getRequiredDocs(tier) {
    return Object.keys(DOC_SPECS).filter(function (k) {
      return DOC_SPECS[k].tiers.indexOf(tier) !== -1;
    });
  }

  function allRequiredProvided() {
    if (!currentTier) return false;
    return getRequiredDocs(currentTier).every(function (k) { return confirmedDocs[k]; });
  }

  // ── Load existing flags from Firestore ────────────────────────
  function loadExisting(user) {
    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      var d    = doc.exists ? doc.data() : {};
      var tier = (d.scale && d.scale.tier) || 'basic';

      if (d.documents) {
        Object.keys(d.documents).forEach(function (k) {
          if (d.documents[k]) confirmedDocs[k] = true;
        });
      }

      buildDocList(tier);
    });
  }

  // ── Continue ─────────────────────────────────────────────────
  function continueFlow() {
    if (!allRequiredProvided()) {
      document.getElementById('docsError').textContent = 'Please mark all required documents as ready to continue.';
      return;
    }
    document.getElementById('docsError').textContent = '';
    var params = new URLSearchParams(window.location.search);
    window.location.href = params.get('from') === 'review' ? '/review' : '/one-stop-shop?from=documents';
  }

  // ── Auth guard ────────────────────────────────────────────────
  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }
      loadExisting(user);
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('docsContinueBtn');
    if (btn) btn.addEventListener('click', continueFlow);
  });

})();
