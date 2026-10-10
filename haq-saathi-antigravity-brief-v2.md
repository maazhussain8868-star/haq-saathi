# Haq Saathi: Antigravity Build Brief (v2, final)

## How to work (read first)
- Work **one phase at a time**. At the end of each phase: run the checks, give a 5-line summary, then **STOP and wait for my "GO"**. Do not start the next phase on your own.
- Hard deadline: **11 Oct 2026, 3:00 PM IST**. Keep every phase small. Core flow first, polish last.
- Never invent legal facts. Legal content comes **only** from `data/kb.json` (see Appendix A). If the KB has no answer, the app says it does not know and shows the legal-aid handoff.
- **No lawyer marketplace.** No lawyer listings, profiles, ratings, prices, or advertising (Bar Council of India Rule 36 risk). Human verification = volunteer reviewer mode (simulated in demo) + Tele-Law/DLSA handoff only.
- Never commit API keys. Use env vars.
- Claim only what is actually implemented (privacy, languages, voice, accuracy). If something is not built, it goes under "roadmap", not in the demo or deck.

## First message to paste into Antigravity
"Read this whole brief. Start with **Phase 0 only**. When Phase 0 is done and tested, summarise in 5 lines and wait for my GO. Do not continue to Phase 1 until I say GO."

## Product
**Haq Saathi**: user describes any complaint (text or voice in English, Hindi, Telugu and more; document photo later). App classifies it, asks up to 3 clarifying questions, shows the right forum ladder with sources, drafts the complaint (user language + English), sets a deadline reminder with escalation draft, and offers a safe human-review path.
- Hackathon theme: Smart & Inclusive Communities (AI Agents, RAG, Voice AI). Judges' framework: specific problem -> feasible tech -> measurable outcome.
- One-liner (<=200 chars): *Haq Saathi turns any Indian grievance into the right forum, a cited draft and a deadline in 1 minute, with a safe path to human legal review.*
- Positioning vs existing tools (state honestly, never claim "first/only"): Jagriti (govt, consumer helpline only), Grahak-Nyay (research chatbot), LegalMitra, Escalatr. Our focus: **cross-regulator routing (bank/insurance/telecom/police/consumer) + tracker + escalation + human-review handoff.**
- Non-goals: court filing, payments, lawyer marketplace, bail/defence/guilt advice, win guarantees.

## Who it is for and hero flows (build deep, not wide)
Users: **farmers, low-income villagers who cannot afford or find a lawyer, and small IT firms/startups**, plus ordinary bank/consumer/police complaints. One **Deadline & Eligibility Engine** (deterministic rules in code; the LLM only extracts fields and drafts) powers four hero flows, in this priority order:
1. **Farmer 72-hour clock (PMFBY crop loss)**
2. **Free legal aid eligibility checker (s.12 Legal Services Authorities Act)**
3. **IT/MSME unpaid invoice recovery (MSMED Act)**
4. **Bank pre-flight (RBI Ombudsman)**
Light flows only: consumer, police/FIR. Anything else: "verify baaki" badge + legal-aid handoff.
**Demo (90 s), three personas about 25 s each:** a farmer (hailstorm yesterday -> hours left, call 14447), a village woman (am I eligible for a free lawyer? -> yes, 15100 / Tele-Law), a small IT founder (unpaid invoice -> due date, interest, notice draft). Pitch line: *one rules engine, from farmer to startup, that saves people before a deadline lapses or a complaint is rejected.*
UX: voice-first, big buttons, simple language, six languages (see Languages).

