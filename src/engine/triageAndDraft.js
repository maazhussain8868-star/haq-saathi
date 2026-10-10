import { redactPii } from './redact.js';
import { routeGrievanceClient } from './routerClient.js';
import { renderStatusCode, t } from '../i18n/index.js';

// Safety triggers indicating immediate physical violence, threats, severe abuse, or self-harm
const SAFETY_PATTERNS = [
  /\b(kill|murder|suicide|attacked with weapon|stabbed|rape|sexual assault|domestic violence|beating me|threatened to kill|active kidnapping|in immediate danger)\b/i,
  /(मारने की धमकी|आत्महत्या|जान का खतरा|चाकू|हथियार से हमला|शारीरिक प्रताड़ना|घरेलू हिंसा)/,
  /(చంపేస్తామని బెదిరింపు|ఆత్మహత్య|దాడి|శారీరక హింస)/,
  /(قتل کی دھمکی|خودکشی|جان لیوا حملہ|تشدد)/
];

/**
 * Checks for safety risks in the complaint text
 * @param {string} text
 * @returns {{ isSafetyRisk: boolean, note: string }}
 */
export function checkSafetyRisk(text) {
  if (!text) return { isSafetyRisk: false, note: '' };

  for (const pattern of SAFETY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        isSafetyRisk: true,
        note: 'Immediate safety, violence, or life threat detected. For your protection, an online grievance draft cannot be generated for active emergency threats. Please contact immediate emergency and legal aid helplines.'
      };
    }
  }

  return { isSafetyRisk: false, note: '' };
}

/**
 * Determines targeted clarifying questions (up to 3) based on category and missing facts
 * @param {string} categoryId
 * @param {string} text
 * @returns {string[]}
 */
export function getClarifyingQuestions(categoryId, text) {
  const lower = (text || '').toLowerCase();
  const questions = [];

  switch (categoryId) {
    case 'farmer_pmfby':
      if (!lower.includes('yesterday') && !lower.includes('hours') && !lower.includes('कल') && !lower.includes('నిన్న') && !lower.includes('तारीख') && !/\b\d{1,2}[/-]\d{1,2}\b/.test(lower)) {
        questions.push('What was the exact date and approximate time when the crop damage event occurred?');
      }
      if (!lower.includes('kcc') && !lower.includes('enrolled') && !lower.includes('premium') && !lower.includes('बीमा') && !lower.includes('రశీదు')) {
        questions.push('Do you have an active PMFBY policy, premium deduction receipt, or Kisan Credit Card (KCC)?');
      }
      if (!lower.includes('14447') && !lower.includes('intimated') && !lower.includes('notified') && !lower.includes('शिकायत')) {
        questions.push('Have you already intimated the loss on PMFBY helpline 14447 or via the Crop Insurance app?');
      }
      break;

    case 'bank_ombudsman':
      if (!lower.includes('in writing') && !lower.includes('written') && !lower.includes('लिखित') && !lower.includes('లేఖ') && !lower.includes('تحریری')) {
        questions.push('Did you submit a formal written complaint to the bank branch manager or grievance cell?');
      }
      if (!lower.includes('30 days') && !lower.includes('days') && !lower.includes('महीना') && !lower.includes('రోజుల') && !lower.includes('دن')) {
        questions.push('How many days have passed since you lodged your initial complaint with the bank (or was it rejected)?');
      }
      if (!lower.includes('rs') && !lower.includes('₹') && !lower.includes('रुपये') && !lower.includes('రూపాయల') && !/\b\d{3,7}\b/.test(lower)) {
        questions.push('What is the exact disputed transaction amount and date of deduction?');
      }
      break;

    case 'msme_delayed_payment':
      if (!lower.includes('udyam') && !lower.includes('उद्योग') && !lower.includes('ఉద్యమ్') && !lower.includes('ادیم') && !lower.includes('micro') && !lower.includes('small')) {
        questions.push('Is your business registered as Micro or Small under the Udyam portal?');
      }
      if (!lower.includes('invoice') && !lower.includes('ఇన్వాయిస్') && !/\b\d{1,2}[/-]\d{1,2}\b/.test(lower) && !lower.includes('date')) {
        questions.push('What is the date of invoice and the agreed payment timeline (default max 45 days)?');
      }
      if (!lower.includes('rs') && !lower.includes('lakh') && !lower.includes('रुपये') && !/\b\d{4,8}\b/.test(lower)) {
        questions.push('What is the principal amount currently overdue from the buyer?');
      }
      break;

    case 'consumer_dispute':
      if (!lower.includes('paid') && !lower.includes('rs') && !lower.includes('₹') && !lower.includes('रुपये') && !/\b\d{3,7}\b/.test(lower)) {
        questions.push('What was the exact consideration amount paid for the product or service?');
      }
      if (!lower.includes('notice') && !lower.includes('nch') && !lower.includes('शिकायत') && !lower.includes('customer care')) {
        questions.push('Have you sent a written notice to the company or filed a ticket on National Consumer Helpline (1915)?');
      }
      if (!lower.includes('date') && !lower.includes('खरीदा') && !lower.includes('కొన్న') && !lower.includes('bought')) {
        questions.push('When was the item or service purchased and delivered?');
      }
      break;

    case 'police_fir_refusal':
      if (!lower.includes('station') && !lower.includes('थाना') && !lower.includes('స్టేషన్') && !lower.includes('تھانہ')) {
        questions.push('Which specific police station and jurisdiction refused to register your complaint?');
      }
      if (!lower.includes('written') && !lower.includes('लिखित') && !lower.includes('రాతపూర్వక')) {
        questions.push('Do you have a written copy of the complaint submitted to the officer-in-charge?');
      }
      if (!lower.includes('sp') && !lower.includes('dcp') && !lower.includes('अधीक्षक')) {
        questions.push('Have you sent a copy of the complaint to the Superintendent of Police (SP) by registered post?');
      }
      break;

    case 'legal_aid_s12':
      questions.push('Do you fall under any Section 12 criteria (woman, child, SC/ST, disability, industrial workman, or in custody)?');
      questions.push('What is your approximate annual household income and state of residence?');
      break;

    default:
      questions.push('When did this incident or dispute first arise?');
      questions.push('Have you already approached any government office, court, or company regarding this?');
      break;
  }

  return questions.slice(0, 3);
}

