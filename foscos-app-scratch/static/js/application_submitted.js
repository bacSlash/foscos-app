/* ============================================================
   APPLICATION_SUBMITTED.JS — P13 Payment confirmation receipt
   ============================================================ */
(function () {
  'use strict';

  var TIER_LABELS = {
    'temporary-basic': 'Basic Registration',
    'basic':           'State License (Basic)',
    'state':           'State License',
    'central':         'Central License'
  };

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val || '—';
  }

  function row(label, value) {
    return '<div class="submitted-detail-row"><span>' + label + '</span><span>' + value + '</span></div>';
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }

      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        if (!doc.exists) return;
        var d = doc.data();

        setText('submittedAppId', d.applicationId || '—');
        setText('sub-bizName',    d.details && d.details.bizName);
        setText('sub-licenseType', TIER_LABELS[d.scale && d.scale.tier] || '—');

        var years = d.review && d.review.years;
        setText('sub-duration', years ? years + (years === 1 ? ' Year' : ' Years') : '—');

        var licenseFee = (d.review && d.review.totalFee) || 0;
        setText('sub-fee', licenseFee ? '₹' + licenseFee.toLocaleString('en-IN') : '—');

        // OSS add-ons
        var ossTotal   = 0;
        var ossSection = document.getElementById('sub-ossSection');
        var ossRows    = document.getElementById('sub-ossRows');
        var ossCart    = d.ossCart;

        if (ossCart && ossCart.items && ossCart.items.length && ossRows && ossSection) {
          ossSection.style.display = '';
          ossRows.innerHTML = ossCart.items.map(function (item) {
            ossTotal += item.price || 0;
            return row(item.name, '₹' + (item.price || 0).toLocaleString('en-IN'));
          }).join('');
        }

        var grandTotal = licenseFee + ossTotal;
        setText('sub-total', grandTotal ? '₹' + grandTotal.toLocaleString('en-IN') : '—');
      });
    });
  });

})();
