/* ============================================================
   SCALE.JS — P08 Business Scale / Turnover Calculator
   ============================================================ */
(function () {
  'use strict';

  var daysPerWeek   = 6;
  var currentTier   = null;
  var currentTurnover = 0;

  var TIER_FEES = {
    'temporary-basic': 0,
    'basic':           100,
    'state':           2000,
    'central':         7500
  };

  var TIER_LABELS = {
    'temporary-basic': 'Basic Registration',
    'basic':           'State License (Basic)',
    'state':           'State License',
    'central':         'Central License'
  };

  var TIER_BADGE_CLASS = {
    'temporary-basic': 'reg-tier-badge--temp',
    'basic':           'reg-tier-badge--basic',
    'state':           'reg-tier-badge--state',
    'central':         'reg-tier-badge--central'
  };

  function calcTurnover(daily, days, months) {
    return Math.round(daily * days * 4.3 * months);
  }

  function getTier(t) {
    if (t < 1000000)   return 'temporary-basic';
    if (t < 15000000)  return 'basic';
    if (t < 200000000) return 'state';
    return 'central';
  }

  function formatINR(n) {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000)   return '₹' + (n / 100000).toFixed(2) + ' L';
    return '₹' + n.toLocaleString('en-IN');
  }

  function updateResult() {
    var daily  = parseFloat(document.getElementById('dailyRevenue').value) || 0;
    var months = Math.min(12, Math.max(1, parseInt(document.getElementById('monthsPerYear').value) || 12));

    if (daily <= 0) {
      document.getElementById('turnoverAmount').textContent = '₹ —';
      document.getElementById('turnoverLabel').textContent  = 'Enter your daily revenue to see your estimate';
      document.getElementById('tierBadge').style.display    = 'none';
      document.getElementById('tempPanel').style.display    = 'none';
      document.getElementById('tiersTable').style.display   = 'none';
      currentTier     = null;
      currentTurnover = 0;
      return;
    }

    var turnover = calcTurnover(daily, daysPerWeek, months);
    var tier     = getTier(turnover);
    currentTier     = tier;
    currentTurnover = turnover;

    document.getElementById('turnoverAmount').textContent = formatINR(turnover);
    document.getElementById('turnoverLabel').textContent  = 'estimated annual turnover';

    var badge = document.getElementById('tierBadge');
    badge.className  = 'reg-tier-badge ' + TIER_BADGE_CLASS[tier];
    badge.textContent = TIER_LABELS[tier];
    badge.style.display = 'inline-block';

    document.getElementById('tempPanel').style.display  = (tier === 'temporary-basic') ? '' : 'none';
    document.getElementById('tiersTable').style.display = (tier !== 'temporary-basic') ? '' : 'none';

    ['temp', 'basic', 'state', 'central'].forEach(function (r) {
      var row = document.getElementById('row-' + r);
      if (row) row.classList.remove('active-tier');
    });

    var rowMap = {
      'temporary-basic': 'temp',
      'basic':           'basic',
      'state':           'state',
      'central':         'central'
    };

    var activeRow = document.getElementById('row-' + rowMap[tier]);
    if (activeRow) activeRow.classList.add('active-tier');
  }

  function setupDayPills() {
    document.querySelectorAll('.reg-day-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        document.querySelectorAll('.reg-day-pill').forEach(function (p) { p.classList.remove('selected'); });
        pill.classList.add('selected');
        daysPerWeek = parseInt(pill.dataset.days);
        updateResult();
      });
    });
  }

  function saveAndContinue() {
    if (!currentTier) {
      document.getElementById('scaleError').textContent = 'Please enter your daily revenue to continue.';
      return;
    }
    document.getElementById('scaleError').textContent = '';

    var user = firebase.auth().currentUser;
    if (!user) { window.location.href = '/'; return; }

    var btn = document.getElementById('scaleContinueBtn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    var panIndia = document.getElementById('panIndiaCheck').checked;
    var months   = Math.min(12, Math.max(1, parseInt(document.getElementById('monthsPerYear').value) || 12));
    var daily    = parseFloat(document.getElementById('dailyRevenue').value) || 0;

    firebase.firestore().collection('users').doc(user.uid).set({
      scale: {
        dailyRevenue: daily,
        daysPerWeek:  daysPerWeek,
        monthsPerYear: months,
        turnover:     currentTurnover,
        tier:         currentTier,
        fee:          TIER_FEES[currentTier],
        panIndia:     panIndia
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(function () {
      var dest = document.getElementById('scaleContinueBtn').dataset.fromReview === 'true'
        ? '/review'
        : '/business-details';
      window.location.href = dest;
    })
    .catch(function (e) {
      console.error('[FOSCOS] Firestore save scale:', e);
      document.getElementById('scaleError').textContent = 'Could not save. Please try again.';
      btn.disabled    = false;
      btn.textContent = 'Continue with full license →';
    });
  }

  function loadExisting() {
    var user = firebase.auth().currentUser;
    if (!user) return;
    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var s = doc.data().scale;
      if (!s) return;
      var dr = document.getElementById('dailyRevenue');
      var my = document.getElementById('monthsPerYear');
      var pi = document.getElementById('panIndiaCheck');
      if (dr) dr.value = s.dailyRevenue || '';
      if (my) my.value = s.monthsPerYear || 12;
      if (pi) pi.checked = s.panIndia || false;
      if (s.daysPerWeek) {
        daysPerWeek = s.daysPerWeek;
        document.querySelectorAll('.reg-day-pill').forEach(function (p) {
          p.classList.toggle('selected', parseInt(p.dataset.days) === daysPerWeek);
        });
      }
      updateResult();
    });
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }
      loadExisting();
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    setupDayPills();

    var dr = document.getElementById('dailyRevenue');
    var my = document.getElementById('monthsPerYear');
    if (dr) dr.addEventListener('input', updateResult);
    if (my) my.addEventListener('input', updateResult);

    var btn = document.getElementById('scaleContinueBtn');
    if (btn) btn.addEventListener('click', saveAndContinue);

    var tempBtn = document.getElementById('btnTempLicense');
    if (tempBtn) {
      tempBtn.addEventListener('click', function () {
        window.location.href = '/temp-license';
      });
    }

    var params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'review') {
      var cb = document.getElementById('scaleContinueBtn');
      if (cb) {
        cb.textContent          = 'Save & Back to Review →';
        cb.dataset.fromReview   = 'true';
      }
    }
  });

})();