## Languages (tiered, honest)
- **Tier 1, fully tested (UI + input + draft + voice where supported):** English, Hindi, Telugu.
- **Tier 2, "beta" badge (UI translated, AI draft works, voice best-effort):** Urdu (right-to-left), Marathi, Tamil.
- Rule: legal outputs (status, deadlines, steps, eligibility) come from the **engine as structured codes**, rendered through per-language UI templates in `i18n/<lang>.json`. The LLM is **not** used to translate legal results. The LLM is used only to understand free-text input and to write the complaint draft in the user's language. **An English official copy is always shown** next to any non-English draft.
- Auto-detect input language, with a visible language switcher on every screen. Fonts: Noto Sans Devanagari, Noto Sans Telugu, Noto Nastaliq Urdu, Noto Sans Tamil; set `dir="rtl"` for Urdu.
- Voice: browser SpeechRecognition codes `en-IN, hi-IN, te-IN, ur-IN (or ur-PK), mr-IN, ta-IN`. Support depends on browser and device, so always keep a typing fallback; optional server route for Whisper transcription. Do not claim voice for a language until tested on a real phone.
- UI strings: draft with the LLM, then have a native speaker review the Telugu and Urdu strings (30 min) before submission.

## Stack (fast and deployable on Netlify)
- Frontend: Vite + React (or plain JS), mobile-first, Hindi-friendly font (Noto Sans Devanagari).
- Backend: Netlify Function `/.netlify/functions/ai` proxying the Anthropic API. Env: `ANTHROPIC_API_KEY`, `MODEL` (default `claude-sonnet-5-5`). Add input length limit, basic rate limit, and CORS.
- Data: `data/kb.json` + `data/tests.json` (40 hand-labelled cases). No database needed for MVP.
- Deploy: Netlify (public URL). Also keep a **demo mode** with cached responses if the API fails.

## Phase 0: Skeleton (time box 45 min)
Repo, Netlify config, serverless proxy, env handling, health check page.
**Done when:** `/api/ai` returns a model reply from a test prompt on the deployed URL.

## Phase 1: Knowledge base + routing test (60 min)
Create `kb.json` from Appendix A. Schema per entry: `id, category, trigger, steps[{text, forum, wait_days|null, source}], rule_note, source_urls[], last_verified, verified:true|false`. Build a loader and a test script that runs `tests.json` and prints routing accuracy.
**Done when:** script prints accuracy on 40 cases (target >=90% on verified categories; list failures).

## Phase 2: Triage + draft (90 min)
- Redact Aadhaar (12 digits), PAN, long account numbers, phone numbers and emails **before** any AI call (client and server). Names and addresses are not auto-detected: tell the user not to type them, and do not claim full anonymisation.
- Call 1 (triage): JSON `{cat, conf, safety, safety_note, questions[<=3]}`. `conf<60` -> `other` + legal-aid handoff. `safety=true` (violence, threats, arrest, abuse, self-harm) -> show urgent help box (112, Tele-Law/DLSA), **no draft**.
- Call 2 (draft): use only user facts + KB entry; placeholders like `[DATE]` for missing facts; output `{draft_user, draft_en, claims[3-6]}`. Validate JSON, retry once.
- Every answer shows sources and the disclaimer: "Ye legal jaankari hai, vakil ki salah nahi."
**Done when:** text input -> category -> ladder -> draft works in English and Hindi for 3 verified categories (Telugu and others arrive in Phase 2D).

## Phase 2B: Pre-flight Check, the core differentiator (60 min, do right after Phase 2)
**Why:** RBI's 2024-25 Ombudsman report: the central centre (CRPC) received 9,11,384 complaints and closed 7,76,336 of them at first screening as non-complaints / non-maintainable (about 85%). Of complaints examined by Ombudsman offices, 62.16% were maintainable and 51.91% of those were resolved by settlement/conciliation/mediation. Note: "non-maintainable" also includes non-complaints (queries), so never claim "85% were user mistakes". Say "85% were closed at first screening".
**What:** a **deterministic rules engine (no LLM)** that checks a complaint BEFORE the user files it:
- Banking: did the user complain to the bank in writing first? Have 30 days passed or was it rejected? Is it within 1 year of the reply (1 year 30 days if no reply)? Output: READY / WAIT n days / TIME-BARRED / WRONG FORUM, with the fix.
- Consumer: pick Commission by consideration paid (District <=50 lakh, State 50 lakh-2 crore, National >2 crore).
- Police: where in the ladder is the user (station -> SP s.173(4) -> Magistrate s.175(3))?
- LLM is used only to extract fields (dates, amounts, who was contacted) and to draft. All legal logic lives in code + `kb.json`, so it is testable.
**Test:** extend `tests.json` to 40 cases including deliberately defective complaints; report (a) category routing accuracy and (b) % of defective complaints correctly flagged. These two numbers go on the deck.
**Done when:** UI shows a READY/WAIT/TIME-BARRED badge with reasons before the draft is offered.

