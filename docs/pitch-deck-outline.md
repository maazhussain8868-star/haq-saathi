# Haq Saathi: 6-Slide Pitch Deck Outline
> **Tagline:** Turning any Indian grievance into the right forum, a cited draft, and a statutory deadline in 60 seconds.

---

### Slide 1: The Problem — Why Citizen Grievances Fail Before They Start
- **Headline:** 85% of Indian Citizen Grievances Are Screened Out at the Front Door.
- **Data Points:**
  - **RBI Annual Report 2024–25:** The Centralized Receipt and Processing Centre (CRPC) received **9,11,384 complaints** and closed **7,76,336 (85.2%)** at initial screening as non-complaints or non-maintainable.
  - **PMFBY Crop Insurance:** Farmers lose individual claims if not intimated within **72 hours** of localized hailstorm or inundation.
  - **MSME Cashflow Crisis:** Micro & small enterprises endure >60 day payment delays, unaware of statutory compound interest at 3x bank rate and s.43B(h) buyer tax disallowances.
  - **The Gap:** Citizens lack early-stage triage to detect defective complaints before filing.

---

### Slide 2: The Solution — Haq Saathi (हक साथी)
- **Headline:** A Deterministic Pre-Flight Rules Engine for Citizen Grievance Redressal.
- **Value Proposition:**
  - **Cross-Regulator Coverage:** Not just consumer helpline; spans Banking, PMFBY Agriculture, MSME, Police BNSS, and Legal Aid.
  - **Pre-Flight Screening:** Filters maintainability defects *before* filing (catches missing 30-day bank notice, CPA pecuniary thresholds, and police ladders).
  - **Citations + Statutory Tracker:** Delivers bilingual cited complaint petitions, RFC 5545 calendar reminders, and pure PDF 1.4 exports.

---

### Slide 3: The Product in Action — Three Personas in 90 Seconds
- **Headline:** One Deterministic Rules Engine, From Farmer to Startup.
- **Persona 1: The Farmer (PMFBY Hailstorm Loss)**
  - Calamity intimation countdown timer (hours remaining of 72h).
  - Directs to toll-free Helpline 14447 + Crop Insurance app.
- **Persona 2: Rural Woman (Section 12 Free Legal Aid)**
  - Validates statutory qualification under s.12 Legal Services Authorities Act (zero income ceiling).
  - Direct handoff to NALSA 15100 and Tele-Law video consultation.
- **Persona 3: IT Startup Founder (MSME Overdue Invoice)**
  - Computes compound interest with monthly rests at 3x RBI bank rate.
  - Formulates statutory demand notice with Section 43B(h) buyer tax penalty.

---

### Slide 4: Technical Architecture — Zero LLM in Legal Decisions
- **Headline:** Legal Decisions Live in Code, Not Black-Box Prompts.
- **Architecture Highlights:**
  - **Deterministic Engines:** Mathematical formulas, limitation periods, and eligibility criteria are written in pure, unit-tested JavaScript.
  - **Controlled AI Role:** Anthropic API / Claude is used exclusively for free-text vernacular extraction and drafting; never for statutory calculation.
  - **Serverless & Offline Resilience:** Netlify serverless proxy with CORS, input rate limits, and 100% offline-ready cached demo responses.
  - **Zero Heavy Native Dependencies:** Custom pure JS RFC 5545 `.ics` and standard PDF 1.4 generator.

---

### Slide 5: Responsible AI & Bar Council Rule 36 Compliance
- **Headline:** Built for Safety, Inclusion, and Institutional Trust.
- **Strict Safeguards:**
  - **Bar Council of India Rule 36:** Absolutely zero lawyer advertising, marketplace listings, profiles, or fees. Reviewer console is simulated and transparently labelled.
  - **Client-Side PII Sanitization:** Aadhaar (12 digits), PAN, phone numbers, and bank account numbers are redacted client-side before any AI call.
  - **Six-Language Parity:** 100% engine correctness parity across English, Hindi, Telugu (Tier 1) and Urdu (RTL), Marathi, Tamil (Tier 2 Beta).
  - **Official Redressal Handoff:** Integrates directly with government-backed Tele-Law and NALSA/DLSA helplines.

---

### Slide 6: Traction, Validation & Roadmap
- **Headline:** 100% Verified Benchmarks and the Path Forward.
- **Validation Metrics (93 Unit Tests Passing):**
  - **100.0% (40/40)** Knowledge Base Routing Precision.
  - **100.0% (9/9)** Pre-Flight Defective Complaint Catch Rate.
  - **100.0%** Parity in legal decision correctness across 6 Indian languages.
- **Roadmap:**
  - **Q4 2026:** WhatsApp Business bot deployment via official govt sandbox.
  - **Q1 2027:** CSC (Common Service Centre) VLE offline kiosk bundle for rural connectivity.
  - **Q2 2027:** Direct e-Daakhil, RBI CMS, and MSEFC portal API handshake integration.
