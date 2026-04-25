/* ============================================================
   FBO_PORTAL.JS — P23 Dashboard: pending or approved state
   ============================================================ */
(function () {
  'use strict';

  var PENDING_STATUSES = [
    'submitted', 'pending',
    'documents_requested', 'inspection_scheduled',
    'inspection_complete', 'final_review'
  ];

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

  function showPending(d) {
    document.getElementById('fboLoadingView').style.display  = 'none';
    document.getElementById('fboApprovedView').style.display = 'none';
    document.getElementById('fboPendingView').style.display  = '';

    var name = (d.details && d.details.bizName) || (d.displayName) || 'Applicant';
    setText('pendingGreeting',   'Hi ' + name.split(' ')[0] + ' — Application Under Review');
    setText('pendingAppId',      d.applicationId);
    setText('pendingAppIdBadge', d.applicationId);

    setText('pend-bizName',     d.details && d.details.bizName);
    setText('pend-licenseType', TIER_LABELS[d.scale && d.scale.tier] || '—');
    var years = d.review && d.review.years;
    setText('pend-duration', years ? years + (years === 1 ? ' Year' : ' Years') : '—');
    var fee = d.review && d.review.totalFee;
    setText('pend-fee', fee !== undefined ? '₹' + fee.toLocaleString('en-IN') : '—');

    var trackBtn = document.getElementById('pendingTrackBtn');
    if (trackBtn) {
      trackBtn.addEventListener('click', function () {
        alert('Application ID: ' + (d.applicationId || '—') + '\n\nStatus: Under Review\nExpected: 30 working days');
      });
    }
  }

  function showApproved(d) {
    document.getElementById('fboLoadingView').style.display  = 'none';
    document.getElementById('fboPendingView').style.display  = 'none';
    document.getElementById('fboApprovedView').style.display = '';

    var bizName = (d.details && d.details.bizName) || 'your business';
    setText('approvedGreeting',    'Welcome back 👋');
    setText('approvedBusinessName', bizName);
    setText('approvedLicenseId',   d.applicationId);

    setText('appr-licenseType', TIER_LABELS[d.scale && d.scale.tier] || '—');
    setText('appr-bizName',     d.details && d.details.bizName);

    var addr = d.details
      ? [d.details.addrLine1, d.details.addrDistrict, d.details.addrState].filter(Boolean).join(', ')
      : '—';
    setText('appr-address', addr);

    var submittedAt = d.submittedAt && d.submittedAt.toDate ? d.submittedAt.toDate() : null;
    var years = (d.review && d.review.years) || 1;
    if (submittedAt) {
      var validUntil = new Date(submittedAt);
      validUntil.setFullYear(validUntil.getFullYear() + years);
      setText('appr-validUntil', validUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }));
    }

    // Placeholder click handlers for quick action cards
    document.querySelectorAll('.fbo-card').forEach(function (card) {
      card.addEventListener('click', function () {
        alert('This feature is coming soon!');
      });
    });
  }

  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }

      firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
        if (!doc.exists) { window.location.href = '/about-business'; return; }
        var d = doc.data();

        if (d.applicationStatus === 'approved') {
          showApproved(d);
        } else if (PENDING_STATUSES.indexOf(d.applicationStatus) !== -1 || d.applicationId) {
          showPending(d);
        } else {
          // No application — redirect to start of registration
          window.location.href = '/about-business';
        }
      }).catch(function () {
        window.location.href = '/';
      });
    });
  });

})();