## Phase 2C: Hero pack modules (90 min, after 2B)
Each module is a pure function in `engine/` with unit tests (10 cases each, 40 total with bank). No LLM inside.
- **farmer72h:** inputs: peril type (hailstorm, landslide, flood/inundation, cloudburst, lightning fire, post-harvest rain within 14 days of harvest, widespread/area loss), event date-time, enrolled yes/no. Output: hours left of 72; if widespread -> "no individual intimation needed, check claim status"; if past 72 h -> "individual claim window likely missed, still contact agriculture officer/14447, no promises". Steps: call 14447 (ticket number by SMS), Crop Insurance app, bank/CSC/agriculture office; keep premium receipt, ticket number, geo-tagged photos.
- **legalaid:** inputs: woman, child, SC/ST, disability, victim of disaster/violence/trafficking, industrial workman, in custody, annual income, state. Output: eligible categories; first seven need no income test; income limit is state-specific, so ask state and show "verify state limit" (one source says below Rs 3 lakh or a higher state figure for court cases). Handoff: NALSA 15100, Tele-Law (CSC/app), DLSA.
- **msme_invoice:** inputs: seller is Udyam micro/small yes/no (medium excluded), invoice/acceptance date, written agreement days (none -> 15 days, with agreement -> up to 45 days; double-check on the official Act text), payment received yes/no, `BANK_RATE` in config (verify on RBI site). Output: due date, days overdue, indicative compound interest with monthly rests at 3x bank rate (label as estimate), legal notice draft, MSME ODR portal step, note that late payment affects the buyer's tax deduction (s.43B(h)). Check that IT services firms qualify as suppliers before claiming it.
- **bank:** from Phase 2B.
**Done when:** `npm test` passes all 40 engine tests and each module has a UI card that runs without the LLM.

## Phase 2D: Multilingual layer (60 min, after 2C)
Build `i18n/` for en, hi, te (Tier 1) and ur, mr, ta (Tier 2). Engine returns codes (`status`, `hours_left`, `reason_key`, `step_keys`); UI renders them via templates. Add language switcher, auto-detect, RTL for Urdu, and a "beta" badge on Tier 2. Draft prompt: "Write the draft in the user's language and script, then an official English copy; use only the given facts."
**Parity test (put the result on the deck):** run the same 10 cases in each language, record category-routing accuracy and engine-status correctness per language in a table. Engine correctness should be identical across languages; extraction quality may differ, so report it honestly.
**Done when:** the three persona demos run end-to-end in English, Hindi and Telugu, and the parity table is generated by a script.

## Phase 3: Tracker (45 min)
Deadline from `wait_days` (else user-set), reminder text, escalation draft for the next step, `.ics` download, PDF export of the draft.
**Done when:** a drafted complaint produces a calendar file and a PDF.

## Phase 4: Reviewer Mode, safe design (60 min)
- "Send for human review" creates a shareable review link with the **redacted** draft + claims (user consent screen first).
- Reviewer page: per-claim ✅ / ✏️ (comment) / ❌, overall note. User sees status "Reviewed".
- **Demo reviewer is simulated and labelled "SIMULATED (demo)"**. No names, ratings, prices, or lawyer directory.
- Handoff buttons: Tele-Law (tele-law.in) and DLSA/NALSA legal aid.
**Done when:** review link round-trip works locally and on the deployed site.

## Phase 5: Voice + document upload (P1, 60 min, cut first if late)
Browser SpeechRecognition (en-IN, hi-IN, te-IN as Tier 1; ur, mr, ta best-effort) with text fallback; image/PDF upload with vision extraction, then redaction, then triage.
**Cut-line:** drop document upload first, then voice. Never cut text -> draft.

