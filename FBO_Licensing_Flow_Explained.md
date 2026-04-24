# FoSCoS — FBO Licensing Flow: Complete Explanation

> **What is this?** FoSCoS (Food Safety Compliance System) is FSSAI's digital portal for food business operators (FBOs) to apply for and manage their food safety licenses. This document explains everything that happens once a user selects the **FBO** path — every screen, every decision, every branch.

---

## Overview: Two Parallel Tracks

When an FBO clicks "Apply / Manage License," they are immediately sorted into one of **two distinct licensing tracks** based on their estimated annual turnover:

| Track | Turnover | License Type | Fee | Timeline |
|---|---|---|---|---|
| **Temporary / Instant** | Under ₹10 Lakh/yr | Temporary → upgrades to Basic Registration | ₹0 | Immediate |
| **Permanent Application** | ₹10 L and above | Basic / State / Central | ₹100 – ₹7,500/yr | 7–30 days |

The key branch point happens on **Page 3 (Turnover Screen)**. Both tracks share Pages 1 and 2; after that they diverge completely.

---

## Entry Point: The Gateway Modal

When the site loads, a **Gateway Modal** appears automatically after ~800ms. It presents two top-level options:
- **I'm an FBO** — Start the licensing flow (this is what we're following)
- **I'm a Consumer / Officer** — Routes to a different portal

Clicking "I'm an FBO" calls `startFBOFlow()`, which closes the modal and navigates to Page 1.

There is also an alternative authenticated entry: the user can log in via mobile number + OTP first (`fbo-login-screen` → `fbo-otp-screen`), and after OTP verification they're also routed into the same flow.

---

---

# PERMANENT LICENSE TRACK
## Pages 1–7 (Main Application Flow)

A 4-step progress bar appears at the top of all flow screens, labeling the stages as: **Business Info → Details → Documents → Review & Pay**.

---

## Page 1 — Business Setup (`q-setup-screen`)
**"Tell me about your business 🍽️"**

The user selects **one or more** business types from a grid of 15 cards. Each card represents a real FBO category:

| Card | Category |
|---|---|
| 🛺 | Cart / Thela (Mobile or roadside stall) |
| 🏪 | Fixed Stall / Kiosk |
| 🍽️ | Restaurant / Café |
| 🫕 | Dhaba |
| ☁️ | Cloud Kitchen |
| 🚚 | Food Truck |
| 🥐 | Bakery |
| 🍮 | Sweet Shop / Mithai |
| 🎪 | Catering Service |
| 🏠 | Home Kitchen (Dabba/Tiffin) |
| 📦 | Packaged Food Manufacturing |
| 🏭 | Warehouse / Factory |
| 🍱 | Canteen / Mess |
| 🐾 | Pet Food Business |
| 🏬 | Wholesale / Retailer |

**Multiple selections are allowed** — a business can be both a Cloud Kitchen and a Packaged Food Manufacturer, for example.

**Backend logic:** Selections are stored in a session state object `S.setup` (an array). The "Continue" button activates only when at least one card is selected (`S.setup.length > 0`). The selected categories feed into the Review screen and eventual license category display.

**Accessibility feature:** A 🔊 "Listen" button reads the page instructions aloud (text-to-speech). This is present on every page of the flow.

**Language support:** An EN/हिंदी toggle in the nav bar switches all screen labels, headers, and button text. Available throughout the entire flow.

---

## Page 2 — Food Menu (`q-menu-screen`)
**"What kind of food do you sell? 🥘"**

The user selects **all food categories** they sell or produce from a grid of 16 food types. This is used to match them to the correct regulatory category. Options include:

Dairy & Analogues · Fats & Oils · Edible Ices · Fruits & Vegetables · Confectionery · Cereals & Grains · Bakery Products · Meat & Poultry · Fish & Seafood · Eggs & Egg Products · Sweeteners & Honey · Salts, Spices & Sauces · Special Nutritional Foods · Beverages · Ready-to-Eat Savouries · Prepared Foods · Indian Sweets & Snacks · Food Additives

**Multiple selections are allowed.** Stored in `S.menu` array. The continue button activates once at least one is selected.

**Significance of food type selection:** While not visually gatekeeping on this page, the food type data (especially "meat," "dairy") becomes critical in the **Temporary License eligibility check** later.

