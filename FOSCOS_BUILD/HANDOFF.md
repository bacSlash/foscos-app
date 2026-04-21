# FoSCoS — Claude Handoff Document
**For the next Claude instance to pick up and continue exactly where we left off.**

---

## What This Project Is

A full-stack clone of the Indian government FSSAI food safety licensing portal (**FoSCoS**). Two portals:
1. **Citizen app** (`frontend/citizen.html`) — FBO license applications, temp licenses, consumer corner, agent portal
2. **Officer portal** (`frontend/officer.html`) — Officer dashboard, document review, grievance management

**Tech stack:** FastAPI (Python) backend · Firebase Phone Auth (real OTP) · Supabase (Postgres + Storage + Realtime) · Vanilla HTML/CSS/JS frontend (no React, no build step)

**Full spec is at:** `FOSCOS_SPEC.md` — read it entirely before writing any code.

---

## Project Root

```
/Users/rhea/Desktop/foscos-app/reference/.claude/worktrees/musing-mestorf-8440ee/
```

All paths below are relative to this root.

---

## Credentials (already configured — DO NOT change)

### Firebase
```js
const firebaseConfig = {
  apiKey: "AIzaSyAp-hjih0BuNV2sFX0czD5KJQwYHPJdQ_Q",
  authDomain: "foscos-6fd49.firebaseapp.com",
  projectId: "foscos-6fd49",
  storageBucket: "foscos-6fd49.firebasestorage.app",
  messagingSenderId: "518312778452",
  appId: "1:518312778452:web:98f0922534fb8073803941",
  measurementId: "G-3ZCQ9MRG5Z"
};
```
- Firebase SDK version: **12.12.0** (modular, ES module import from gstatic CDN)
- Phone Auth is enabled in the Firebase console
- Use `RecaptchaVerifier` + `signInWithPhoneNumber` for OTP

### Supabase
```
Project URL:       https://vckpyguhikgchcmsgbnq.supabase.co
Anon public key:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja3B5Z3VoaWtnY2hjbXNnYm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODI1MzMsImV4cCI6MjA5MjA1ODUzM30.shTGqyhuSyRpekEDbG5CW2vKqFf4HAtAgAarStbwxP0
Service role key:  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja3B5Z3VoaWtnY2hjbXNnYm5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ4MjUzMywiZXhwIjoyMDkyMDU4NTMzfQ.ojtD5otJgyOn2iLj3-Ts6GrDODdFltebgPR3Go9_PUQ
```
- Supabase JS v2 loaded via UMD CDN in HTML files
- Storage bucket: `documents` (must be created as Private in Supabase dashboard)
- Realtime enabled on `documents` and `applications` tables

### Environment file
`.env` already exists at project root. `.env.example` has all keys documented.
The `backend/firebase-service-account.json` file needs to be downloaded from Firebase Console → Project Settings → Service Accounts → Generate new private key. **It does not exist yet** — the backend will run in mock mode without it (OTP verification skipped).

---

## What Is COMPLETE ✅

### Backend (100% done)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app entry point. Serves `/` → citizen.html, `/officer` → officer.html, mounts all routers |
| `requirements.txt` | fastapi, uvicorn, firebase-admin, supabase, python-dotenv, python-multipart, pydantic, httpx |
| `backend/config.py` | Loads all env vars, exposes FIREBASE_WEB_CONFIG dict |
| `backend/firebase_auth.py` | `init_firebase()` + `verify_token(id_token)` — verifies Firebase JWT |
| `backend/database.py` | `get_db()` → Supabase service-role client singleton |
| `backend/routes/auth.py` | `POST /api/auth/verify` (upsert user after OTP), `GET /api/auth/me` |
| `backend/routes/applications.py` | `POST /api/applications`, `GET /api/applications`, `GET /api/applications/{id}`, `POST /api/applications/{app_id}/documents/{doc_id}/upload` (real file upload to Supabase Storage) |
| `backend/routes/officer.py` | `GET /api/officer/applications`, `PATCH /api/officer/applications/{id}/status`, `PATCH /api/officer/documents/{doc_id}/review` (triggers Realtime), `GET /api/officer/documents/{doc_id}/signed-url`, `GET /api/officer/grievances`, `GET /api/officer/stats` |
| `backend/routes/consumers.py` | `GET /api/fbo/search`, `POST /api/grievances`, `GET /api/grievances/my` |
| `backend/routes/dashboard.py` | `GET /api/dashboard` — returns user + licenses + applications + agent clients |
| `supabase/schema.sql` | Full DB schema: users, applications, documents, licenses, grievances, agent_clients, inspections + RLS + storage policies |