/**
 * Call 1: Triage
 */
export function runTriage(rawInput) {
  const { redactedText, redactedItems } = redactPii(rawInput);
  const safety = checkSafetyRisk(redactedText);

  if (safety.isSafetyRisk) {
    return {
      cat: 'emergency_safety',
      conf: 100,
      safety: true,
      safety_note: safety.note,
      emergency_helplines: [
        { name: 'National Emergency Helpline', number: '112' },
        { name: 'Women Helpline', number: '1091 / 181' },
        { name: 'Cyber Crime Emergency', number: '1930' },
        { name: 'NALSA Legal Aid Helpline', number: '15100' }
      ],
      questions: [],
      redactedText,
      redactedItems,
      matchedKb: null
    };
  }

  const route = routeGrievanceClient(redactedText);
  let cat = route.category_id;
  let conf = route.confidence;

  if (conf < 60) {
    cat = 'other';
  }

  const questions = getClarifyingQuestions(cat, redactedText);

  return {
    cat,
    conf,
    safety: false,
    safety_note: '',
    questions,
    redactedText,
    redactedItems,
    matchedKb: route
  };
}

/**
 * Call 2: Draft
 * Multilingual draft generator for English, Hindi, Telugu, Urdu, Marathi, Tamil
 */
export function generateDraft({ redactedText, answers = {}, matchedKb, userLanguage = 'hi' }) {
  const localized = t(userLanguage, 'disclaimer');
  const disclaimer = `Ye legal jaankari hai, vakil ki salah nahi. (${localized || 'Legal information, not legal advice.'})`;
  const categoryId = matchedKb?.category_id || 'other';
  const ruleNote = matchedKb?.rule_note || 'Applicable statutory grievance procedure';
  const sourceUrls = matchedKb?.source_urls || [];

  const dateAnswer = answers.date || answers.q1 || '[INCIDENT_DATE]';
  const amountAnswer = answers.amount || answers.q2 || '[DISPUTED_AMOUNT]';
  const priorComplaint = answers.prior || answers.q3 || '[PRIOR_COMPLAINT_DETAILS]';

  let draftEn = '';
  let draftUser = '';
  let claims = [];

  switch (categoryId) {
    case 'farmer_pmfby':
      claims = [
        'Crop loss occurred due to a notified localized peril (hailstorm / inundation / post-harvest loss).',
        'Intimation is being lodged within the mandatory 72-hour statutory window.',
        'Complainant holds an active PMFBY policy / Kisan Credit Card deduction.',
        'Geotagged photos and local land inspection proof are ready for surveyor assessment.'
      ];

      draftEn = `To,
The District Agriculture Officer / Branch Manager / PMFBY Insurance Grievance Cell
Subject: Intimation of Localised Crop Damage under PMFBY (Within 72-Hour Statutory Window)

Respected Sir/Madam,

I am an insured farmer holding policy/KCC details: [KCC_ACCOUNT_DETAILS_REDACTED]. 
My standing crop sustained severe damage due to sudden natural calamity:
- Nature of Calamity: Hailstorm / Unseasonal Flooding
- Date & Time of Occurrence: ${dateAnswer}
- Location of Land: [VILLAGE_SURVEY_NUMBER]
- Enrolment Proof: PMFBY Premium Receipt / KCC Deduction

As per Clause 15 of the PMFBY Operational Guidelines, individual intimation for localized calamities is required within 72 hours of occurrence. I hereby lodge this formal intimation. 

I request the immediate assignment of a joint loss assessment surveyor within 48 hours to inspect the field and process claim compensation.

Yours sincerely,
[INSURED_FARMER_NAME]
Contact: [PHONE REDACTED]`;

      if (userLanguage === 'te') {
        draftUser = `గౌరవనీయులైన జిల్లా వ్యవసాయ అధికారి / బ్యాంక్ శాఖా మేనేజర్ / PMFBY బీమా విభాగం
విషయం: ప్రధానమంత్రి ఫసల్ బీమా యోజన (PMFBY) కింద 72 గంటలలోపు పంట నష్ట సమాచారం

అయ్యా/అమ్మా,

నేను బీమా పొందిన రైతును (కేసీసీ/పాలసీ వివరాలు: [KCC_ACCOUNT_DETAILS_REDACTED]).
ఆకస్మిక ప్రకృతి వైపరీత్యం కారణంగా నా పంటకు తీవ్ర నష్టం వాటిల్లింది:
- విపత్తు స్వభావం: వడగండ్ల వాన / అకాల భారీ వర్షాలు
- సంఘటన తేదీ & సమయం: ${dateAnswer}
- పొలం వివరాలు: [గ్రామం/సర్వే నంబర్]
- బీమా రసీదు: PMFBY ప్రీమియం చెల్లింపు రశీదు

PMFBY నిబంధనల ప్రకారం స్థానిక విపత్తులకు 72 గంటల్లోపు వ్యక్తిగత సమాచారం ఇవ్వవలసి ఉంటుంది. కాబట్టి 48 గంటల్లో సర్వేయర్‌ను పంపి పంట నష్టాన్ని పరిశీలించి పరిహారం అందించవలసిందిగా కోరుతున్నాను.

ఇట్లు,
[రైతు పేరు]
ఫోన్: [PHONE REDACTED]`;
      } else if (userLanguage === 'ur') {
        draftUser = `بخدمت جناب ڈسٹرکٹ ایگریکلچر آفیسر / برانچ منیجر / پی ایم ایف بی وائی شکایات سیل
مضمون: وزیر اعظم فصل بیمہ یوجنا کے تحت 72 گھنٹوں کے اندر فصل کے نقصان کی قانونی اطلاع

جناب عالی،

میں ایک بیمہ دار کسان ہوں (کے سی سی/پالیسی تفصیلات: [KCC_ACCOUNT_DETAILS_REDACTED])۔
قدرتی آفت کی وجہ سے میری کھڑی فصل کو شدید نقصان پہنچا ہے:
- آفت کی نوعیت: ژالہ باری / بے موسمی بارش
- وقوعہ کی تاریخ و وقت: ${dateAnswer}
- اراضی کا پتہ: [موضع/خسرہ نمبر]
- بیمہ رسید: پی ایم ایف بی وائی پریمیم کٹوتی کی رسید

پی ایم ایف بی وائی رہنما خطوط کے تحت 72 گھنٹوں کے اندر انفرادی اطلاع دینا لازمی ہے۔ برائے مہربانی 48 گھنٹوں کے اندر سرویئر مقرر کر کے معاوضے کی کارروائی شروع فرمائیں۔

نیازمند،
[کسان کا نام]
رابطہ: [PHONE REDACTED]`;
      } else if (userLanguage === 'hi') {
        draftUser = `सेवा में,
जिला कृषि अधिकारी / शाखा प्रबंधक / पीएमएफबीवाई शिकायत निवारण सेल
विषय: प्रधानमंत्री फसल बीमा योजना (PMFBY) के तहत 72 घंटे के भीतर फसल नुकसान की वैधानिक सूचना

महोदय/महोदया,

मैं एक बीमित किसान हूँ (केसीसी/पॉलिसी विवरण: [KCC_ACCOUNT_DETAILS_REDACTED])। 
मेरी खड़ी फसल को निम्नलिखित प्राकृतिक आपदा के कारण भारी नुकसान हुआ है:
- आपदा का प्रकार: ओलावृष्टि / बेमौसम भारी बारिश
- घटना की तारीख एवं समय: ${dateAnswer}
- खेत का स्थान: [गांव/खसरा नंबर]
- बीमा प्रमाण: पीएमएफबीवाई प्रीमियम कटौती रसीद

प्रधानमंत्री फसल बीमा योजना के परिचालन दिशा-निर्देशों के अनुसार, स्थानीय आपदाओं के लिए 72 घंटे के भीतर व्यक्तिगत सूचना देना अनिवार्य है। मैं यह औपचारिक सूचना दर्ज कर रहा हूँ।

कृपया 48 घंटे के भीतर सर्वेक्षक नियुक्त कर मौका मुआयना करवाएं और क्षतिपूर्ति की प्रक्रिया शुरू करें।

भवदीय,
[बीमित किसान का नाम]
संपर्क: [PHONE REDACTED]`;
      } else {
        draftUser = draftEn;
      }
      break;

    case 'bank_ombudsman':
      claims = [
        'Unauthorized debit or banking service deficiency occurred on [TRANSACTION_DATE].',
        'Written grievance was submitted to the bank branch/nodal officer over 30 days ago.',
        'Bank has failed to resolve the grievance or has wrongfully rejected the claim.',
        'Complaint is filed within 1 year of the bank’s final response.'
      ];

      draftEn = `To,
The Reserve Bank of India Integrated Ombudsman
Centralised Receipt and Processing Centre (CRPC), Reserve Bank of India
Email: crpc@rbi.org.in | Portal: cms.rbi.org.in

Subject: Formal Complaint under RBI Integrated Ombudsman Scheme 2021 against [BANK_NAME]

Respected Ombudsman,

I hereby submit a formal complaint under the RBI Integrated Ombudsman Scheme 2021 for deficiency in banking services.

1. Bank Name & Branch: [BANK_NAME], [BRANCH_NAME]
2. Nature of Grievance: Unauthorized transaction / Failed UPI deduction / Unjustified charges
3. Disputed Amount: ${amountAnswer}
4. Prior Bank Complaint Date: ${dateAnswer} (Acknowledgement Reference: [BANK_TICKET_NO])
5. Bank Status: More than 30 days have elapsed without resolution / Unsatisfactory reply received on [REPLY_DATE].

In accordance with Clause 10 of the Scheme, having exhausted the bank's internal grievance mechanism, I request the Hon'ble Ombudsman to direct the bank to reverse the unauthorized debit with interest.

Yours faithfully,
[COMPLAINANT_NAME]
Account: [ACCOUNT NUMBER REDACTED]`;

      if (userLanguage === 'te') {
        draftUser = `గౌరవనీయులైన రిజర్వ్ బ్యాంక్ ఆఫ్ ఇండియా ఇంటిగ్రేటెడ్ అంబుడ్స్‌మన్ వారికి,
CRPC, భారత రిజర్వ్ బ్యాంక్, cms.rbi.org.in

విషయం: RBI ఇంటిగ్రేటెడ్ అంబుడ్స్‌మన్ స్కీమ్ 2021 కింద [BANK_NAME] పై అధికారిక ఫిర్యాదు

గౌరవనీయులైన అంబుడ్స్‌మన్,
బ్యాంకింగ్ సేవల లోపంపై RBI నిబంధనల ప్రకారం ఫిర్యాదు చేయుచున్నాను:
1. బ్యాంక్ పేరు & శాఖ: [BANK_NAME], [BRANCH_NAME]
2. వివాద స్వభావం: అనధికారిక ట్రాన్సాక్షన్ / విఫలమైన UPI డెబిట్
3. వివాదాస్పద మొత్తం: ${amountAnswer}
4. బ్యాంక్‌కి లేఖ ఇచ్చిన తేదీ: ${dateAnswer} (రిఫరెన్స్: [BANK_TICKET_NO])
5. ప్రస్తుత పరిస్థితి: బ్యాంక్‌కి ఫిర్యాదు చేసి 30 రోజులు దాటినా సంతృప్తికర పరిష్కారం లభించలేదు.

RBI స్కీమ్ క్లాజ్ 10 ప్రకారం, నా ఖాతా నుండి అనధికారికంగా కట్ అయిన సొమ్మును వడ్డీతో సహా రీఫండ్ ఇప్పించవలసిందిగా కోరుచున్నాను.

భవదీయుడు,
[ఫిర్యాదుదారుని పేరు]
ఖాతా సంఖ్య: [ACCOUNT NUMBER REDACTED]`;
      } else if (userLanguage === 'ur') {
        draftUser = `بخدمت جناب ریزرو بینک آف انڈیا انٹیگریٹڈ محتسب (اوِمبڈزمین)
CRPC، ریزرو بینک آف انڈیا، crpc@rbi.org.in

مضمون: آر بی آئی انٹیگریٹڈ اومبڈزمین اسکیم 2021 کے تحت باضابطہ شکایت

عالی جناب،
میں بینکاری خدمات میں کوتاہی کے سلسلے میں یہ شکایت درج کروا رہا ہوں:
1. بینک کا نام و برانچ: [BANK_NAME], [BRANCH_NAME]
2. شکایت کی نوعیت: غیر مجاز ٹرانزیکشن / یو پی آئی کٹوتی
3. متنازعہ رقم: ${amountAnswer}
4. بینک کو شکایت کی تاریخ: ${dateAnswer}
5. موجودہ کیفیت: 30 دن سے زائد کا عرصہ گزر چکا ہے مگر حل نہیں نکلا۔

براہ کرم بینک کو ہدایت فرمائیں کہ متنازعہ رقم سود سمیت فوری واپس کی جائے۔

مخلص،
[شکایت کنندہ کا نام]
اکاؤنٹ: [ACCOUNT NUMBER REDACTED]`;
      } else if (userLanguage === 'hi') {
        draftUser = `सेवा में,
भारतीय रिज़र्व बैंक (RBI) एकीकृत लोकपाल
केंद्रीयकृत प्राप्ति एवं प्रसंस्करण केंद्र (CRPC), भारतीय रिज़र्व बैंक
ईमेल: crpc@rbi.org.in | पोर्टल: cms.rbi.org.in

विषय: आरबीआई एकीकृत लोकपाल योजना 2021 के तहत [BANK_NAME] के विरुद्ध औपचारिक शिकायत

आदरणीय लोकपाल महोदय,

मैं बैंकिंग सेवा में कमी के संबंध में आरबीआई एकीकृत लोकपाल योजना 2021 के तहत यह शिकायत प्रस्तुत कर रहा हूँ:

1. बैंक का नाम एवं शाखा: [BANK_NAME], [BRANCH_NAME]
2. शिकायत का विषय: अनधिकृत लेन-देन / असफल यूपीआई कटौती / अनुचित पेनल्टी
3. विवादित राशि: ${amountAnswer}
4. बैंक को लिखित शिकायत की तारीख: ${dateAnswer} (पावती संख्या: [BANK_TICKET_NO])
5. वर्तमान स्थिति: बैंक को शिकायत दिए 30 दिन से अधिक बीत चुके हैं और उचित समाधान नहीं मिला है।

आरबीआई योजना के खंड 10 के अनुसार, मैंने बैंक के आंतरिक स्तर पर शिकायत प्रक्रिया पूरी कर ली है। कृपया बैंक को विवादित राशि ब्याज सहित वापस करने का निर्देश दें।

भवदीय,
[शिकायतकर्ता का नाम]
खाता संख्या: [ACCOUNT NUMBER REDACTED]`;
      } else {
        draftUser = draftEn;
      }
      break;

    case 'msme_delayed_payment':
      claims = [
        'Supplier is a registered Micro/Small enterprise with valid Udyam Registration.',
        'Goods or software services were accepted without dispute by the buyer.',
        'Payment has been overdue beyond the statutory maximum limit of 45 days.',
        'Statutory compound interest at 3 times the RBI Bank Rate is applicable.'
      ];

      draftEn = `To,
The Board of Directors / Finance Head
[BUYER_COMPANY_NAME]
[BUYER_OFFICE_ADDRESS]

Subject: Statutory Demand Notice under Section 15 & 16 of the MSMED Act, 2006 for Overdue Invoice

Dear Sir/Madam,

We are registered as a Micro/Small enterprise under the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006 (Udyam Registration: [UDYAM_NUMBER]).

1. Invoice Reference: [INVOICE_NUMBER] dated ${dateAnswer}
2. Goods/Services Delivered: Custom Software / IT Services / Supplies
3. Principal Overdue Amount: ${amountAnswer}
4. Days Overdue: Exceeds the statutory ceiling of 45 days under Section 15 of the MSMED Act.

Take notice that under Section 16 of the MSMED Act, failure to make payment within the agreed period attracts mandatory compound interest with monthly rests at THREE TIMES the RBI Bank Rate from the appointed day. Furthermore, Section 43B(h) of the Income Tax Act disallows tax deduction for overdue MSME payables.

We hereby call upon you to clear the principal sum of ${amountAnswer} along with statutory interest within 15 days of this notice, failing which we shall file a reference before the MSEFC / MSME ODR Portal.

For [SUPPLIER_BUSINESS_NAME]
Authorized Signatory`;

      if (userLanguage === 'te') {
        draftUser = `మేనేజ్‌మెంట్ / ఫైనాన్స్ విభాగం వారికి,
[BUYER_COMPANY_NAME]

విషయం: MSMED చట్టం 2006 సెక్షన్ 15 & 16 కింద బకాయి బిల్లు చెల్లింపు కోసం లీగల్ నోటీసు

అయ్యా/అమ్మా,
మేము సూక్ష్మ/చిన్న తరహా సంస్థగా నమోదు కాబడ్డాము (ఉద్యమ్ రిజిస్ట్రేషన్: [UDYAM_NUMBER]):
1. ఇన్వాయిస్ వివరాలు: [INVOICE_NUMBER] తేదీ ${dateAnswer}
2. అందించిన సేవలు/వస్తువులు: ఐటీ సాఫ్ట్‌వేర్ / ఇతర సేవలు
3. అసలు బకాయి మొత్తం: ${amountAnswer}
4. చట్టబద్ధమైన గరిష్ట 45 రోజుల గడువు ముగిసింది.

MSMED చట్టం సెక్షన్ 16 ప్రకారం, ఆర్బీఐ బ్యాంక్ రేటుకు మూడు రెట్ల చొప్పున చక్రవడ్డీ చెల్లించవలసి ఉంటుంది. మరియు ఆదాయపు పన్ను చట్టం సెక్షన్ 43B(h) ప్రకారం మీ వ్యాపారానికి పన్ను మినహాయింపు రద్దు చేయబడుతుంది. కావున 15 రోజుల్లో పూర్తి బకాయిలను చెల్లించవలసిందిగా కోరుచున్నాము.

ఇట్లు,
[సరఫరాదారు సంస్థ]`;
      } else if (userLanguage === 'ur') {
        draftUser = `بخدمت ڈائریکٹرز / فنانس ڈپارٹمنٹ
[BUYER_COMPANY_NAME]

مضمون: ایم ایس ایم ای ڈی ایکٹ 2006 کے سیکشن 15 اور 16 کے تحت واجب الادا رقم کا قانونی نوٹس

جناب،
ہم ایک رجسٹرڈ مائیکرو/اسمال انٹرپرائز ہیں (ادیم رجسٹریشن: [UDYAM_NUMBER]):
1. انوائس نمبر: [INVOICE_NUMBER] مورخہ ${dateAnswer}
2. فراہم کردہ خدمات: آئی ٹی سروسز / سافٹ ویئر
3. اصل واجب الادا رقم: ${amountAnswer}
4. تاخیر کی مدت: 45 دن کی قانونی حد ختم ہو چکی ہے۔

ایکٹ کی دفعہ 16 کے تحت آر بی آئی کے بینک ریٹ سے تین گنا ماہانہ سود واجب الادا ہے۔ بصورت دیگر ہم ایم ایس ایم ای کونسل میں دعویٰ دائر کریں گے۔

دستخط،
[کمپنی کا نام]`;
      } else if (userLanguage === 'hi') {
        draftUser = `सेवा में,
प्रबंध निदेशक / वित्त विभाग
[BUYER_COMPANY_NAME]
[BUYER_OFFICE_ADDRESS]

विषय: एमएसएमईडी अधिनियम, 2006 की धारा 15 एवं 16 के तहत बकाया बिल भुगतान हेतु वैधानिक मांग नोटिस

महोदय/महोदया,

हम सूक्ष्म, लघु एवं मध्यम उद्यम विकास (MSMED) अधिनियम, 2006 के तहत पंजीकृत सूक्ष्म/लघु उद्यम हैं (उद्यम पंजीकरण संख्या: [UDYAM_NUMBER])।

1. इनवॉयस विवरण: [INVOICE_NUMBER] दिनांक ${dateAnswer}
2. प्रदान की गई सेवाएं/सामग्री: आईटी सर्विसेज / सॉफ्टवेयर / आपूर्ति
3. कुल मूल बकाया राशि: ${amountAnswer}
4. विलंब अवधि: धारा 15 के तहत 45 दिनों की वैधानिक सीमा समाप्त हो चुकी है।

कृपया ध्यान दें कि अधिनियम की धारा 16 के अनुसार, नियत तिथि के बाद विलंबित भुगतान पर आरबीआई बैंक दर के तीन गुना की दर से मासिक चक्रवृद्धिक ब्याज देय है। साथ ही, आयकर अधिनियम की धारा 43B(h) के तहत इस देयता पर कर छूट भी नहीं मिलेगी।

अतः आपसे अनुरोध है कि 15 दिनों के भीतर मूल राशि मय वैधानिक ब्याज भुगतान करें, अन्यथा हम एमएसएमई समाधान / ओडीआर पोर्टल पर कानूनी कार्यवाही करेंगे।

हस्ताक्षरकर्ता,
[आपूर्तिकर्ता कंपनी का नाम]`;
      } else {
        draftUser = draftEn;
      }
      break;

    case 'police_fir_refusal':
      claims = [
        'Complainant approached the local police station to report a cognizable offence.',
        'The Officer-in-charge refused to register an FIR under BNSS Section 173.',
        'Zero FIR was not provided despite statutory mandate under BNSS Section 173(1).',
        'Written substance of the complaint is being escalated to the Superintendent of Police.'
      ];

      draftEn = `To,
The Superintendent of Police (SP) / Deputy Commissioner of Police (DCP)
[DISTRICT_POLICE_HEADQUARTERS]

Subject: Representation under Section 173(4) of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 regarding refusal of FIR by Police Station

Respected Sir/Madam,

I am constrained to bring to your immediate notice the refusal by the Officer-in-Charge of [POLICE_STATION_NAME] to register an FIR regarding a cognizable offence:
1. Date and Time of Incident: ${dateAnswer}
2. Place of Occurrence: [INCIDENT_LOCATION]
3. Offence Committed: Theft / Assault / Cheating (Cognizable Offence)
4. Date of Station Visit: [VISIT_DATE]
5. Grievance: The station officer refused to register an FIR and refused to issue a Zero FIR under BNSS s.173(1).

As per Section 173(4) of BNSS, 2023, where an officer-in-charge refuses to record information, the aggrieved person may send the substance of such information in writing to the Superintendent of Police.

I request you to investigate this matter and direct the registration of an FIR in the interest of justice.

Yours faithfully,
[COMPLAINANT_NAME]
Contact: [PHONE REDACTED]`;

      if (userLanguage === 'te') {
        draftUser = `గౌరవనీయులైన జిల్లా పోలీస్ సూపరింటెండెంట్ (SP) గారికి,
జిల్లా పోలీస్ ప్రధాన కార్యాలయం

విషయం: భారతీయ నాగరిక్ సురక్ష సంహిత (BNSS) 2023 సెక్షన్ 173(4) కింద ఎఫ్‌ఐఆర్ నిరాకరణపై ఫిర్యాదు

అయ్యా,
[POLICE_STATION_NAME] ఎస్హెచ్ఓ గారు నా దొంగతనం/నేర ఫిర్యాదుపై ఎఫ్‌ఐఆర్ నమోదు చేయనందున మీ దృష్టికి తెస్తున్నాను:
1. సంఘటన తేదీ & సమయం: ${dateAnswer}
2. స్థలం: [ప్రదేశం]
3. నేరం: దొంగతనం / దాడి (కాగ్నిజబుల్ నేరం)
4. సమస్య: ఎఫ్‌ఐఆర్ లేదా జీరో ఎఫ్‌ఐఆర్ నమోదు చేయలేదు.

BNSS సెక్షన్ 173(4) ప్రకారం ఈ లిఖితపూర్వక సమాచారాన్ని మీకు పంపుతున్నాను. దర్యాప్తు జరిపి తక్షణమే ఎఫ్‌ఐఆర్ నమోదు చేయాలని కోరుతున్నాను.

భవదీయుడు,
[ఫిర్యాదుదారుని పేరు]
ఫోన్: [PHONE REDACTED]`;
      } else if (userLanguage === 'hi') {
        draftUser = `सेवा में,
पुलिस अधीक्षक (SP) / पुलिस उपायुक्त (DCP)
[जिला पुलिस मुख्यालय]

विषय: भारतीय नागरिक सुरक्षा संहिता (BNSS), 2023 की धारा 173(4) के तहत थाना प्रभारी द्वारा एफआईआर दर्ज न करने के संबंध में शिकायत

महोदय,

मैं सविनय आपका ध्यान [POLICE_STATION_NAME] के थाना प्रभारी द्वारा संज्ञेय अपराध की प्रथम सूचना रिपोर्ट (FIR) दर्ज न करने की ओर आकर्षित करना चाहता हूँ:
1. घटना की तारीख एवं समय: ${dateAnswer}
2. घटना स्थल: [घटना का स्थान]
3. अपराध का विवरण: चोरी / मारपीट / धोखाधड़ी (संज्ञेय अपराध)
4. थाने जाने की तारीख: [थाने जाने की तारीख]
5. समस्या: थाना प्रभारी ने एफआईआर दर्ज करने से मना कर दिया और BNSS धारा 173(1) के तहत जीरो एफआईआर भी नहीं काटी।

बीएनएसएस 2023 की धारा 173(4) के प्रावधानों के तहत, मैं यह लिखित शिकायत आपके समक्ष प्रस्तुत कर रहा हूँ। कृपया निष्पक्ष जांच कर तुरंत एफआईआर दर्ज करने के निर्देश दें।

भवदीय,
[शिकायतकर्ता का नाम]
संपर्क: [PHONE REDACTED]`;
      } else {
        draftUser = draftEn;
      }
      break;

    default:
      claims = [
        'Grievance facts are derived strictly from complainant statement without speculation.',
        'Initial internal escalation steps have been initiated.',
        'Matter qualifies for formal human legal consultation via NALSA / Tele-Law.'
      ];

      draftEn = `To Whom It May Concern,
Subject: Formal Representation & Grievance Application

Respected Authority,

I submit this formal grievance regarding the dispute arising on ${dateAnswer}:
- Facts: ${redactedText}
- Relief Sought: Amicable resolution and statutory consideration under applicable regulations.
- Prior Representation: ${priorComplaint}

Kindly acknowledge receipt and initiate redressal.

Sincerely,
[APPLICANT_NAME]
Contact: [PHONE REDACTED]`;

      draftUser = userLanguage === 'hi' ? `संबंधित अधिकारी के समक्ष,
विषय: औपचारिक शिकायत एवं अभ्यावेदन पत्र

महोदय,

मैं दिनांक ${dateAnswer} को उत्पन्न विवाद के संबंध में यह औपचारिक शिकायत प्रस्तुत करता हूँ:
- तथ्य: ${redactedText}
- वांछित राहत: नियमानुसार उचित जांच एवं समाधान
- पूर्व पत्राचार: ${priorComplaint}

कृपया प्राप्ति स्वीकार कर आवश्यक कार्यवाही करें।

भवदीय,
[आवेदक का नाम]
संपर्क: [PHONE REDACTED]` : draftEn;
      break;
  }

  if (claims.length < 3) {
    claims.push('Facts stated are true to the best of knowledge and belief of the complainant.');
  }
  claims = claims.slice(0, 6);

  return {
    draft_user: draftUser,
    draft_en: draftEn,
    claims,
    citations: {
      category: matchedKb?.category || 'General',
      rule_note: ruleNote,
      source_urls: sourceUrls
    },
    disclaimer
  };
}