## Phase 6: Polish + safety (45 min)
Mobile layout, loading/error states, low-confidence behaviour, language parity check across all six languages (see Phase 2D table, note quality gaps honestly), cached demo mode, impact counter (complaints drafted, categories).

## Phase 7: Submission pack (60 min)
README (problem, architecture, KB sources, test results, limitations, competitor honesty), `/docs/architecture.md`, 90-second demo script, code ZIP under 100 MB (exclude `node_modules`, no secrets), 6-slide deck outline: Problem (data) -> Flow -> Live demo -> Architecture -> Responsible AI -> Impact + roadmap.

## Priorities and cut-line (time is short: build in this order)
**MUST (demo does not work without these):** Phase 0, 1, 2, 2B, 2C (farmer + legal aid first, then MSME, then bank), Phase 7 (submission pack).
**SHOULD:** Phase 2D with English, Hindi, Telugu only; Phase 3 tracker; Phase 4 simulated reviewer.
**COULD (cut first):** Urdu/Marathi/Tamil beta, Phase 5 document upload then voice, Phase 6 extra polish.
**Never cut:** engine tests, live link + cached demo mode, honest labels.

## Timeline suggestion
Tonight: Phases 0, 1, 2, 2B (start 2C with farmer + legal aid). Tomorrow early morning: finish 2C, then 2D (Tier 1), 4. Optional 3, 5, 6. By **12:00 noon**: Phase 7, demo video recorded, deck done. Submit by 1:00-1:30 PM and leave buffer. Check the form: pitch deck, prototype link, demo video MP4 (<=100 MB), code ZIP (<=100 MB), theme, 200-char description. Test the live link in an incognito window and on a phone before submitting.

---
## Appendix A: KB seed (from research on 10 Oct 2026)
Sources below were secondary (law-news sites, bank/RBI summary PDFs). **Before final submission, re-check each against the official source and set `last_verified`.**

**A1. Banking / UPI (`verified:true`, re-check on cms.rbi.org.in)**
1. Written complaint to the bank (grievance officer). 2. If no reply within 30 days, or rejected/unsatisfied -> RBI Integrated Ombudsman (portal cms.rbi.org.in, email crpc@rbi.org.in). 3. Time limit: within 1 year of the bank's reply; if no reply, within 1 year and 30 days of the complaint. No upper limit on dispute amount. Source: RBI Integrated Ombudsman Scheme 2021.

**A2. Consumer (`verified:true` for limits only)**
Commission by value of goods/services **paid as consideration** (not compensation claimed): District <= Rs 50 lakh; State > Rs 50 lakh to Rs 2 crore; National > Rs 2 crore. Source: Consumer Protection (Jurisdiction of the District Commission, the State Commission and the National Commission) Rules, 2021 (30 Dec 2021). Company-grievance wait (15-30 days), NCH 1915, e-Daakhil steps: `verified:false`.

**A3. Police / FIR refusal (`verified:true`, re-check BNSS text)**
FIR under BNSS s.173 (replaced CrPC s.154 from 1 July 2024). Zero FIR at any station for cognizable offences (s.173(1)); free copy (s.173(2)); e-FIR allowed. If refused: written complaint to SP/DCP (s.173(4)); if still no action: Magistrate (s.175(3)); private complaint (s.223). Out of scope: advice on bail, defence, guilt.

**A4. Human help / handoff (`verified:true`)**
Tele-Law: video/phone consultation with panel lawyers via CSCs and the Tele-Law app; free for those eligible under s.12 Legal Services Authorities Act, Rs 30 per consultation for others (tele-law.in). Nyaya Bandhu: pro bono advocates connected to eligible beneficiaries (10,629 advocates as of Nov 2023). DLSA/NALSA: free legal aid; NALSA toll-free 15100 (shown on a NALSA state page; confirm on nalsa.gov.in before final).