---

## Page 3 — Turnover Calculator (`q-turnover-screen`)
**"Help me understand your scale 📊"**

This is the **central decision engine** of the flow. The user fills in:

- **Daily earnings on a busy day** (₹)
- **Days per week** they operate
- **Months per year** they operate
- **Pan-India checkbox** — checking this auto-assigns Central License regardless of turnover

**The Turnover Calculation (`calcTurnover()`):**
```
Annual Turnover = Daily Revenue × Days/Week × 4.3 (weeks/month) × Months/Year
```
The result is displayed live as the user types, with no need to click anything.

**License Tier Determination:**
The calculated annual figure is matched against the TIERS array:

| Tier | Turnover Range | Fee | Key Note |
|---|---|---|---|
| Temporary / Basic Registration | Under ₹10 Lakh | ₹0 | Instant; auto-upgrades later |
| Basic Registration | ₹10 L – ₹1.5 Cr | ₹100/yr | Simplest permanent license |
| State License | ₹1.5 Cr – ₹20 Cr | ₹2,000/yr | State-level operations |
| Central License | Above ₹20 Cr | ₹7,500/yr | Cross-state / large operators |

If the Pan-India checkbox is ticked, `S.panIndia = true` and the system forcibly assigns **Central License** (TIERS[3]), overriding the turnover calculation.

**The Branch Point — Temporary License Hint:**
If the result is "Temporary / Basic Registration" (under ₹10 Lakh), a special green card appears:
> *"You qualify for a Temporary / Instant License! Your turnover is under ₹10 Lakh — you get an instant license today (₹0 fee). This automatically upgrades to a Basic Registration once your compliance window closes."*

Two buttons appear:
- **"⚡ Get Temp License →"** → Routes to the **Temporary License Track** (8-step sub-flow, described below)
- **"Continue with Full License"** → Stays on the Permanent Track

A reference table of all four license tiers is shown for context.

---

## Page 4 — Business Details (`details-screen`)
**"A few details about your business 📍"**

This is a two-column form collecting all business and personal information.

**Left column — Business Information:**
- Business Name (with Aadhaar/PAN name tip from "Potato" chatbot)
- Full Address (with landmark tip)
- Pincode (6-digit; used to assign regional FSSAI office and find nearby labs)
- District (dropdown: East Khasi Hills, West Khasi Hills, Ri Bhoi, Jaintia Hills, Garo Hills — pre-set for Meghalaya context)

**Left column — Business Photos:**
- Exterior photo upload (GPS metadata auto-extracted for location verification)
- Interior/kitchen photo upload

**Right column — Person in Charge:**
- Full Name
- Designation (proprietor, partner, director, etc.)
- Mobile Number (10-digit, validated)
- Aadhaar Number
- PAN Number (optional)

**Backend logic (routing):**
The "Next" button calls `detailsNext()`:
```javascript
if (S.tempFlow) { goFlow('temp-kyc-screen', 2); }
else { goFlow('documents-screen', 2); }
```
`S.tempFlow` is `true` if the Turnover page assigned the "Temporary / Basic Registration" tier but the user clicked "Continue with Full License" — in this edge case they still go through the permanent documents flow.

All fields are validated in `proceedToPayment()` — business name, address, pincode, owner name, mobile, and Aadhaar are all required.

**Potato chatbot tips:** Contextual tip bubbles appear on field focus (e.g., "Use the exact name on your Aadhaar or PAN card," "Add a nearby landmark — this helps inspectors find you faster").

---

## Page 5 — Documents (`documents-screen`)
**"Here's what we'll need from you 📁"**

Three documents are required for the Permanent Track:

| # | Document | Accepted Formats |
|---|---|---|
| 1 | Photo Identity Proof (Aadhaar, Voter ID, Passport, Driving Licence) | JPG, PNG, PDF — max 5MB |
| 2 | Proof of Possession of Premises (electricity bill, rent agreement, NOC) | JPG, PNG, PDF — max 5MB |
| 3 | Water Analysis Report (from a NABL-accredited laboratory) | PDF — max 5MB |

Each document row is an **expandable accordion** — clicking reveals accepted formats, tips, and the upload mechanism. Each row shows an "Upload" button and a "Scan" status.

