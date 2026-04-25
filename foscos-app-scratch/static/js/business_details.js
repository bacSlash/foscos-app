/* ============================================================
   BUSINESS_DETAILS.JS — P09 Premises details, photo upload, EXIF GPS
   ============================================================ */
(function () {
  'use strict';

  var pincodesData  = null;
  var gpsCoords     = null;
  var photoBase64   = null;  // compressed base64 JPEG stored in Firestore

  // ── Load pincodes JSON lazily ─────────────────────────────────
  function loadPincodes(cb) {
    if (pincodesData) { cb(pincodesData); return; }
    fetch('/static/data/pincodes.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { pincodesData = data; cb(data); })
      .catch(function () { cb({}); });
  }

  // ── District dropdown from known pincodes ─────────────────────
  var DISTRICTS_BY_STATE = {};

  function buildDistrictDropdown(state) {
    var sel = document.getElementById('addrDistrict');
    var prev = sel.value;
    sel.innerHTML = '<option value="">Select district</option>';

    if (!pincodesData || !state) return;

    var seen = {};
    Object.values(pincodesData).forEach(function (v) {
      if (v.state === state && !seen[v.district]) {
        seen[v.district] = true;
        var opt = document.createElement('option');
        opt.value = v.district;
        opt.textContent = v.district;
        sel.appendChild(opt);
      }
    });

    if (prev && seen[prev]) sel.value = prev;
  }

  // ── Pincode → district + state autofill ───────────────────────
  function setupPincodeAutofill() {
    var pincodeInput = document.getElementById('addrPincode');
    if (!pincodeInput) return;

    pincodeInput.addEventListener('input', function () {
      var pin = pincodeInput.value.trim();
      if (pin.length !== 6) return;

      loadPincodes(function (data) {
        var entry = data[pin];
        if (!entry) return;

        var stateInput    = document.getElementById('addrState');
        var districtInput = document.getElementById('addrDistrict');
        var cityInput     = document.getElementById('addrCity');

        if (stateInput && !stateInput.value) stateInput.value = entry.state;
        if (cityInput  && !cityInput.value)  cityInput.value  = entry.district;

        buildDistrictDropdown(entry.state);
        if (districtInput) districtInput.value = entry.district;
      });
    });

    // Also rebuild district list when state is typed manually
    document.getElementById('addrState').addEventListener('blur', function () {
      loadPincodes(function () {
        buildDistrictDropdown(document.getElementById('addrState').value);
      });
    });
  }

  // ── Photo select + compress to base64 + EXIF GPS ─────────────
  function setupPhotoUpload() {
    var input = document.getElementById('premisesPhoto');
    if (!input) return;

    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;

      // Extract GPS first (needs the raw file before canvas strips EXIF)
      if (typeof exifr !== 'undefined') {
        exifr.gps(file).then(function (pos) {
          if (pos && pos.latitude && pos.longitude) {
            gpsCoords = { lat: pos.latitude, lng: pos.longitude };
            var tag  = document.getElementById('gpsTag');
            var text = document.getElementById('gpsText');
            if (tag)  tag.style.display  = 'inline-flex';
            if (text) text.textContent   = pos.latitude.toFixed(5) + ', ' + pos.longitude.toFixed(5);
          }
        }).catch(function () {});
      }

      // Compress with canvas → base64 JPEG
      var reader = new FileReader();
      reader.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var MAX = 640;
          var w = img.width, h = img.height;
          if (w > h && w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          else if (h > MAX)     { w = Math.round(w * MAX / h); h = MAX; }

          var canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          photoBase64 = canvas.toDataURL('image/jpeg', 0.55);

          document.getElementById('photoPlaceholder').style.display = 'none';
          document.getElementById('photoPreviewArea').style.display = '';
          document.getElementById('photoPreviewImg').src            = photoBase64;
          document.getElementById('photoFileName').textContent      = file.name;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ── Show/hide PAN field based on tier ─────────────────────────
  function checkTierForPAN() {
    var user = firebase.auth().currentUser;
    if (!user) return;
    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var tier = doc.data().scale && doc.data().scale.tier;
      var taxSection = document.getElementById('taxSection');
      if (taxSection) {
        taxSection.style.display = (tier === 'state' || tier === 'central') ? '' : 'none';
      }
    });
  }

  // ── Pre-fill from Firestore ───────────────────────────────────
  function prefillFields() {
    var user = firebase.auth().currentUser;
    if (!user) return;

    // Pre-fill phone from Auth
    var phone = user.phoneNumber || '';
    var phoneInput = document.getElementById('bizPhone');
    if (phoneInput && phone && !phoneInput.value) {
      phoneInput.value = phone.replace(/^\+91/, '').trim();
    }

    // Pre-fill name from Auth
    var displayName = user.displayName || '';
    var ownerInput = document.getElementById('ownerName');
    if (ownerInput && displayName && !ownerInput.value) {
      ownerInput.value = displayName;
    }

    firebase.firestore().collection('users').doc(user.uid).get().then(function (doc) {
      if (!doc.exists) return;
      var d = doc.data().details;
      if (!d) return;

      setValue('bizName',      d.bizName);
      setValue('ownerName',    d.ownerName);
      setValue('bizPhone',     d.bizPhone);
      setValue('bizEmail',     d.bizEmail);
      setValue('addrLine1',    d.addrLine1);
      setValue('addrLine2',    d.addrLine2);
      setValue('addrPincode',  d.addrPincode);
      setValue('addrCity',     d.addrCity);
      setValue('addrState',    d.addrState);
      setValue('panNumber',    d.panNumber);
      setValue('gstNumber',    d.gstNumber);

      if (d.addrState) {
        loadPincodes(function () {
          buildDistrictDropdown(d.addrState);
          setValue('addrDistrict', d.addrDistrict);
        });
      }

      if (d.photoBase64) {
        photoBase64 = d.photoBase64;
        document.getElementById('photoPlaceholder').style.display = 'none';
        document.getElementById('photoPreviewArea').style.display = '';
        document.getElementById('photoPreviewImg').src            = d.photoBase64;
        document.getElementById('photoFileName').textContent      = 'Previously uploaded';
      }

      if (d.gps) {
        gpsCoords = d.gps;
        var tag  = document.getElementById('gpsTag');
        var text = document.getElementById('gpsText');
        if (tag)  tag.style.display  = 'inline-flex';
        if (text) text.textContent   = d.gps.lat.toFixed(5) + ', ' + d.gps.lng.toFixed(5);
      }
    });
  }

  function setValue(id, val) {
    var el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  }

  // ── Validate ───────────────────────────────────────────────────
  function validate() {
    if (!val('bizName'))    { return 'Please enter your business name.'; }
    if (!val('ownerName'))  { return 'Please enter the owner name.'; }
    var phone = document.getElementById('bizPhone').value.trim().replace(/\D/g, '');
    if (phone.length !== 10) { return 'Enter a valid 10-digit contact number.'; }
    if (!val('addrLine1'))  { return 'Please enter your street address.'; }
    if (!val('addrPincode') || document.getElementById('addrPincode').value.length !== 6) {
      return 'Enter a valid 6-digit pincode.';
    }
    if (!val('addrState'))    { return 'Please enter your state.'; }
    if (!val('addrDistrict')) { return 'Please select your district.'; }

    var taxSection = document.getElementById('taxSection');
    if (taxSection && taxSection.style.display !== 'none') {
      var pan = document.getElementById('panNumber').value.trim().toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
        return 'Enter a valid PAN number (e.g. ABCDE1234F).';
      }
    }

    return null;
  }

  function val(id) {
    var el = document.getElementById(id);
    return el && el.value.trim();
  }

  // ── Save & continue ───────────────────────────────────────────
  function saveAndContinue() {
    var err = validate();
    if (err) { document.getElementById('detailsError').textContent = err; return; }
    document.getElementById('detailsError').textContent = '';

    var user = firebase.auth().currentUser;
    if (!user) { window.location.href = '/'; return; }

    var btn = document.getElementById('detailsContinueBtn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    var data = {
      bizName:      val('bizName'),
      ownerName:    val('ownerName'),
      bizPhone:     document.getElementById('bizPhone').value.trim().replace(/\D/g, ''),
      bizEmail:     val('bizEmail') || '',
      addrLine1:    val('addrLine1'),
      addrLine2:    val('addrLine2') || '',
      addrPincode:  val('addrPincode'),
      addrCity:     val('addrCity')  || '',
      addrDistrict: val('addrDistrict') || '',
      addrState:    val('addrState'),
      photoBase64:  photoBase64 || '',
      gps:          gpsCoords || null
    };

    var taxSection = document.getElementById('taxSection');
    if (taxSection && taxSection.style.display !== 'none') {
      data.panNumber = document.getElementById('panNumber').value.trim().toUpperCase();
      data.gstNumber = document.getElementById('gstNumber').value.trim().toUpperCase() || '';
    }

    firebase.firestore().collection('users').doc(user.uid).set({
      details:   data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(function () {
      var params = new URLSearchParams(window.location.search);
      window.location.href = params.get('from') === 'review' ? '/review' : '/documents';
    })
    .catch(function (e) {
      console.error('[FOSCOS] Firestore save details:', e);
      document.getElementById('detailsError').textContent = 'Could not save. Please try again.';
      btn.disabled    = false;
      btn.textContent = 'Looks good, continue →';
    });
  }

  // ── Auth guard ────────────────────────────────────────────────
  document.addEventListener('firebase-ready', function () {
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { window.location.href = '/'; return; }
      prefillFields();
      checkTierForPAN();
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    setupPincodeAutofill();
    setupPhotoUpload();

    var btn = document.getElementById('detailsContinueBtn');
    if (btn) btn.addEventListener('click', saveAndContinue);

    var params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'review') {
      var cb = document.getElementById('detailsContinueBtn');
      if (cb) cb.textContent = 'Save & Back to Review →';
    }
  });

})();
