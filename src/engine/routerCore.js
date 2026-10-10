// Category intent dictionaries with multilingual patterns across 6 languages:
// en (English), hi (Hindi), te (Telugu), ur (Urdu), mr (Marathi), ta (Tamil)
export const CATEGORY_PATTERNS = {
  farmer_pmfby: {
    weights: {
      high: [
        'pmfby', 'fasal bima', 'crop insurance', 'crop loss', 'crop damage', 'crop stock',
        'hailstorm', '72 hour', '72 hours', '72 घंटे', 'ओलावृष्टि', 'फसल', 'పంట బీమా', 'పత్తి పంట',
        'kisan', 'unseasonal rain', 'harvest loss', 'harvested crop', 'paddy field', 'cotton crop',
        'lightning caused fire', 'lightning', 'inundation', 'cloudburst',
        // Multilingual additions
        'వరద', 'పంట నష్టపోయింది', 'వరద వచ్చింది',
        'ژالہ باری', 'فصل بیمہ', 'سیلاب', 'تباہ ہو گئی',
        'गारपीट', 'पीक विमा', 'पूर', 'नुकसान झाले',
        'ஆலங்கட்டி', 'பயிர் காப்பீடு', 'வெள்ளம்', 'பருத்தி', 'சேதமடைந்தது'
      ],
      medium: ['farmer', 'kisan credit card', 'landslide', 'krishi', 'kharif', 'rabi', 'పంట', 'రైతు', 'शेतकरी', 'விவசாயி', 'flooding occurred', 'flood'],
      negative: ['bank dispute', 'credit card fraud', 'atm withdrawal', 'police refused', 'broadband']
    }
  },
  legal_aid_s12: {
    weights: {
      high: [
        'free lawyer', 'legal aid', 'section 12', 's.12', 'nalsa', 'dlsa', 'slsa',
        'मुफ्त कानूनी सहायता', 'मुफ्त वकील', 'ఉచిత న్యాయవాది', 'cannot afford advocate',
        'cannot afford lawyer', 'free legal aid', 'free government lawyer', 'disability was cheated',
        'physical disability', 'factory workman injured', 'human legal help',
        // Multilingual additions
        'సెక్షన్ 12', 'దివ్యాంగుడికి',
        'مفت وکیل', 'معذور', 'قانونی امداد', 'سیکشن 12',
        'मोफत वकील', 'दिव्यांग', 'कलम १२',
        'இலவச வழக்கறிஞர்', 'மாற்றுத்திறனாளி', 'பிரிவு 12'
      ],
      medium: [
        'legal services authorities', 'sc/st legal', 'scheduled caste', 'disability legal',
        'workman compensation', 'village woman', 'afford fees', '15100', 'low income',
        'పేద', 'న్యాయ సహాయం', 'ग्रामीण महिला'
      ],
      negative: ['invoice', 'buyer', 'crop', 'hailstorm', 'broadband', 'atm']
    }
  },
  msme_delayed_payment: {
    weights: {
      high: [
        'unpaid invoice', 'msme', 'udyam', 'msmed', '45 day', '45 days', '3x bank rate',
        'vendor dues', 'delayed payment', 'उद्योग आधार', 'ఇన్వాయిస్', 'samadhaan', 'msefc',
        'supplier dues', 'software startup delivered', 'software firm', 'it services startup',
        'commercial invoice', 'small it services', 'small it firm', 'delivered software',
        'invoice overdue', 'overdue by', 'बकाया बिल', '3 गुना ब्याज',
        // Multilingual additions
        'బకాయి బిల్లు', 'చిన్న ఐటీ', 'మైక్రో సరఫరాదారు',
        'واجب الادا', 'ادیم', 'انوائس', 'مائیکرو سپلائر',
        'थकीत', 'उद्यम नोंदणीकृत', 'मायक्रो पुरवठादार',
        'நிலுவை', 'உத்யம்', 'விலைப்பட்டியல்', 'மைக்ரோ சப்ளையர்'
      ],
      medium: [
        'invoice', 'buyer not paying', 'overdue invoice', 'section 15', 'section 16',
        'section 43b', 'contract terms', 'udyam registered', 'उद्यम पंजीकृत', '3 రెట్లు వడ్డీ'
      ],
      negative: ['atm', 'upi', 'crop', 'police', 'fir', 'hailstorm']
    }
  },
  bank_ombudsman: {
    weights: {
      high: [
        'rbi ombudsman', 'banking ombudsman', 'cms.rbi.org.in', 'crpc@rbi.org.in',
        'unauthorized atm', 'unauthorized transaction', 'unauthorized credit card', 'upi debited',
        'debited via upi', 'upi deduction', 'bank nodal officer', 'बैंक ओंबुड्समैन', 'అంబుడ్స్‌మన్‌కు',
        '30 days passed bank', 'bank grievance cell', 'बैंक खाते', 'अनधिकृत एटीएम', 'लिखित शिकायत',
        'బ్యాంక్ ఖాతా', 'డెబిట్ అయ్యింది', 'via upi', 'not credited', 'bank ombudsman',
        // Multilingual additions
        'బ్యాంక్ కి ఫిర్యాదు', 'తిరస్కరించింది',
        'رقم کٹ گئی', 'تحریری شکایت', 'بینک نے تحریری', 'مسترد کر دی',
        'तक्रार नाकारली', 'अनधिकृत यूपीआय', 'लेखी तक्रार',
        'அங்கீகரிக்கப்படாத', 'பரிவர்த்தனை', 'எழுத்துப்பூர்வ புகார்'
      ],
      medium: [
        'sbi account', 'hdfc bank', 'icici bank', 'bank manager refused', 'account frozen',
        'penalty reversal', 'failed upi', 'complained to the bank', 'debited', 'खाते से',
        'to bank', 'to the bank', 'complained', 'बँकेला लेखी तक्रार', 'வங்கியில்', 'بینک'
      ],
      negative: ['crop', 'hailstorm', 'fir', 'police station', 'udyam', 'frivolous excuses past the 45-day']
    }
  },
  consumer_dispute: {
    weights: {
      high: [
        'consumer commission', 'consumer forum', 'consumer case', 'e-daakhil', 'edaakhil',
        'nch 1915', 'consumer court', 'उपभोक्ता फोरम', 'refrigerator', 'flight cancellation refund',
        'fake goods', 'defective product', 'cpa 2019', 'district commission', 'refuse replacement',
        'cooling within 3 days', 'stopped cooling', 'defective refrigerator',
        // Multilingual additions
        'వినియోగదారుల ఫోరం', 'రీఫండ్ నిరాకరించారు', 'ఫ్రిజ్ పాడైంది',
        'खराब निकला', 'विक्रेता ने रिफंड',
        'فریج خراب', 'رقم واپس کرنے سے انکار',
        'परतावा नाकारला', 'ग्राहक मंच', 'फ्रिज खराब',
        'குளிர்சாதன பெட்டி', 'பணத்தை தர மறுத்தார்'
      ],
      medium: [
        'warranty repair', 'seller refused refund', 'e-commerce site', 'dealership delivered damaged',
        'replacement denied', 'bought online', 'refund denied'
      ],
      negative: ['crop', 'fir', 'police station', 'msme', 'udyam', 'atm withdrawal']
    }
  },
  police_fir_refusal: {
    weights: {
      high: [
        'police refused fir', 'sho refused', 'zero fir', 'bnss', 's.173', '173(4)', '175(3)',
        'sp complaint', 'magistrate 175', 'थाना प्रभारी', 'एफआईआर', 'ఎఫ్‌ఐఆర్', 'police station not registering',
        'police refused zero fir', 'stolen vehicle under bnss',
        // Multilingual additions
        'ఎఫ్‌ఐఆర్ నమోదు చేయడానికి నిరాకరించారు',
        'ایف آئی آر', 'بی این ایس ایس', 'انکار کر دیا',
        'बीएनएसएस', 'नोंदवण्यास नकार',
        'பிஎன்எஸ்எஸ்', 'மறுத்துவிட்டனர்', 'எஃப்ஐஆர் பதிவு செய்ய'
      ],
      medium: [
        'police station', 'stolen motorbike', 'assaulted', 'superintendent of police',
        'cognizable offence', 'magistrate court', 'దొంగతనం', 'पोलीस ठाण्यात', 'کاوَل നിലையத்தில்'
      ],
      negative: ['consumer forum', 'crop', 'invoice', 'bank ombudsman']
    }
  },
  human_telelaw: {
    weights: {
      high: [
        'tele-law', 'telelaw', 'टेली-लॉ', 'csc tele-law', 'nyaya bandhu', 'pro bono advocate',
        'consultation with a verified government panel lawyer', 'सरकारी पैनल के वकील', 'panel lawyer'
      ],
      medium: ['video consultation', 'csc centre', 'legal consultation', 'human legal'],
      negative: ['hailstorm', 'invoice', 'stolen', 'crop']
    }
  },
  insurance_grievance: {
    weights: {
      high: [
        'health insurance claim rejected', 'insurance ombudsman', 'bima bharosa', 'irdai',
        'बीमा लोकपाल', 'cashless rejected', 'car accident claim rejected', 'hospitalisation claim',
        'star health', 'motor insurance delay', 'pre-existing condition'
      ],
      medium: ['insurance company', 'policy dispute', 'claim rejected', 'बीमा कंपनी'],
      negative: ['crop loss', 'fasal bima', 'pmfby', 'farmer', 'kisan', 'పంట']
    }
  },
  telecom_dispute: {
    weights: {
      high: [
        'airtel broadband', 'broadband bill', 'telecom operator', 'sim blocked',
        'mobile portability', 'mnp', 'trai appellate', 'disconnected my line'
      ],
      medium: ['broadband', 'telecom', 'docket number', 'customer care bill'],
      negative: ['farmer', 'police', 'crop']
    }
  },
  cyber_fraud: {
    weights: {
      high: [
        '1930', 'cybercrime.gov.in', 'cyber fraud', 'साइबर फ्रॉड', 'telegram investment',
        'phishing scam', 'duped of', 'crypto phishing', 'cyber helpline', 'task scam'
      ],
      medium: ['online fraud', 'account hacked', 'scammed online', 'golden hour', 'ऑनलाइन 50,000'],
      negative: ['crop', 'farmer', 'police refused fir']
    }
  },
  labour_wages: {
    weights: {
      high: [
        'salary unpaid', 'employer not paying', 'labour commissioner', 'unpaid wages',
        'terminated without notice', 'gratuity withheld', 'last 3 months salary'
      ],
      medium: ['salary', 'labour court', 'workman wages', 'workplace salary'],
      negative: ['invoice', 'buyer', 'crop', 'atm']
    }
  },
  rent_tenancy: {
    weights: {
      high: [
        'security deposit', 'landlord', 'tenant', 'rent dispute', 'illegal eviction',
        'deposit refund', 'flat deposit', 'fake paint damages'
      ],
      medium: ['house rent', 'rent authority', 'bengaluru landlord', 'vacated me'],
      negative: ['crop', 'invoice', 'bank']
    }
  },
  cpgrams_govt: {
    weights: {
      high: [
        'cpgrams', 'pgportal', 'passport renewal', 'passport office',
        'government office no response', 'pension delay', 'central grievance'
      ],
      medium: ['central grievance', 'govt portal', 'public grievance'],
      negative: ['court case', 'fir', 'crop']
    }
  }
};