**Progress tracking:** A progress bar tracks `docsCount / 3`. The system warns if fewer than 3 are uploaded before proceeding. When all 3 are uploaded, a Potato chatbot warning ("• Water Analysis Report still needed") on the Review page disappears automatically.

**"One Stop Shop" side panel:** A button opens the One Stop Shop (Page 5b), which helps the user arrange for services they need to complete their documents.

---

## Page 5b — One Stop Shop (`one-stop-screen`)
**"One Stop Shop 🛒"**

This is an optional but prominent step between Documents and Review. It's a 6-tab marketplace of services the business needs to operate compliantly:

**Tab 1 — 💧 Water Testing:**
Lists 3 nearby NABL-accredited laboratories with distance, rating, and next available slot (e.g., "Shillong Analytical Lab · 1.2 km · ⭐ 4.8 · Next: Tomorrow 9am"). User can book an appointment directly. The lab uploads the water report to the applicant's profile — the user doesn't need to do anything else.
- Cost: ₹300–₹800 depending on lab and test package.

**Tab 2 — 🩺 Medical Certificate:**
Lists nearby registered clinics for food handler health checks. The examination covers communicable disease screening, skin condition, typhoid & hepatitis, and general fitness. Certificate is valid 1 year and must be renewed annually.
- Cost: ₹150–₹400 per person.

**Tab 3 — 🔥 Fire Safety NOC:**
Links to the local fire department (Shillong Fire & Emergency Services) for an inspection request. Required for restaurants, cloud kitchens, and canteens with open-flame cooking. Shows checklist of required equipment (fire extinguisher, emergency exit, fire blanket). Valid 1–3 years.
- Cost: ₹1,000–₹5,000.

**Tab 4 — 🧰 Food Testing Kit:**
A purchasable kit (₹3,500) that lets the FBO run 11 on-site adulteration tests themselves without sending samples to a lab. Items include:
- Lactometer (milk water dilution)
- Digital probe thermometer
- Neodymium magnet (iron filings in spices/tea)
- Water test strips (pH, chlorine, hardness)
- Iodine solution 1% (starch in milk/paneer)
- Paraffin liquid (artificial dye on produce)
- Soaked lime/chuna (turmeric in rice)
- Glassware set and petri dishes
- HCl and other consumables

When "Add to Cart" is clicked, the kit is appended to the payment total and delivered with the license confirmation (5–7 working days).

**Tab 5 — 📖 User Manual:**
An interactive in-app guide for running the 11 food adulteration tests. Organized into 6 modules: Dairy, Water Quality, Grains & Rice, Sugar & Dry Spices, Fruits & Produce, Oils & Fats. Each module has step-by-step test procedures, equipment lists, and detection color guides.

**Tab 6 — 🧹 Hygiene Check Subscription:**
A recurring hygiene audit service. Pricing: ₹1,000/month or ₹9,600/year (20% savings). First inspection within 7 days of subscribing. Benefits include avoiding surprise FSSAI inspections, building a hygiene track record, displaying a verified Hygiene Badge, and priority compliance support. Cancellable with 7 days notice.

**Cart logic:** If the Food Testing Kit or Hygiene Subscription are added, a sticky cart bar appears at the bottom ("Cart updated — Food Testing Kit (₹3,500) added") with a direct "Review & Pay →" shortcut.

---

## Page 6 — Review (`review-screen`)
**"Almost there — let's review! 🎉"**

A two-column summary page. Left column shows:
- Business Type (from Page 1, editable)
- License Category (from Page 3, editable)
- Business Name (from Page 4, editable)
- Location (from Page 4, editable)
- Documents count (e.g., "2/3 uploaded," editable)

Right column shows:
- **License Duration Selector:** Pills for 1, 2, 3, 4, or 5 years. Selecting a duration multiplies the annual fee accordingly (e.g., Basic Registration at 2 years = ₹200).
- **Total Amount Display:** Live calculation showing "₹100 × 1 year = ₹100."
- **Submit & Pay button.**

**Potato AI scan warning:** If any issues are detected (e.g., Water Analysis Report not uploaded), a yellow warning banner appears: *"Potato spotted 1 thing to fix: • Water Analysis Report still needed → Fix this"*. This disappears automatically once the document is uploaded.