**A5. Farmer / PMFBY (`verified:true`, but sources were insurer and explainer sites; re-check pmfby.gov.in)**
Localised calamities (hailstorm, landslide, inundation, cloudburst, lightning-caused fire) and post-harvest loss (within 14 days of harvest): individual claim only if intimated within 72 hours. Helpline 14447 (ticket by SMS), Crop Insurance app, bank, CSC, agriculture office. Widespread yield loss: area approach, no individual intimation. Insurer appoints a surveyor within about 48 hours of intimation.

**A6. Free legal aid eligibility (`verified:true`, re-check nalsa.gov.in and the state SLSA site)**
Section 12 LSA Act 1987: SC/ST; trafficking/begar victim; woman or child; person with disability; victim of disaster/violence/caste atrocity; industrial workman; person in custody; or annual income below the limit prescribed by the State (one NALSA page says below Rs 3 lakh or higher state amount, for non-Supreme-Court cases). First seven categories: no income test. NALSA toll-free 15100.

**A7. MSME delayed payment (`verified:true` for the core rules, re-check the MSMED Act text and the MSME ODR portal)**
Micro/small supplier is entitled to payment within the agreed period (max 45 days with written agreement; 15 days if no agreement); on delay, compound interest with monthly rests at three times the RBI bank rate. Claims now go through the MSME ODR portal (Samadhaan replaced for new references). Medium enterprises generally not covered. Buyer tax angle: s.43B(h) Income Tax Act.

**Unverified, show with a "verify" badge and do not present as certain:** Insurance (insurer grievance -> IRDAI Bima Bharosa -> Insurance Ombudsman), Telecom (operator nodal officer -> appellate authority -> TRAI/DoT), Cyber fraud (helpline 1930, cybercrime.gov.in), CPGRAMS, labour/wages, rent/deposit (state-specific: ask user's state).

## Appendix B: Prompts
**Triage:** "You are a legal-information triage assistant for Indian citizens. Classify into exactly one category id from the KB (use `other` if unsure or confidence<60). Detect safety risk. Ask at most 3 short clarifying questions only for missing key facts (date, amount, already complained?). Reply in the user's language. Return only JSON."
**Draft:** "Draft a formal complaint using only the user's facts. Use placeholders for missing facts. Do not invent law sections, amounts or guarantees. Cite only the KB entry given. Write the draft in the user's language, then an official English copy. List 3-6 factual claims a reviewer should check. Return only JSON."

## Appendix C: Responsible-AI points for the deck
Source-or-nothing answers; "I don't know" + handoff on low confidence; disclaimer on every output; PII redaction before AI calls (say 24-hour deletion only if implemented); consent screen for review sharing; six-language parity test (table from Phase 2D); no lawyer marketplace (Rule 36); simulated reviewer clearly labelled.

## Appendix D: Judge Q&A and honest claims
**Likely questions -> answers**
1. *What if it gives wrong advice?* -> Source-or-nothing answers, rules in code (tested), "I don't know" + legal-aid handoff, disclaimer, optional human review.
2. *How is this different from Jagriti / ChatGPT?* -> Jagriti files consumer complaints; we check deadlines, eligibility and maintainability across bank, farm, MSME and police flows before the user files, with a tested rules engine. Show the accuracy table.
3. *Why no lawyers in the app?* -> BCI Rule 36 and the Madras HC order on lawyer listings; we hand off to Tele-Law/Nyaya Bandhu/DLSA and plan volunteer review through legal-aid clinics.
4. *What data do you store?* -> Only what is implemented; redaction of IDs/numbers/phones/emails before AI calls.
5. *Evidence of impact?* -> RBI 2024-25: about 85% of complaints reaching the central centre were closed at first screening; our tests: routing accuracy X%, defective complaints caught Y%, engine tests Z/40.
**Do not say:** "first/only", "every case", "lawyer verified" (reviewer is simulated), "100% accurate", "data deleted in 24 h" (unless built).
**Always show:** "SIMULATED (demo)" on reviewer mode, "beta" on Tier 2 languages, "verify baaki" on unverified categories.