**To start the backend:**
```bash
cd /Users/rhea/Desktop/foscos-app/reference/.claude/worktrees/musing-mestorf-8440ee
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Build System
| File | Purpose |
|------|---------|
| `build.py` | Concatenates all `parts/citizen/*.html` → `frontend/citizen.html` and `parts/officer/*.html` → `frontend/officer.html` |
| `BUILD_STATUS.md` | Tracks which parts are done (update this as you write each part) |

**To build after writing parts:**
```bash
python build.py
```

### Citizen HTML Parts (parts/citizen/) — 9 of 12 done
| File | Lines | Status | Contents |
|------|-------|--------|---------|
| `01_head.html` | 328 | ✅ DONE | DOCTYPE, head, Google Fonts, ALL CSS (design tokens, all component styles, responsive) |
| `02_global_ui.html` | 116 | ✅ DONE | 4-step progress bar, 8-step TL progress bar, Gateway modal, Potato chatbot, reCAPTCHA containers |
| `03_home.html` | 178 | ✅ DONE | home-screen: hero section, animated stats, services grid (5 cards), updates section, testimonials, footer |
| `04_auth.html` | 141 | ✅ DONE | login-screen, otp-screen, fbo-login-screen, fbo-otp-screen |
| `05_flow1_setup.html` | 227 | ✅ DONE | license-choice-screen, q-setup-screen (14 KOB cards), q-menu-screen (15 food cards), q-turnover-screen (calculator + tier table) |
| `06_flow2_details_docs.html` | 212 | ✅ DONE | details-screen (business info + person in charge + license duration), documents-screen (accordion upload rows + geotagged photos + geo-confirm banner) |
| `07_flow3_oss_review_payment.html` | 281 | ✅ DONE | one-stop-screen (vertical tab OSS, all 8 tabs, cart bar), review-screen (summary + fee breakdown), payment-options-screen (4 methods), payment-screen (progress animation + success state) |
| `08_dashboard_tracker.html` | 298 | ✅ DONE | dashboard-screen (State A active + State B pending, action grid, sidebar tabs, FoSTaC, consumer feedback), tracker-screen (4 tabs, pipeline visual), annual-return-screen, my-tl-screen, fostac-quiz-screen |
| `09_temp_license.html` | 344 | ✅ DONE | tl-s1 (eligibility), tl-purpose, tl-s2 (OTP), tl-s3 (details), tl-s4 (geotagged photos), tl-s5 (KYC), tl-s6 (disclaimer + payment), tl-s7 (license issued + countdown), tl-s8 (FoSTaC) |

---

## What Is MISSING ❌ — The Next Claude Must Write These

### MISSING: parts/citizen/10_consumer.html
Screens to include:
- `cc-search` — Consumer Corner search page. Tabs: Nearby / Search / Track Complaints / Report Unlicensed. 4 sample FBO cards (Annapurna Catering, Raj Snacks Corner, Meera Tiffin Service, Fresh Juice Hub). Click FBO → goes to cc-grievance.
- `cc-grievance` — Rate & Report screen. 3 range sliders (1-5) for Food Quality / Hygiene / Premises. Overall score computed. If any ≤ 2 → show issue checklist. Text area for comments. Submit → POST /api/grievances → showScreen('cc-submit').
- `cc-submit` — Success confirmation. Complaint ID, Filed On, Status badge, Expected Response. Buttons: Track Status → cc-track, Back → home.
- `cc-track` — Track Complaints. List with status progress bars (Submitted → Under Review → Resolved).
- `cc-report` — Report Unlicensed Business. Form: business name, location + GPS button, description, photo upload. Red Submit Report button.

### MISSING: parts/citizen/11_agent.html
Screens to include:
- `agent-login-screen` — Mobile input → OTP
- `agent-otp-screen` — 6-box OTP entry
- `agent-dashboard` — 4 stat cards (Total Clients, Pending, Active Licenses, Renewals Due) + client list table (Name, Business, License Type, Status, Expiry, Action)
- `agent-add-client` — Two sel-cards: Link Existing Client vs Create New Client
- `agent-claim-otp` — Mobile input for client OTP claim → verify → success
- `agent-client-view` — License card for client + action grid (Track / Renew / Modify / New Application / Annual Return / One Stop Shop)

### MISSING: parts/citizen/12_script.html ← THIS IS THE MOST CRITICAL PART
This is the entire `<script type="module">` block + closing `</body></html>`. It must contain:

#### Firebase initialization
```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAp-hjih0BuNV2sFX0czD5KJQwYHPJdQ_Q",
  authDomain: "foscos-6fd49.firebaseapp.com",
  projectId: "foscos-6fd49",
  storageBucket: "foscos-6fd49.firebasestorage.app",
  messagingSenderId: "518312778452",
  appId: "1:518312778452:web:98f0922534fb8073803941",
  measurementId: "G-3ZCQ9MRG5Z"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
```

#### Supabase initialization (Supabase UMD is loaded via script tag BEFORE the module)
```html
<!-- Add this BEFORE the module script, in 11_agent.html closing or a separate tag -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```
```js
// Inside the module:
const SUPABASE_URL = 'https://vckpyguhikgchcmsgbnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja3B5Z3VoaWtnY2hjbXNnYm5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0ODI1MzMsImV4cCI6MjA5MjA1ODUzM30.shTGqyhuSyRpekEDbG5CW2vKqFf4HAtAgAarStbwxP0';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

#### State objects
```js
const S = {
  setup: [], menu: [], annual: null, tier: null, duration: 1,
  details: {}, docs: {}, photos: {}, locationConfirmed: false,
  cart: [], paymentIncomplete: false,
  appId: null,      // UUID from DB after createApplication()
  docRows: [],      // document rows from DB [{id, doc_key, doc_label, status, officer_note}]
};

const TLData = { name:'', mobile:'', pincode:'', area:'', bizName:'', bizType:'', geoTagged:false, docs:{} };

let _currentRole = 'fbo';
let _loginRole = 'fbo';
let _fboMode = false;
let _tlPurpose = 'stall';
let _tlEligSetup = '';
let _tlEligFoods = [];
let _selectedPayMethod = null;
let dbUser = null;         // user record from Supabase (after auth)
let _currentAppId = null;  // active application UUID
let _realtimeChannel = null;
let _dailyCustomers = 50;
let _avgSpend = 150;
```

#### ALL functions the HTML onclick attributes call — these MUST all be implemented:

**Navigation:**
- `showScreen(id)` — hide all .screen, show #id .screen, scroll top, hide/show progress bars, update Potato chips, close potato window
- `goFlow(id, step)` — showScreen(id) + updateProgress(step)
- `updateProgress(n)` — set prog-item classes: done for <n, active for n, none for >n; also update prog-line colors
- `tlGo(step)` — map step number to tl-s screen IDs, call showScreen + tlSetProgress
- `tlSetProgress(n)` — set tl-prog-step classes
- `tlShowBar()` / `tlHideBar()` — show/hide #tl-progress-bar
- `showTracker()` — showScreen('tracker-screen') + load tracker data from DB + subscribe realtime
- `openOneStopShop()` — showScreen('one-stop-screen') with kit tab active
- `openGatewayModal()` / `closeGatewayModal()` / `closeGatewayModalBg(e)`
- `startFBOGateway()` — set _fboMode=true, showScreen('fbo-login-screen')
- `startFBOFlow()` — goFlow('q-setup-screen', 0)
- `startTempLicense()` — showScreen('tl-s1'), tlShowBar(), tlSetProgress(0)

**Auth — Firebase OTP:**
- `goToFBOOTP()` — validate mobile, init RecaptchaVerifier on 'recaptcha-container', call signInWithPhoneNumber(auth, '+91'+mobile, verifier), store confirmationResult, show fbo-otp-screen
- `verifyFBOOTP()` — collect fo1-fo5 values, call confirmationResult.confirm(otp), get idToken, POST /api/auth/verify {id_token, role:'fbo'}, store token + user in localStorage, showScreen('license-choice-screen')
- `sendLoginOTP()` / `verifyLoginOTP()` — same pattern, routes to dashboard/cc-search/agent-dashboard by _loginRole
- `sendTLOTP()` / `verifyTLOTP()` — same pattern for temp license flow, 6-box OTP
- `sendAgentOTP()` / `verifyAgentOTP()` — same pattern, routes to agent-dashboard
- `authFetch(url, opts)` — helper: adds Authorization: Bearer {token from localStorage} header

**Flow state & UI:**
- `selectLoginRole(role, el)` — set _loginRole, mark el selected, show #login-mobile-step
- `selectLicenseChoice(type, el)` — mark el selected; if 'permanent' → goFlow('q-setup-screen',0); if 'temp' → startTempLicense()
- `toggleKOB(el, kobCode)` — toggle .selected on el, push/remove kobCode from S.setup, enable/disable #kob-continue-btn
- `toggleFood(el, key)` — toggle .sel on el, push/remove from S.menu
- `adjustCounter(id, delta)` — adjust _dailyCustomers or _avgSpend, update display
- `calcTurnover()` — compute annual = _dailyCustomers * _avgSpend * 365, show #turnover-result, set tier in S.tier, show/hide #temp-hint, enable #turnover-continue-btn
- `proceedFromTurnover()` — set S.annual, S.tier, show PAN field if state/central, goFlow('details-screen',1)
- `onIDTypeChange(type)` — show #d-id-number-row with correct label/maxlength per ID type
- `onPincodeInput(el)` — if 6 digits, lookup from PINCODE_MAP, set state/district fields
- `setDurationFromSelect(yr)` — set S.duration, call updateFee()
- `updateFee()` — S.tier.fee * S.duration, update #fee-total and duration options text
- `validateAndGoDocuments()` — validate all details fields, if valid: call createApplication() (POST /api/applications), then goFlow('documents-screen',2)
- `createApplication()` — async, POST to /api/applications with S data, save response.id to _currentAppId, save docRows to S.docRows, call renderDocList(), subscribe realtime

**Documents:**
- `renderDocList()` — populate #doc-list with accordion rows for each doc in S.docRows. Each row has data-doc-id attribute, status badge, upload button, officer-note div
- `toggleDocRow(el)` — toggle .open on parent .doc-row
- `uploadDoc(docId, file)` — POST to /api/applications/{_currentAppId}/documents/{docId}/upload as FormData, show progress, on success update badge to status-pending "Uploaded — Pending Review"
- `uploadPhoto(type, input)` — simulate geo-tag, show #geo-confirm banner, update #photo-{type}-box
- `confirmLocation()` / `editLocation()` / `saveManualLocation()`
- `updateDocProgress()` — count uploaded docs, update #doc-count, #doc-progress-fill width
- `subscribeToDocumentUpdates(appId)` — supabaseClient.channel().on('postgres_changes' ...) → updateDocumentStatusUI()
- `updateDocumentStatusUI(docId, status, note)` — find [data-doc-id=docId], update badge class/text, show/hide officer-note

**OSS:**
- `ossTab(tab, btn)` — hide all .oss-tab-rail buttons active class, show #oss-{tab} pane
- `bookLab(i)` — add .booked class to #lab-{i}, change button text
- `ossAddCart(name, price)` — push to S.cart, call updateOSSCart()
- `updateOSSCart()` — update #oss-cart-items and #oss-cart-total, show #oss-cart-bar
- `ossDownloadManual()` — change button text to "⏳ Downloading..." then "✅ Downloaded"

**Review & Payment:**
- `renderReview()` — called when review-screen shown, populate #review-fields with all S data, populate #review-fee-rows, update #review-grand-total
- `previewApplication()` — show #preview-msg
- `selectPayment(method, el)` — toggle .selected on pay cards, set _selectedPayMethod
- `proceedToPayment()` — validate _selectedPayMethod, start payment animation: set progress bar to 100% over 2.2s, then show #payment-success, set #success-app-id, #success-license-type, #success-amount from S
- `updatePaymentDisplay()` — set #payment-total-display from S total

**Dashboard:**
- `loadDashboard()` — called on showScreen('dashboard-screen'), GET /api/dashboard, populate dashboard with real data (show state-a or state-b based on licenses array), subscribe to app realtime if pending
- `sidebarTab(tab, btn)` — show/hide sidebar tab content
- `enrollFoSTaC(type)` — show #fostac-enrolled-msg / #fostac-tracker-msg

**Tracker:**
- `switchTrackerTab(tab, btn)` — switch tracker tab panes
- `loadTrackerFromDB(appId)` — GET /api/applications/{appId}, populate tracker doc list in #tracker-doc-list, subscribe realtime

**Temp License flow:**
- `tlSelectSetup(type, el)` — set _tlEligSetup, mark selected, show #tl-turnover-q if 'permanent', show #tl-food-q otherwise
- `tlSelectTurnover(type, el)` — mark selected
- `toggleTLFood(el, key)` — toggle food card, push to _tlEligFoods
- `tlHighRisk(el)` — flash red border briefly, show tooltip
- `tlCheckEligibility()` — logic: if high-risk food → show #tl-ineligible; if turnover 12to20 or above20 → show #tl-ineligible; else → show #tl-eligible, after 1.5s → showScreen('tl-purpose')
- `tlSelectPurpose(type, el)` — set _tlPurpose, mark selected, enable #tl-purpose-btn
- `tlValidateAndGo(step)` — validate fields for current step, tlGo(step)
- `tlUploadPhoto(num, input)` — update UI, increment photo count, update progress bar
- `tlUploadDoc(num, input)` — update badge, increment doc count
- `tlProceedAfterDisclaimer()` — check all 3 checkboxes ticked, if ok → tlGo(7), generate TL license number (TL-{year}-{5digits}), set license card values, set expiry (+30d stall, +60d business), start countdown
- `tlEnrollFostac()` — show #tl8-enrolled-msg
- `tlFinish()` — showScreen('dashboard-screen'), set hasTempLicense=true, show #dash-temp-card
- `startTLCountdown(expiryDate)` — setInterval every second, update #tl7-countdown and #mytl-days

**Consumer:**
- `ccSubmitGrievance()` — collect slider values + issues + comments, POST /api/grievances, showScreen('cc-submit'), set complaint ID
- `loadMyGrievances()` — GET /api/grievances/my, render list in cc-track

**Agent:**
- `agentCreateClient(name, biz)` — POST /api/agent/clients (not yet in backend — add simple upsert), add to client table
- `loadAgentDashboard()` — GET /api/dashboard, render client table

**Utility:**
- `setLang(lang, btn)` — toggle pill-btn active, querySelectorAll('[data-en]') → set textContent from data-en or data-hi
- `speak(text)` — window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
- `togglePotato()` — toggle .open on #potato-window
- `potatoSend(msg)` — append user + bot messages to #potato-msgs, match against POTATO_REPLIES map
- `updatePotatoChips(screenId)` — change chip buttons based on current screen
- `animateStats()` — IntersectionObserver on #stats-section, count up .stat-count elements using requestAnimationFrame
- `realTimeClock()` — setInterval 1000ms, update [data-time] and [data-date] elements
- `otpAdvance(el, nextId)` — focus nextId if value entered
- `otpBack(event, el, prevId)` — focus prevId on Backspace if empty
- `buildOTPBoxes(containerId, count)` — generate OTP input boxes dynamically
- `toggleDocRow(headEl)` — toggle .open on parent .doc-row
- `sidebarTab(tab, btn)` — toggle sidebar panels

**Potato reply map:**
```js
const POTATO_REPLIES = {
  'license': 'For basic registration (under ₹12L turnover), the fee is ₹100/year...',
  'fee': 'Basic Registration: ₹100/yr · State License: ₹2,000–₹5,000/yr · Central: ₹7,500/yr',
  'documents': 'You need: Photo ID, Address Proof, and List of Food Items for Basic Registration.',
  'time': 'Basic Registration is typically approved within 30 days. Instant Temp License is issued same day!',
  'temp': 'Instant Temporary License is for businesses with turnover under ₹12 Lakh. Valid 30-60 days.',
  // add more keyword matches
};
```

**Pincode lookup map (partial — expand as needed):**
```js
const PINCODE_MAP = {
  '793001': { area: 'Laitumkhrah', city: 'Shillong', state: 'Meghalaya', district: 'East Khasi Hills' },
  '110001': { area: 'Connaught Place', city: 'New Delhi', state: 'Delhi', district: 'Central Delhi' },
  '400001': { area: 'Fort', city: 'Mumbai', state: 'Maharashtra', district: 'Mumbai City' },
  // ... add 20+ more major pincodes
};
```

**On page load (at bottom of script):**
```js
// Init clock
realTimeClock();
setInterval(realTimeClock, 1000);

// Animate stats on scroll
animateStats();

// Auto-open gateway modal after 800ms
setTimeout(openGatewayModal, 800);

// Check if user already logged in
const storedToken = localStorage.getItem('foscos_token');
const storedUser = localStorage.getItem('foscos_user');
if (storedToken && storedUser) {
  dbUser = JSON.parse(storedUser);
  // Pre-fill mobile if available
}

// Pre-fill OTP boxes for login screen based on role
```

---

### MISSING: All officer HTML parts (parts/officer/)

| File | Contents |
|------|---------|
| `01_head.html` | DOCTYPE, head, CSS for officer portal (same design tokens, different layout styles: sidebar, topbar, two-pane) |
| `02_layout.html` | Officer login page (phone OTP, separate from citizen), sidebar nav, topbar, notifications side panel, flag modal, assign inspection modal |
| `03_pages_dashboard_queue.html` | page-dashboard (Today's Actions, 4-stat row, activity feed, bar chart, risk by zone), page-myqueue (3 tabs) |
| `04_pages_applications.html` | page-applications (filter tabs, search, table), app-detail overlay (5-step pipeline, 4 tabs, document review UI with Approve/Flag buttons), FBO profile page |
| `05_pages_fbo_monitoring.html` | page-fbo (search + table + FBO profile), page-monitoring (two-pane), page-inspections |
| `06_pages_grievances_league_reports.html` | page-grievances, page-league (leaderboard), page-reports (5 report cards), page-settings |
| `07_script.html` | Firebase init (same config) + Supabase init, officer auth flow, all JS functions, closing tags |

**Officer JS critical functions:**
- `navigate(page)` — activate page, update sidebar, update topbar title
- `loadOfficerDashboard()` — GET /api/officer/stats, render
- `loadApplications(filter)` — GET /api/officer/applications?status=filter, render table
- `openAppDetail(appId)` — GET /api/officer/applications/{id}, render overlay with all tabs. Subscribe to realtime for doc changes
- `reviewDocument(docId, status, note)` — PATCH /api/officer/documents/{docId}/review. This triggers Supabase Realtime → citizen frontend sees update
- `getSignedURL(docId)` — GET /api/officer/documents/{docId}/signed-url → open in new tab
- `updateAppStatus(appId, status)` — PATCH /api/officer/applications/{id}/status
- `loadGrievances(filter)` — GET /api/officer/grievances?status=filter
- `resolveGrievance(id)` — PATCH /api/officer/grievances/{id}
- `showToast(msg)` — bottom toast, auto-hide 2.5s
- `openNotifPanel()` / `closePanel()`
- `authFetch(url, opts)` — adds Authorization header using localStorage officer_token
- Officer Firebase OTP: same pattern as citizen but stores token as 'officer_token', routes to officer portal on success

**Officer sample fixture data (use when DB is empty):**
```js
const SAMPLE_APPS = [
  {id:'app-001', app_number:'FSSAI-2026-38642', name:'Annapurna Catering', cat:'State License', date:'2026-03-12', status:'under_review', step:3, flagged:false},
  {id:'app-002', app_number:'FSSAI-2026-12891', name:'Raj Snacks Corner', cat:'Basic Registration', date:'2026-03-18', status:'docs_review', step:2, flagged:true, flagReason:'Water test report unclear'},
  {id:'app-003', app_number:'FSSAI-2026-55021', name:'Meera Tiffin Service', cat:'State License', date:'2026-03-20', status:'submitted', step:1, flagged:false},
  {id:'app-004', app_number:'FSSAI-2026-77103', name:'Fresh Juice Hub', cat:'Basic Registration', date:'2026-03-22', status:'approved', step:5, flagged:false},
  {id:'app-005', app_number:'FSSAI-2026-33910', name:'Spice Garden Restaurant', cat:'State License', date:'2026-03-25', status:'submitted', step:1, flagged:false},
  {id:'app-006', app_number:'FSSAI-2026-44201', name:'Mountain Bakery', cat:'Basic Registration', date:'2026-03-28', status:'docs_review', step:2, flagged:false},
];

const SAMPLE_FBOS = [
  {fssai:'2026 0303 1083 8642', name:'Annapurna Catering', type:'Restaurant', loc:'Shillong', emoji:'🍽️', compliance:'High', risk:'Low', expiry:'2027-03-12', ratings:{zomato:4.2,swiggy:4.0,google:4.5}},
  {fssai:'2024 1201 5842 1109', name:'Raj Snacks Corner', type:'Basic Reg', loc:'Shillong', emoji:'🥙', compliance:'Medium', risk:'Medium', expiry:'2026-12-01', ratings:{zomato:4.5,swiggy:4.3,google:4.1}},
  {fssai:'2025 0606 2291 4403', name:'Meera Tiffin', type:'State License', loc:'Shillong', emoji:'🍱', compliance:'High', risk:'Low', expiry:'2027-06-06', ratings:{zomato:3.9,swiggy:4.1,google:3.8}},
];

const SAMPLE_GRIEVANCES = [
  {id:'grv-001', complaint_id:'GRV-2026-00142', fbo_name:'Raj Snacks Corner', issue:'Foreign object found in food', priority:'critical', status:'submitted', filed:'2026-03-20'},
  {id:'grv-002', complaint_id:'GRV-2026-00139', fbo_name:'Annapurna Catering', issue:'Hygiene concerns', priority:'high', status:'under_review', filed:'2026-03-18'},
];
```

---

## Hero Image

The user provided a food market photo (Indian street food stall with bowls of lentils, jars of pickles).
Save it at: `static/images/hero.jpg`
The citizen HTML references it at `/static/images/hero.jpg`.
**The image file needs to be saved manually by the user** — Claude cannot do this. Tell the user:
> "Please save the hero image you provided to: `static/images/hero.jpg` inside the project root."

---

## Exact Steps for Next Claude

### Step 1 — Read these files first (in this order):
1. `HANDOFF.md` (this file) — complete context
2. `FOSCOS_SPEC.md` — the full design specification
3. `parts/citizen/01_head.html` — understand CSS patterns used
4. `parts/citizen/12_script.html` does not exist yet — you will create it

### Step 2 — Write parts/citizen/10_consumer.html
Contains screens: cc-search, cc-grievance, cc-submit, cc-track, cc-report
Follow the same HTML pattern as existing parts (no doctype/html/body tags — those are only in 01 and 12).

### Step 3 — Write parts/citizen/11_agent.html
Contains screens: agent-login-screen, agent-otp-screen, agent-dashboard, agent-add-client, agent-claim-otp, agent-client-view
Add the Supabase UMD script tag at the END of this file:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
```

### Step 4 — Write parts/citizen/12_script.html (LARGEST, most critical)
This is `<script type="module">` ... `</script></body></html>`.
Implement ALL functions listed in the "MISSING" section above.
The file should end with `</body></html>`.

### Step 5 — Run build.py
```bash
python build.py
```
This produces `frontend/citizen.html`. Check the output — it should say "12 parts" assembled.

### Step 6 — Write all 7 officer parts (parts/officer/01 through 07)
Follow the same chunked pattern. The officer portal is a two-pane layout (fixed 240px sidebar + main content). Officer login is a full-page screen shown before the portal.

### Step 7 — Run build.py again
Check `frontend/officer.html` is assembled from 7 parts.

### Step 8 — Test
```bash
uvicorn main:app --reload
```
Open http://localhost:8000 → citizen app
Open http://localhost:8000/officer → officer portal

### Step 9 — Create static/images/ directory and tell user to save hero image
```bash
mkdir -p static/images
```

---

## Architecture Reminders

- **All onclick= handlers in HTML call window.* functions** — in the ES module script, expose everything: `window.showScreen = showScreen`, etc.
- **Screens:** `<div class="screen" id="...">` — only one has `.active` at a time. `showScreen()` handles all visibility.
- **Progress bar:** shown only on flow screens (q-setup → payment). Hidden on home/dashboard/consumer/agent/TL screens. TL progress bar is separate and shown only during temp license flow.
- **Supabase Realtime pattern:** citizen subscribes to document changes for their app → officer's PATCH to /api/officer/documents/{id}/review updates the DB → Supabase broadcasts the change → citizen's UI updates in real-time (no refresh).
- **Firebase OTP:** Each send-OTP call needs a fresh RecaptchaVerifier. Store `window.confirmationResult` from `signInWithPhoneNumber()`. Call `.confirm(otp)` to verify.
- **No React, no build tools** for the frontend. Pure HTML/CSS/JS.
- **`build.py`** is the only "build" step — it's just file concatenation.

---

## Files the Next Claude Should NOT touch
- `backend/` — all done ✅
- `main.py` — done ✅
- `supabase/schema.sql` — done ✅
- `parts/citizen/01_head.html` through `09_temp_license.html` — done ✅
- `.env` — already configured ✅
- `requirements.txt` — done ✅

---

## Quick Reference: Screen IDs
```
home-screen, login-screen, otp-screen, fbo-login-screen, fbo-otp-screen,
license-choice-screen, q-setup-screen, q-menu-screen, q-turnover-screen,
details-screen, documents-screen, one-stop-screen, review-screen,
payment-options-screen, payment-screen, dashboard-screen, tracker-screen,
annual-return-screen, my-tl-screen, tl-s1, tl-purpose, tl-s2, tl-s3,
tl-s4, tl-s5, tl-s6, tl-s7, tl-s8,
cc-search, cc-grievance, cc-submit, cc-track, cc-report,
agent-login-screen, agent-otp-screen, agent-dashboard, agent-add-client,
agent-claim-otp, agent-client-view, fostac-quiz-screen
```

## Quick Reference: API Endpoints
```
GET  /api/config                              → Firebase + Supabase public config
POST /api/auth/verify                         → {id_token, role} → upsert user
GET  /api/auth/me                             → current user (Bearer token)
POST /api/applications                        → create application + seed doc rows
GET  /api/applications                        → list user's applications
GET  /api/applications/{id}                   → single application with docs
POST /api/applications/{id}/documents/{docId}/upload → upload file to Supabase Storage
GET  /api/dashboard                           → user + licenses + applications + clients
GET  /api/fbo/search?q=                       → search FBO licenses
POST /api/grievances                          → submit consumer grievance
GET  /api/grievances/my                       → user's grievances
GET  /api/officer/applications?status=        → all applications (officer only)
GET  /api/officer/applications/{id}           → detail with docs
PATCH /api/officer/applications/{id}/status   → {status}
PATCH /api/officer/documents/{id}/review      → {status, officer_note} ← triggers Realtime
GET  /api/officer/documents/{id}/signed-url   → temporary view URL
GET  /api/officer/grievances?status=          → all grievances
PATCH /api/officer/grievances/{id}            → {status, priority}
GET  /api/officer/stats                       → 4 dashboard numbers
```