**Fee calculation (`updateFee()`):**
```
Total = S.tier.fee × selected_years
```
The fee total is also synced to the Payment Options screen.

---

## Page 7 — Payment Options (`payment-options-screen`)
**"Choose Payment Method 💳"**

Four payment methods, handled via the Government PayGov Gateway:
- 📱 UPI (GPay, PhonePe, Paytm, BHIM)
- 🏦 Net Banking (SBI, HDFC, ICICI, Axis)
- 💳 Debit / Credit Card (Visa, Mastercard, RuPay)
- 👛 Wallet (Paytm Wallet, Amazon Pay, Mobikwik)

The total amount is displayed (e.g., ₹100 for Basic Registration). Clicking "🔒 Pay Now" triggers a validation pass over all previous pages (business type, menu, turnover, all details fields, all 3 documents) before proceeding. Any missing information redirects the user back to the relevant page with an alert.

---

## Page 8 — Payment Processing & Confirmation (`payment-screen`)

A redirect animation simulates the PayGov gateway handoff (a progress bar fills over ~2.4 seconds). Then a success state appears:

- ✅ Check animation
- Application ID (e.g., FSSAI-2026-38642)
- License Type
- Expected Approval Date
- Amount Paid

**Post-payment options:**
- Download Receipt
- Share on WhatsApp
- Track My Application → (opens the Application Tracker)
- Go to Dashboard

---

## Post-Application: Application Tracker Dashboard

The tracker screen (`dashboard-screen`) has 4 tabs:

**Status Tab:** A timeline showing:
1. ✅ Application Submitted
2. 🔄 Under Review — Regional Office (In Progress)
3. 📅 Inspection Scheduling (Expected 22–24 March)
4. 🎉 License Issued (Expected date shown)

**Documents Tab:** Shows verification status of each uploaded document (Verified / Pending).

**Inspection Tab:** Shows what to expect from the premises visit (officer checks equipment hygiene, storage conditions; user must have original documents, clean premises, visible hand-washing station, labelled food storage). FSSAI Helpline number provided.

**FoSTaC Tab:** Offers enrollment in mandatory food safety training — online (₹200, self-paced, 4 hrs, Hindi & English) or in-person workshop (₹350, 1-day, hands-on). Lists upcoming sessions near the user's location with seat counts and registration buttons.

---
---

# TEMPORARY LICENSE TRACK
## 8-Step Sub-Flow (`tl-s1` through `tl-s8`)

This track is accessed when the user qualifies for an under-₹10 Lakh license AND clicks "⚡ Get Temp License." It is a completely separate, faster flow with its own 8-step progress bar.

The Temp License track also has a **second entry point**: a standalone "Temporary License" service card on the home page, which routes to `tl-s1` directly.

---

## TL Step 1 — Eligibility Screening (`tl-s1`)
**Purpose & food type check**

The user answers:
1. **Why do you need this license?** Two options:
   - "Starting a food business / operating regularly" → 60-day Temporary License
   - "One-time stall / event only" → 30-day Stall License (different end state)

2. **Business setup type** (vendor/cart/stall/home kitchen/tiffin/other)

3. **Annual turnover** (3 options: Under ₹12 Lakh / ₹12 L – ₹1.5 Cr / Above ₹1.5 Cr)

4. **Food types sold** (multi-select chips: same categories as the main flow)

**Eligibility logic (`tlCheckEligibility()`):**

```javascript
const highRiskFoods = ['meat', 'dairy'];
const hasHighRisk = selectedFoods.some(f => highRiskFoods.includes(f));
const overTurnover = turnover !== 'under12';

if (overTurnover) → INELIGIBLE
  Reason: "Your turnover exceeds ₹12 Lakh/year. You need a State or Central FSSAI License."

else if (hasHighRisk) → INELIGIBLE
  Reason: "Selling raw meat or unpasteurised dairy requires a higher-category license."

else → ELIGIBLE → proceed to Step 2
```

The eligibility result appears in an inline overlay on the same screen. Ineligible users are redirected to the full application path. Eligible users proceed.

**Stall vs. Business branching:** The `_tlPurpose` variable is set here (`'stall'` or `'business'`) and carried throughout all 8 steps, changing the license duration and end state.

---

## TL Step 2 — Account Creation / OTP (`tl-s2`)