export function classifyText(text, kbList) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return buildResult('other', 0, kbList);
  }

  const lower = text.toLowerCase();
  const scores = {};

  for (const [catId, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let score = 0;

    if (patterns.weights.high) {
      for (const phrase of patterns.weights.high) {
        if (lower.includes(phrase.toLowerCase())) {
          score += 40;
        }
      }
    }

    if (patterns.weights.medium) {
      for (const phrase of patterns.weights.medium) {
        if (lower.includes(phrase.toLowerCase())) {
          score += 18;
        }
      }
    }

    if (patterns.weights.negative) {
      for (const phrase of patterns.weights.negative) {
        if (lower.includes(phrase.toLowerCase())) {
          score -= 35;
        }
      }
    }

    scores[catId] = Math.max(0, score);
  }

  let bestCat = 'other';
  let highestScore = 0;

  for (const [catId, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestCat = catId;
    }
  }

  let confidence = 0;
  if (highestScore >= 75) {
    confidence = Math.min(97, 85 + Math.round((highestScore - 75) * 0.2));
  } else if (highestScore >= 35) {
    confidence = Math.min(84, 65 + Math.round((highestScore - 35) * 0.5));
  } else if (highestScore > 0) {
    confidence = Math.max(25, Math.round(highestScore * 1.5));
  } else {
    confidence = 20;
  }

  if (highestScore < 35 || confidence < 60) {
    bestCat = 'other';
    confidence = highestScore === 0 ? 90 : Math.min(55, Math.max(25, confidence));
  }

  return buildResult(bestCat, confidence, kbList);
}

function buildResult(categoryId, confidence, kbList) {
  const entry = kbList.find(item => item.id === categoryId) || kbList.find(item => item.id === 'other') || {
    id: 'other',
    category: 'Other / Safe Legal Aid Handoff',
    verified: true,
    rule_note: 'Safe handoff protocol',
    steps: [],
    source_urls: []
  };

  return {
    category_id: entry.id,
    category: entry.category,
    confidence,
    verified: Boolean(entry.verified),
    rule_note: entry.rule_note,
    steps: entry.steps || [],
    source_urls: entry.source_urls || [],
    last_verified: entry.last_verified
  };
}
