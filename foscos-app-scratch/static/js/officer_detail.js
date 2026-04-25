/* ============================================================
   OFFICER_DETAIL.JS — Application detail: tabs, pipeline, actions
   ============================================================ */
(function () {
  'use strict';

  var appId   = window.__APP_ID__;
  var appData = null;
  var pendingAction = null;

  var STATUS_LABELS = {
    submitted:            'Submitted',
    documents_requested:  'Docs Requested',
    inspection_scheduled: 'Inspection Scheduled',
    inspection_complete:  'Inspection Complete',
    final_review:         'Final Review',
    approved:             'Approved',
    rejected:             'Rejected'
  };

  var TIER_LABELS = {
    'temporary-basic': 'Basic Registration',
    'basic':           'State License (Basic)',
    'state':           'State License',
    'central':         'Central License'
  };

  var DOC_NAMES = {
    selfie:       'Selfie / Photo ID',
    idProof:      'Identity Proof',
    addressProof: 'Address Proof',
    form9:        'Form IX',
    blueprint:    'Floor Plan / Blueprint'
  };

  var PIPELINE_ORDER = [
    'submitted', 'documents_requested', 'inspection_scheduled',
    'inspection_complete', 'final_review', 'approved'
  ];

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function formatDate(ts) {
    if (!ts) return '—';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateTime(ts) {
    if (!ts) return '—';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
           ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  // ── Pipeline ──────────────────────────────────────────────────
  function renderPipeline(status) {
    var steps = document.querySelectorAll('#detailPipeline .officer-pipeline__step');
    var currentIdx = PIPELINE_ORDER.indexOf(status);

    steps.forEach(function (step) {
      var s = step.getAttribute('data-step');
      var idx = PIPELINE_ORDER.indexOf(s);
      step.classList.remove('active', 'done');
      if (s === status) {
        step.classList.add('active');
      } else if (status === 'rejected') {
        // no done styling on rejection
      } else if (idx < currentIdx) {
        step.classList.add('done');
      }
    });
  }

  // ── Status badge ──────────────────────────────────────────────
  function renderStatusBadge(status) {
    var el = document.getElementById('currentStatusBadge');
    if (!el) return;
    var label = STATUS_LABELS[status] || status;
    el.textContent  = label;
    el.className    = 'officer-status-badge-lg officer-badge officer-badge--' + (status || '');
  }

  // ── Meta sidebar ──────────────────────────────────────────────
  function renderMeta(d) {
    setText('metaSubmitted', formatDate(d.submittedAt));
    setText('metaUpdated',   formatDate(d.updatedAt));
    setText('metaTier',      TIER_LABELS[d.tier] || d.tier || '—');
    setText('metaFee',       d.fee ? ('Rs. ' + (d.fee * (d.years || 1)).toLocaleString('en-IN')) : '—');
  }

  // ── Business Info tab ─────────────────────────────────────────
  function renderBusinessInfo(d) {
    var det    = d.details || {};
    var scale  = d.scale   || {};
    var grid   = document.getElementById('businessInfoGrid');
    if (!grid) return;

    grid.innerHTML = [
      infoItem('Applicant Name',   d.displayName || '—'),
      infoItem('Phone',            d.phone || '—'),
      infoItem('Business Name',    det.bizName || '—'),
      infoItem('License Type',     TIER_LABELS[d.tier] || d.tier || '—'),
      infoItem('Annual Fee',       d.fee ? 'Rs. ' + Number(d.fee).toLocaleString('en-IN') : '—'),
      infoItem('Duration',         d.years ? d.years + ' Year' + (d.years > 1 ? 's' : '') : '—'),
      infoItem('State',            det.state || scale.state || '—'),
      infoItem('District',         det.district || '—'),
      infoItem('Pincode',          det.pincode || '—'),
      infoItemFull('Business Types', (d.businessTypes || []).join(', ') || '—'),
      infoItemFull('Food Types',     (d.foodTypes || []).join(', ') || '—'),
      infoItemFull('Address',        det.address || '—')
    ].join('');
  }

  function infoItem(label, value) {
    return '<div class="officer-info-item">' +
      '<span class="officer-info-item__label">' + esc(label) + '</span>' +
      '<span class="officer-info-item__value">' + esc(value) + '</span>' +
      '</div>';
  }

  function infoItemFull(label, value) {
    return '<div class="officer-info-item officer-info-item--full">' +
      '<span class="officer-info-item__label">' + esc(label) + '</span>' +
      '<span class="officer-info-item__value">' + esc(value) + '</span>' +
      '</div>';
  }

  // ── Documents tab ─────────────────────────────────────────────
  function renderDocuments(d) {
    var docs  = d.documents || {};
    var tier  = d.tier || 'basic';
    var list  = document.getElementById('documentsList');
    if (!list) return;

    var required = ['selfie'];
    if (tier !== 'temporary-basic') required.push('idProof', 'addressProof');
    if (tier === 'state' || tier === 'central') required.push('form9', 'blueprint');

    list.innerHTML = required.map(function (key) {
      var present = !!docs[key];
      return '<div class="officer-doc-item">' +
        '<div>' +
          '<div class="officer-doc-item__name">' + esc(DOC_NAMES[key] || key) + '</div>' +
          '<div class="officer-doc-item__sub">' + (present ? esc(docs[key]) : 'Not submitted') + '</div>' +
        '</div>' +
        '<span class="officer-doc-item__status officer-doc-item__status--' + (present ? 'present' : 'missing') + '">' +
          (present ? 'Uploaded' : 'Missing') +
        '</span>' +
        '</div>';
    }).join('');
  }

  // ── Audit trail tab ───────────────────────────────────────────
  function renderAudit(d) {
    var trail = d.auditTrail || [];
    var list  = document.getElementById('auditList');
    if (!list) return;

    if (!trail.length) {
      list.innerHTML = '<p class="officer-info-loading">No audit entries.</p>';
      return;
    }

    list.innerHTML = trail.slice().reverse().map(function (entry) {
      var ts = entry.timestamp ? (entry.timestamp.toDate ? formatDateTime(entry.timestamp) : new Date(entry.timestamp).toLocaleString('en-IN')) : '—';
      return '<div class="officer-audit-item">' +
        '<div class="officer-audit-item__dot"></div>' +
        '<div>' +
          '<div class="officer-audit-item__action">' + esc(entry.action) + '</div>' +
          '<div class="officer-audit-item__meta">By ' + esc(entry.by || '—') + ' &bull; ' + ts + '</div>' +
          (entry.note ? '<div class="officer-audit-item__note">' + esc(entry.note) + '</div>' : '') +
        '</div>' +
        '</div>';
    }).join('');
  }

  // ── Flags tab ─────────────────────────────────────────────────
  function renderFlags(d) {
    var flags = d.flags || [];
    var list  = document.getElementById('flagsList');
    if (!list) return;

    if (!flags.length) {
      list.innerHTML = '<p class="officer-info-loading">No flags raised.</p>';
      return;
    }

    list.innerHTML = flags.map(function (f) {
      return '<div class="officer-audit-item">' +
        '<div class="officer-audit-item__dot" style="background:#f97316"></div>' +
        '<div>' +
          '<div class="officer-audit-item__action">' + esc(f.reason) + '</div>' +
          '<div class="officer-audit-item__meta">By ' + esc(f.by || '—') + ' &bull; ' + esc(f.timestamp || '—') + '</div>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  // ── Actions panel ─────────────────────────────────────────────
  function renderActions(status) {
    var container = document.getElementById('detailActions');
    if (!container) return;

    var isFinal = (status === 'approved' || status === 'rejected');

    var btns = [];

    if (!isFinal) {
      // Advance to next step
      var nextIdx = PIPELINE_ORDER.indexOf(status) + 1;
      if (nextIdx < PIPELINE_ORDER.length && PIPELINE_ORDER[nextIdx] !== 'approved') {
        var nextStatus = PIPELINE_ORDER[nextIdx];
        btns.push(actionBtn('advance', 'Advance to ' + STATUS_LABELS[nextStatus], nextStatus));
      }

      btns.push(actionBtn('docs',   'Request Additional Documents', 'documents_requested'));
      btns.push(actionBtn('inspect','Schedule Inspection',           'inspection_scheduled'));
      btns.push(actionBtn('approve','Approve Application',           'approved'));
      btns.push(actionBtn('reject', 'Reject Application',            'rejected'));
      btns.push(actionBtn('flag',   'Flag for Review',               'flagged'));
    } else {
      container.innerHTML = '<p class="officer-info-loading">This application is ' + status + '. No further actions available.</p>';
      return;
    }

    container.innerHTML = btns.join('');

    container.querySelectorAll('.officer-action-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openActionModal(btn.getAttribute('data-action'), btn.getAttribute('data-target-status'));
      });
    });
  }

  function actionBtn(type, label, targetStatus) {
    return '<button class="officer-action-btn officer-action-btn--' + type + '" ' +
      'data-action="' + type + '" data-target-status="' + targetStatus + '">' + label + '</button>';
  }

  // ── Action modal ─────────────────────────────────────────────
  function openActionModal(action, targetStatus) {
    var LABELS = {
      advance: 'Advance Application',
      docs:    'Request Additional Documents',
      inspect: 'Schedule Inspection',
      approve: 'Approve Application',
      reject:  'Reject Application',
      flag:    'Flag for Review'
    };
    var BODIES = {
      advance: 'Move this application to the next stage in the review pipeline.',
      docs:    'Notify the applicant to submit additional documents.',
      inspect: 'Mark this application for a scheduled site inspection.',
      approve: 'Grant the food safety license for this application.',
      reject:  'Reject this application. This action cannot be undone.',
      flag:    'Flag this application for further internal review.'
    };

    document.getElementById('actionModalTitle').textContent = LABELS[action] || 'Confirm';
    document.getElementById('actionModalBody').textContent  = BODIES[action] || '';
    document.getElementById('actionModalNote').value        = '';
    document.getElementById('actionModalError').textContent = '';
    document.getElementById('actionModalOverlay').classList.add('open');

    pendingAction = { action: action, targetStatus: targetStatus };
  }

  function closeActionModal() {
    document.getElementById('actionModalOverlay').classList.remove('open');
    pendingAction = null;
  }

  function executeAction() {
    if (!pendingAction || !appData) return;

    var note         = document.getElementById('actionModalNote').value.trim();
    var confirmBtn   = document.getElementById('actionModalConfirm');
    var errEl        = document.getElementById('actionModalError');
    var action       = pendingAction.action;
    var targetStatus = pendingAction.targetStatus;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Saving...';
    errEl.textContent = '';

    var ts         = firebase.firestore.FieldValue.serverTimestamp();
    var auditEntry = {
      action:    buildAuditLabel(action),
      by:        'officer',
      timestamp: new Date().toISOString()
    };
    if (note) auditEntry.note = note;

    var update = {
      applicationStatus: targetStatus === 'flagged' ? appData.applicationStatus : targetStatus,
      updatedAt:         ts,
      auditTrail:        firebase.firestore.FieldValue.arrayUnion(auditEntry)
    };

    if (action === 'flag') {
      update.flags = firebase.firestore.FieldValue.arrayUnion({
        reason:    note || 'Flagged for review',
        by:        'officer',
        timestamp: new Date().toISOString()
      });
      delete update.applicationStatus;
    }

    // Write notification to citizen
    var db = firebase.firestore();
    var batch = db.batch();

    batch.update(db.collection('applications').doc(appId), update);

    if (appData.uid) {
      batch.set(db.collection('users').doc(appData.uid), {
        applicationStatus: targetStatus === 'flagged' ? appData.applicationStatus : targetStatus,
        updatedAt: ts
      }, { merge: true });

      var notifMsg = buildNotifMessage(action, targetStatus);
      batch.set(db.collection('notifications').doc(), {
        uid:       appData.uid,
        appId:     appId,
        message:   notifMsg,
        type:      action,
        createdAt: ts,
        read:      false
      });
    }

    batch.commit().then(function () {
      closeActionModal();
      loadApplication(); // Refresh page data
    }).catch(function (err) {
      console.error('[FOSCOS] officer action:', err);
      errEl.textContent = 'Failed to save. Please try again.';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm';
    });
  }

  function buildAuditLabel(action) {
    var map = {
      advance: 'Application advanced to next stage',
      docs:    'Additional documents requested',
      inspect: 'Inspection scheduled',
      approve: 'Application approved',
      reject:  'Application rejected',
      flag:    'Application flagged for review'
    };
    return map[action] || action;
  }

  function buildNotifMessage(action, targetStatus) {
    var map = {
      advance: 'Your application has been moved forward in the review process.',
      docs:    'Additional documents have been requested for your application. Please log in to review and upload.',
      inspect: 'A site inspection has been scheduled for your food business. An officer will contact you.',
      approve: 'Congratulations! Your food safety license application has been approved.',
      reject:  'Your food safety license application has been rejected. Please contact your local FSSAI office for details.',
      flag:    'Your application requires additional internal review. You will be contacted shortly.'
    };
    return map[action] || 'Your application status has been updated.';
  }

  // ── Tabs ──────────────────────────────────────────────────────
  function setupTabs() {
    document.querySelectorAll('.officer-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        document.querySelectorAll('.officer-tab').forEach(function (t) { t.classList.remove('active'); });
        document.querySelectorAll('.officer-tab-panel').forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var panel = document.getElementById('tab' + capitalize(target));
        if (panel) panel.classList.add('active');
      });
    });
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ── Load application ──────────────────────────────────────────
  function loadApplication() {
    firebase.firestore().collection('applications').doc(appId).get().then(function (doc) {
      if (!doc.exists) {
        document.getElementById('detailAppId').textContent = 'Application not found';
        return;
      }

      appData = doc.data();
      var status = appData.applicationStatus || 'submitted';

      setText('detailAppId', appData.appId || appId);
      renderPipeline(status);
      renderStatusBadge(status);
      renderMeta(appData);
      renderBusinessInfo(appData);
      renderDocuments(appData);
      renderAudit(appData);
      renderFlags(appData);
      renderActions(status);

    }).catch(function (err) {
      console.error('[FOSCOS] detail load:', err);
    });
  }

  // ── Utilities ─────────────────────────────────────────────────
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = String(val || ''); }

  // ── Init ──────────────────────────────────────────────────────
  document.addEventListener('officer-ready', function () {
    setupTabs();

    document.getElementById('actionModalCancel').addEventListener('click', closeActionModal);
    document.getElementById('actionModalConfirm').addEventListener('click', executeAction);
    document.getElementById('actionModalOverlay').addEventListener('click', function (e) {
      if (e.target === document.getElementById('actionModalOverlay')) closeActionModal();
    });

    if (!appId) {
      document.getElementById('detailAppId').textContent = 'Invalid application ID';
      return;
    }

    loadApplication();
  });

})();