The user enters their 10-digit mobile number. On submission, a 6-digit OTP is sent. The OTP boxes auto-advance focus and auto-verify when all 6 digits are entered (`tlVerifyOTP()` fires after 350ms delay). After verification, the screen shows "✅ Verified! Account created. Continuing…" and auto-advances to Step 3 after 900ms.

---

## TL Step 3 — Business Type Selection (`tl-s3`)

The user picks one business type (more focused than the permanent flow): Street Vendor / Food Cart / Fixed Stall / Home Kitchen / Tiffin Service / Other. This feeds the license card generated at Step 7. If "Other" is selected, a text field appears for free-form entry.

---

## TL Step 4 — Premises Photos (`tl-s4`)

Two photo uploads required:
1. Premises / setup photo (exterior/stall view)
2. Equipment photo (cooking/preparation area)

A progress bar tracks uploads: "0 / 2" → "1 / 2" → "2 / 2." GPS location is auto-extracted from photo metadata. The "Next" button activates once both are uploaded.

---

## TL Step 5 — KYC Documents (`tl-s5`)

Two documents required (lighter than the permanent track's 3):
1. **Identity Proof** — Aadhaar, Voter ID, Passport, or Driving Licence
2. **Establishment Proof** — Electricity bill, rent agreement, or NOC from owner

Each document row is expandable. An upload progress bar tracks "0 / 2" → "2 / 2." All 2 documents must be uploaded before "Next" is enabled.

*Note: No Water Analysis Report is required at this stage — it's deferred to post-license compliance.*

---

## TL Step 6 — Terms & Conditions (`tl-s6`)

Four checkboxes, all required:
1. Information declared is true and accurate
2. No high-risk foods (raw meat / unpasteurised dairy) will be sold
3. Acknowledgment that the license is temporary (60 or 30 days) and compliance must be completed
4. Consent to FSSAI inspection and data processing

The "Submit Application" button only activates when all 4 are checked (`tlCheckTC()`).

---

## TL Step 7 — License Issued (`tl-s7`)

The license is generated on-screen via `tlIssueLicense()`:

**License number generation:**
```javascript
const suffix = Math.floor(100000 + Math.random() * 900000); // random 6-digit number
const area = address.substring(0,3).toUpperCase(); // first 3 letters of address
const licNum = 'TL-2026-' + area + '-' + suffix;
// Example: TL-2026-SHI-847362
```

**Expiry date:**
- Business purpose: 60 days from today
- Stall purpose: 30 days from today

**`tlApplyPurpose()` — the stall/business branch:**
- If stall: title = "Your Stall License is Ready!", validity = 30 days, conversion note is hidden, "Back to Home" is shown as the end action
- If business: title = "You're authorised to operate!", validity = 60 days, conversion note is shown ("Complete compliance to convert to permanent license"), "Next Steps →" button is shown

The license card is styled as a dark green FSSAI certificate with the license number, business name, category, and validity bar. Options include Download License and Share on WhatsApp.

---

## TL Step 8 — Compliance Roadmap (`tl-s8`)
*(Business purpose only — stall users skip this)*

**"Complete your compliance 🗺️"**

A 60-day countdown banner reminds the user how long they have. Three compliance tasks shown in tabs:

**Tab 1 — 💧 Water Report:**
User must get a water potability test from a NABL-accredited lab. Two nearby labs are listed with booking buttons. The lab uploads the report directly to the profile. An "Already have a report? Upload" option is also shown. On booking/uploading: "✅ Water report submitted! Lab will upload within 48 hours."

**Tab 2 — 🎓 FoSTaC Training:**
Mandatory food safety training. Two modes:
- Online Course: ₹200, self-paced, 4 hours, Hindi & English
- In-Person Workshop: ₹350, 1-day, hands-on demos

Upcoming sessions near the user are listed. On booking: "✅ Enrolled! Training link sent to your mobile."

**Tab 3 — 🔍 Inspection:**
The user picks an available inspection slot (pre-populated dates). Submitting requests an official FSSAI food safety officer visit. On submission: "✅ Inspection booked!"

**Outcome:** When all 3 tasks are completed within the 60-day window, the Temporary License automatically upgrades to a **Basic Registration** (permanent) license with no additional fee.

---

## The FoSTaC Quiz (Temp Track — Alternate entry)

There is also an **in-app FoSTaC quiz** accessible during the Temporary License flow (from `temp-kyc-screen` → `fostac-quiz-screen`). This serves as an inline training verification:

5 multiple-choice questions on food safety basics (safe storage temperatures, hand hygiene, FIFO, expiry labels, the danger zone 5°C–60°C). Answers are revealed as correct/wrong immediately on selection. Score ≥ 4/5 = Pass.

**Scoring logic:**
```javascript
const score = QUIZ_QS.filter((q, i) => quizAnswers[i] === q.ans).length;
const pass = score >= 4;
```

Pass → "You scored X out of 5. Your food safety knowledge is verified — your Temporary License is ready!"
Fail → "Almost there — try again" (retry available).

---
---

# Supporting Features Throughout the Flow

**🥔 Potato — AI Chatbot:**
A floating chatbot (bottom-right, brown potato emoji) is available on every screen. It serves context-aware quick-reply chips based on which screen the user is on:
- On permanent license screens: "Documents needed?", "How long does approval take?", "Who needs this license?"
- On temp license screens: "Am I eligible?", "What foods can I sell?", "Restrictions?"
- On consumer screens: "Check a license?", "File a complaint?", "Is this food safe?"

The chatbot uses the Anthropic Claude API to generate responses.

**🔊 Listen / TTS:**
Each screen has a "Listen" button that reads the page title and instructions aloud using the browser's text-to-speech API.

**🎤 Voice Input:**
Microphone buttons appear next to most text input fields for voice-to-text entry.

**Language Toggle (EN / हिंदी):**
All screen labels, page headers, field labels, and button text have `data-en` and `data-hi` attributes. `setLang()` switches the entire UI language live.

---

# Full Screen-by-Screen Route Map

```
HOME SCREEN
  └── Gateway Modal → "I'm an FBO"
        ├── [Direct flow]
        │     └── Page 1: Business Setup (q-setup-screen)
        │           └── Page 2: Food Menu (q-menu-screen)
        │                 └── Page 3: Turnover Calculator (q-turnover-screen)
        │                       ├── [Turnover ≥ ₹10L OR user chooses full license]
        │                       │     └── Page 4: Details (details-screen)
        │                       │           └── Page 5: Documents (documents-screen)
        │                       │                 ├── [Optional] One Stop Shop (one-stop-screen)
        │                       │                 └── Page 6: Review (review-screen)
        │                       │                       └── Page 7: Payment Options (payment-options-screen)
        │                       │                             └── Page 8: Payment Confirmation (payment-screen)
        │                       │                                   └── Dashboard / Application Tracker
        │                       │
        │                       └── [Turnover < ₹10L AND user clicks "Get Temp License"]
        │                             └── TL Step 1: Eligibility Screening (tl-s1)
        │                                   ├── [Ineligible: high-risk food or over-turnover]
        │                                   │     └── Redirect to full application path
        │                                   │
        │                                   └── [Eligible]
        │                                         └── TL Step 2: OTP / Account (tl-s2)
        │                                               └── TL Step 3: Business Type (tl-s3)
        │                                                     └── TL Step 4: Photos (tl-s4)
        │                                                           └── TL Step 5: KYC Docs (tl-s5)
        │                                                                 └── TL Step 6: T&C (tl-s6)
        │                                                                       └── TL Step 7: License Issued (tl-s7)
        │                                                                             ├── [Stall purpose]
        │                                                                             │     └── Back to Home (license valid 30 days, no conversion)
        │                                                                             │
        │                                                                             └── [Business purpose]
        │                                                                                   └── TL Step 8: Compliance Roadmap (tl-s8)
        │                                                                                         ├── Water Lab Booking/Upload
        │                                                                                         ├── FoSTaC Training Enrollment
        │                                                                                         └── Inspection Slot Selection
        │                                                                                               └── [All 3 complete within 60 days]
        │                                                                                                     └── Auto-upgrade to Basic Registration
        │
        └── [Authenticated entry: FBO Login → OTP → same flow]
```

---

*Document generated from FoSCoS v4.1 prototype (FOSCOS_v4_1.html). All screen IDs, logic, fees, and calculations reflect the prototype as coded.*
