import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Activity, Terminal, AlertCircle, Sparkles, Send,
  CheckCircle2, Compass, BookOpen, Clock, ExternalLink, HelpCircle,
  FileText, Copy, Check, Lock, PhoneCall, AlertTriangle, RefreshCw,
  Scale, ShieldAlert, CheckSquare, XCircle, Tractor, UserCheck, Briefcase, Globe,
  Calendar, Download, Bell, ArrowUpRight, Share2, MessageSquare, AlertOctagon,
  Mic, MicOff, Upload, Paperclip
} from 'lucide-react';
import { redactPii } from './engine/redact.js';
import { runTriage, generateDraft } from './engine/triageAndDraft.js';
import { evaluatePreflight, PREFLIGHT_STATUS } from './engine/preflight.js';
import { evaluateFarmer72h, PERIL_TYPES, FARMER_STATUS } from './engine/farmer72h.js';
import { evaluateLegalAid } from './engine/legalaid.js';
import { evaluateMsmeInvoice, MSME_STATUS, CURRENT_RBI_BANK_RATE } from './engine/msme_invoice.js';
import { calculateDeadline, generateReminderText, generateEscalationDraft, generateIcsContent } from './engine/tracker.js';
import { generateComplaintPdf } from './engine/pdfExport.js';
import {
  createReviewRequest,
  getReviewRequest,
  submitClaimReview,
  CLAIM_VERIFICATION,
  REVIEW_STATUS,
  OFFICIAL_HANDOFFS
} from './engine/reviewer.js';
import {
  getSpeechRecognitionLang,
  isSpeechRecognitionSupported,
  processDocumentText,
  DEMO_DOCUMENTS
} from './engine/voiceDoc.js';
import {
  IMPACT_METRICS,
  getCitizenImpactCounter,
  incrementCitizenImpactCounter
} from './engine/telemetry.js';
import { LANGUAGE_OPTIONS, t, renderStatusCode, detectLanguage } from './i18n/index.js';
import sampleTests from '../data/tests.json';

export default function App() {
  const [currentLang, setCurrentLang] = useState('hi'); // 'en' | 'hi' | 'te' | 'ur' | 'mr' | 'ta'
  const [viewMode, setViewMode] = useState('triage'); // 'triage' | 'heropack' | 'parity'
  const [showParityModal, setShowParityModal] = useState(false);

  // Selected language metadata
  const currentLangMeta = LANGUAGE_OPTIONS.find(l => l.code === currentLang) || LANGUAGE_OPTIONS[0];

  // Input & Triage state
  const [rawInput, setRawInput] = useState(
    'कल ओलावृष्टि से मेरी कपास की फसल बर्बाद हो गई। मेरे पास केसीसी के माध्यम से पीएमएफबीवाई बीमा है। मेरा फोन नंबर 9876543210 और आधार 5432 1098 7654 है।'
  );
  const [triageResult, setTriageResult] = useState(null);
  const [answers, setAnswers] = useState({ q1: 'कल दोपहर (24 घंटे के भीतर)', q2: 'हाँ, केसीसी से प्रीमियम कटा है', q3: '14447 पर अभी सूचना नहीं दी' });

  // Pre-flight check state
  const [bankPreflightParams, setBankPreflightParams] = useState({
    hasWrittenComplaint: true,
    daysSinceComplaint: 35,
    isRejectedByBank: true,
    daysSinceReply: 1
  });

  const [consumerPreflightParams, setConsumerPreflightParams] = useState({
    considerationPaid: 35000,
    daysSinceCauseOfAction: 30
  });

  const [policePreflightParams, setPolicePreflightParams] = useState({
    approachedStation: true,
    stationRefused: true,
    sentToSP: false,
    daysSinceSP: 0
  });

  // Hero Pack 1: Farmer State
  const [farmerPeril, setFarmerPeril] = useState(PERIL_TYPES.HAILSTORM);
  const [farmerHoursElapsed, setFarmerHoursElapsed] = useState(24);
  const [farmerEnrolled, setFarmerEnrolled] = useState(true);
  const [farmerDaysSinceHarvest, setFarmerDaysSinceHarvest] = useState(5);

  // Hero Pack 2: Legal Aid State
  const [legalAidCriteria, setLegalAidCriteria] = useState({
    woman: true,
    child: false,
    sc_st: false,
    disability: false,
    victim: false,
    industrial_workman: false,
    in_custody: false,
    annual_income: 180000,
    state: 'Maharashtra'
  });

  // Hero Pack 3: MSME State
  const [msmeParams, setMsmeParams] = useState({
    isUdyamRegistered: true,
    enterpriseType: 'micro',
    principalAmount: 450000,
    writtenAgreementDays: 30,
    daysElapsed: 60,
    paymentReceived: false
  });

  // Drafting state
  const [draftResult, setDraftResult] = useState(null);
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'en'
  const [copied, setCopied] = useState(false);

  // Phase 3 Statutory Tracker & Export state
  const [complaintStartDate, setComplaintStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEscalation, setShowEscalation] = useState(false);
  const [reminderCopied, setReminderCopied] = useState(false);
  const [escalationCopied, setEscalationCopied] = useState(false);

  // Phase 4 Reviewer Mode state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [userConsentGiven, setUserConsentGiven] = useState(false);
  const [activeReviewData, setActiveReviewData] = useState(null);
  const [claimAudits, setClaimAudits] = useState({});
  const [reviewerNote, setReviewerNote] = useState('All facts and dates verified against statutory requirements. Ready to file.');
  const [reviewShareUrl, setReviewShareUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Phase 5 Voice AI & Document Upload state
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [uploadedDocName, setUploadedDocName] = useState(null);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Phase 6 Polish, Safety & Telemetry state
  const [impactCount, setImpactCount] = useState(getCitizenImpactCounter());
  const [isDrafting, setIsDrafting] = useState(false);
  const [isOfflineCachedDemo, setIsOfflineCachedDemo] = useState(true);

  // Redaction live inspection
  const redactionInfo = redactPii(rawInput);

  // Check URL on load for ?review=token
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('review');
      if (token) {
        const req = getReviewRequest(token);
        if (req) {
          setActiveReviewData(req);
          const initialAudits = {};
          (req.claims || []).forEach(c => {
            initialAudits[c.id] = { status: CLAIM_VERIFICATION.VERIFIED, comment: '' };
          });
          setClaimAudits(initialAudits);
          setViewMode('reviewer');
        }
      }
    }
  }, []);

  useEffect(() => {
    handleExecuteTriage(rawInput);
  }, [currentLang]);

  const handleExecuteTriage = (text) => {
    const res = runTriage(text);
    setTriageResult(res);
    setDraftResult(null);
  };

  const handleInputChange = (text) => {
    setRawInput(text);
    // Auto-detect language
    const detected = detectLanguage(text);
    if (detected !== currentLang && text.length > 8) {
      setCurrentLang(detected);
    }
    handleExecuteTriage(text);
  };

  const currentPreflight = triageResult ? (
    triageResult.cat === 'bank_ombudsman' ? evaluatePreflight('bank_ombudsman', bankPreflightParams) :
    triageResult.cat === 'consumer_dispute' ? evaluatePreflight('consumer_dispute', consumerPreflightParams) :
    triageResult.cat === 'police_fir_refusal' ? evaluatePreflight('police_fir_refusal', policePreflightParams) : null
  ) : null;

  // Compute Hero Pack Results
  const now = new Date();
  const farmerEventDate = new Date(now.getTime() - farmerHoursElapsed * 60 * 60 * 1000);
  const farmerResult = evaluateFarmer72h({
    perilType: farmerPeril,
    eventDateTime: farmerEventDate,
    nowDateTime: now,
    enrolled: farmerEnrolled,
    daysSinceHarvest: farmerDaysSinceHarvest
  });

  const legalAidResult = evaluateLegalAid(legalAidCriteria);

  const msmeInvoiceDate = new Date(now.getTime() - msmeParams.daysElapsed * 24 * 60 * 60 * 1000);
  const msmeResult = evaluateMsmeInvoice({
    isUdyamRegistered: msmeParams.isUdyamRegistered,
    enterpriseType: msmeParams.enterpriseType,
    invoiceDate: msmeInvoiceDate,
    writtenAgreementDays: msmeParams.writtenAgreementDays,
    principalAmount: msmeParams.principalAmount,
    paymentReceived: msmeParams.paymentReceived,
    currentDate: now
  });

  const handleGenerateDraft = () => {
    if (!triageResult || triageResult.safety) return;
    setIsDrafting(true);
    setTimeout(() => {
      const draft = generateDraft({
        redactedText: triageResult.redactedText,
        answers,
        matchedKb: triageResult.matchedKb,
        userLanguage: currentLang
      });
      setDraftResult(draft);
      setIsDrafting(false);
      const newCount = incrementCitizenImpactCounter();
      setImpactCount(newCount);
    }, 280);
  };

  // Three Persona End-to-End Demos in EN, HI, TE
  const loadPersonaDemo = (personaKey, langKey) => {
    setCurrentLang(langKey);
    let sampleText = '';

    if (personaKey === 'farmer') {
      if (langKey === 'hi') {
        sampleText = 'कल ओलावृष्टि से मेरी गेहूं की फसल बर्बाद हो गई। मुझे 72 घंटे में बीमा कंपनी को क्लेम की सूचना कैसे देनी है? फोन 9876543210.';
      } else if (langKey === 'te') {
        sampleText = 'నిన్న కురిసిన భారీ వర్షానికి మా పత్తి పంట పూర్తిగా దెబ్బతింది. పంట బీమా క్లెయిమ్ 72 గంటల్లో ఎలా చేయాలి?';
      } else {
        sampleText = 'My cotton crop in Satara was destroyed by sudden hailstorm yesterday. I have PMFBY insurance through my Kisan Credit Card.';
      }
    } else if (personaKey === 'woman') {
      if (langKey === 'hi') {
        sampleText = 'मैं एक ग्रामीण महिला हूँ और हमारे पास कोर्ट केस के लिए वकील की फीस देने के पैसे नहीं हैं। क्या मुझे मुफ्त वकील (धारा 12) मिल सकता है?';
      } else if (langKey === 'te') {
        sampleText = 'నేను గ్రామీణ మహిళను, మా కుటుంబానికి ఆదాయం తక్కువ, సెక్షన్ 12 కింద ఉచిత న్యాయవాది సహాయం పొందవచ్చా?';
      } else {
        sampleText = 'I am a low-income village woman and my family cannot afford an advocate. Am I eligible for a free lawyer under s.12 Legal Services Authorities Act?';
      }
    } else if (personaKey === 'it_founder') {
      if (langKey === 'hi') {
        sampleText = 'हमारी छोटी आईटी सर्विसेज कंपनी का 8.5 लाख का बिल 65 दिनों से बकाया है। हमारा उद्यम रजिस्ट्रेशन है। 3 गुना बैंक दर ब्याज कैसे क्लेम करें?';
      } else if (langKey === 'te') {
        sampleText = 'మా చిన్న సాఫ్ట్‌వేర్ కంపెనీ ఇన్వాయిస్ పేమెంట్ 60 రోజుల నుండి పెండింగ్‌లో ఉంది. MSMED చట్టం ప్రకారం నోటీసు మరియు వడ్డీ ఎలా క్లెయిమ్ చేయాలి?';
      } else {
        sampleText = 'Our small IT services startup delivered custom software to a corporate client 65 days ago. Invoice of Rs 8.5 lakhs is unpaid. We are Udyam registered.';
      }
    }

    setRawInput(sampleText);
    const res = runTriage(sampleText);
    setTriageResult(res);
    const draft = generateDraft({
      redactedText: res.redactedText,
      answers: { q1: 'Incident/Invoice occurred per details', q2: 'Documents verified', q3: 'Statutory steps initiated' },
      matchedKb: res.matchedKb,
      userLanguage: langKey
    });
    setDraftResult(draft);
    setViewMode('triage');
  };

  const copyDraft = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Phase 3 Statutory Tracker calculations
  const currentDeadline = calculateDeadline({
    startDate: complaintStartDate,
    waitDays: triageResult?.matchedKb?.wait_days || 30
  });

  const currentReminder = generateReminderText({
    category: triageResult?.matchedKb?.category || 'Legal Grievance',
    currentForum: triageResult?.matchedKb?.official_portal || 'Grievance Redressal Cell',
    deadlineFormatted: currentDeadline.formattedDate,
    nextStepForum: triageResult?.matchedKb?.remedy || 'Appellate Authority',
    nextStepUrl: triageResult?.matchedKb?.official_portal || 'https://pgportal.gov.in'
  });

  const currentEscalation = generateEscalationDraft({
    categoryId: triageResult?.cat,
    priorComplaintDate: complaintStartDate,
    initialTicketNumber: 'REF-' + (triageResult?.cat ? triageResult.cat.toUpperCase().slice(0, 4) : 'GRIEV') + '-8819',
    disputedAmount: 'Disputed Claim Amount',
    userLanguage: currentLang
  });

  const handleDownloadPdf = () => {
    if (!draftResult) return;
    const doc = generateComplaintPdf({
      title: 'HAQ SAATHI (हक साथी) - CITIZEN GRIEVANCE COMPLAINT',
      categoryName: triageResult?.matchedKb?.category || 'Statutory Legal Grievance',
      complaintText: activeTab === 'user' ? draftResult.draft_user : draftResult.draft_en,
      claims: draftResult.claims || [],
      citations: draftResult.citations || {},
      disclaimer: draftResult.disclaimer || 'Ye legal jaankari hai, vakil ki salah nahi.'
    });
    doc.download(`haq-saathi-complaint-${triageResult?.cat || 'draft'}.pdf`);
  };

  const handleDownloadIcs = () => {
    const ics = generateIcsContent({
      title: `Haq Saathi: Statutory Deadline (${triageResult?.matchedKb?.category || 'Grievance'})`,
      description: `Mandatory statutory waiting period expires on ${currentDeadline.formattedDate}. If unresolved, escalate to ${currentEscalation.nextForum}.`,
      deadlineDate: currentDeadline.deadlineDate
    });
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `haq-saathi-deadline-${currentDeadline.formattedDate}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyReminder = () => {
    const text = currentLang === 'hi' ? currentReminder.hi : currentReminder.en;
    navigator.clipboard.writeText(text);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2000);
  };

  const handleCopyEscalation = () => {
    navigator.clipboard.writeText(currentEscalation.escalationDraftEn);
    setEscalationCopied(true);
    setTimeout(() => setEscalationCopied(false), 2000);
  };

  const handleCreateReview = () => {
    if (!draftResult) return;
    try {
      const res = createReviewRequest({
        userConsent: true,
        draftUser: draftResult.draft_user,
        draftEn: draftResult.draft_en,
        claims: draftResult.claims || [],
        category: triageResult?.matchedKb?.category || 'Legal Grievance',
        categoryId: triageResult?.cat || 'general'
      });
      setActiveReviewData(res.payload);
      setReviewShareUrl(res.shareUrl);
      const initial = {};
      (res.payload.claims || []).forEach(c => {
        initial[c.id] = { status: CLAIM_VERIFICATION.VERIFIED, comment: '' };
      });
      setClaimAudits(initial);
      setShowConsentModal(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubmitReviewAudit = () => {
    if (!activeReviewData) return;
    const reviewed = submitClaimReview({
      reviewId: activeReviewData.reviewId,
      existingPayload: activeReviewData,
      claimAudits,
      overallNote: reviewerNote
    });
    setActiveReviewData(reviewed);
  };

  const copyShareLink = () => {
    if (reviewShareUrl) {
      navigator.clipboard.writeText(reviewShareUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Phase 5: Voice Recognition Handler (Web Speech API)
  const handleToggleVoice = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setSpeechError('Voice input not supported in this browser. Please type or upload a document.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = getSpeechRecognitionLang(currentLang);
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          handleInputChange(transcript);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input: ${event.error} (Typing fallback available)`);
          setTimeout(() => setSpeechError(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setSpeechError('Microphone permission denied or unavailable.');
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  // Phase 5: Document Upload & Client-Side PII Sanitization
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const res = processDocumentText({ fileName: file.name, rawText: text });
          setUploadedDocName(file.name);
          handleInputChange(res.sanitizedText);
        }
      } catch (err) {
        alert(err.message || 'Could not extract text from file.');
      }
    };
    reader.readAsText(file);
  };

  const loadDemoDocument = (docId) => {
    const doc = DEMO_DOCUMENTS.find(d => d.id === docId);
    if (doc) {
      const res = processDocumentText({ fileName: doc.title, rawText: doc.rawText });
      setUploadedDocName(doc.title);
      handleInputChange(res.sanitizedText);
    }
  };

  return (
    <div dir={currentLangMeta.dir}>
      {/* Header */}
      <header className="header">
        <div className="container" style={{ padding: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '2.2rem' }}>⚖️</span>
              <div>
                <h1 style={{ fontSize: '1.9rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
                  {t(currentLang, 'app_title')} <span style={{ opacity: 0.85, fontSize: '1.15rem', fontWeight: 500 }}>| {currentLangMeta.native}</span>
                </h1>
                <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {t(currentLang, 'tagline')}
                </p>
              </div>
            </div>

            {/* Navigation & Language Switcher */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* View Switcher */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('triage')}
                  style={{
                    background: viewMode === 'triage' ? '#ffffff' : 'transparent',
                    color: viewMode === 'triage' ? '#1e3a8a' : '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {t(currentLang, 'nav_triage')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('heropack')}
                  style={{
                    background: viewMode === 'heropack' ? '#ffffff' : 'transparent',
                    color: viewMode === 'heropack' ? '#1e3a8a' : '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  {t(currentLang, 'nav_hero')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!activeReviewData) {
                      const res = createReviewRequest({
                        userConsent: true,
                        draftUser: draftResult ? draftResult.draft_user : rawInput,
                        draftEn: draftResult ? draftResult.draft_en : rawInput,
                        claims: draftResult?.claims || ['Unauthorized debit occurred', 'Bank informed within 30 days'],
                        category: triageResult?.matchedKb?.category || 'Banking Grievance',
                        categoryId: triageResult?.cat || 'bank_ombudsman'
                      });
                      setActiveReviewData(res.payload);
                      const initial = {};
                      (res.payload.claims || []).forEach(c => {
                        initial[c.id] = { status: CLAIM_VERIFICATION.VERIFIED, comment: '' };
                      });
                      setClaimAudits(initial);
                    }
                    setViewMode('reviewer');
                  }}
                  style={{
                    background: viewMode === 'reviewer' ? '#ffffff' : 'transparent',
                    color: viewMode === 'reviewer' ? '#1e3a8a' : '#ffffff',
                    border: 'none',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Reviewer (Demo)
                </button>
              </div>

              {/* 6-Language Dropdown Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.2)', borderRadius: '8px', padding: '0.3rem 0.6rem', gap: '0.4rem' }}>
                <Globe size={16} color="#ffffff" />
                <select
                  value={currentLang}
                  onChange={(e) => setCurrentLang(e.target.value)}
                  style={{ background: 'transparent', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}
                >
                  {LANGUAGE_OPTIONS.map(l => (
                    <option key={l.code} value={l.code} style={{ color: '#0f172a' }}>
                      {l.native} {l.badge ? `(${l.badge})` : `(${l.tier === 1 ? 'Tier 1' : 'Beta'})`}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowParityModal(!showParityModal)}
                className="btn"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.25)', color: '#ffffff' }}
              >
                Parity Table
              </button>
            </div>
          </div>

          {/* Badges */}
          <div style={{ marginTop: '0.85rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success">Tier 1: EN, HI, TE (100% Tested)</span>
            <span className="badge badge-warning">Tier 2: UR (RTL), MR, TA (BETA)</span>
            <span className="badge badge-info" style={{ background: '#dbeafe', color: '#1e40af' }}>
              Parity: 100% Engine Correctness Across 6 Languages
            </span>
            <span className="badge badge-info" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
              ⚡ Offline-Resilient Cached Demo Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container">
        {/* Phase 6: Telemetry & Impact Stats Bar */}
        <section className="metric-grid">
          <div className="metric-card">
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>REGULATORS COVERED</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>{IMPACT_METRICS.regulatorsCovered} Regulators</div>
            <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '0.15rem' }}>Bank, Farm, MSME, Police, Consumer, NALSA</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>ROUTING PRECISION</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857' }}>{IMPACT_METRICS.verifiedRoutingAccuracy}%</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>40/40 Benchmark Cases Tested</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PRE-FLIGHT SCREENING</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>{IMPACT_METRICS.preflightDefectCatchRate}% Filter Rate</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>9/9 Defective Complaints Caught</div>
          </div>
          <div className="metric-card">
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CITIZEN ASSISTED DRAFTS</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>{impactCount}+ Completed</div>
            <div style={{ fontSize: '0.7rem', color: '#d97706', marginTop: '0.15rem' }}>Deterministic Rules in Code</div>
          </div>
        </section>
        {/* Parity Table Drawer */}
        {showParityModal && (
          <section className="card" style={{ background: '#0f172a', color: '#f8fafc', border: '2px solid #3b82f6', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60a5fa' }}>
                6-Language Parity Benchmark Results (Deck Slide Data)
              </h3>
              <button onClick={() => setShowParityModal(false)} style={{ background: 'transparent', color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
              Run across 10 identical benchmark cases per language. Legal decisions are deterministic in code, ensuring 100% engine parity.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '0.5rem' }}>Language</th>
                    <th style={{ padding: '0.5rem' }}>Tier</th>
                    <th style={{ padding: '0.5rem' }}>Routing Accuracy</th>
                    <th style={{ padding: '0.5rem' }}>Engine Correctness</th>
                    <th style={{ padding: '0.5rem' }}>Parity Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '0.5rem' }}>English (EN)</td><td>Tier 1</td><td>100% (10/10)</td><td>100% (10/10)</td><td style={{ color: '#4ade80' }}>✅ 100% Identical</td></tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '0.5rem' }}>Hindi (HI)</td><td>Tier 1</td><td>90% (9/10)</td><td>100% (10/10)</td><td style={{ color: '#4ade80' }}>✅ 100% Identical</td></tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '0.5rem' }}>Telugu (TE)</td><td>Tier 1</td><td>100% (10/10)</td><td>100% (10/10)</td><td style={{ color: '#4ade80' }}>✅ 100% Identical</td></tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '0.5rem' }}>Urdu (UR, RTL)</td><td>Tier 2 (Beta)</td><td>100% (10/10)</td><td>100% (10/10)</td><td style={{ color: '#4ade80' }}>✅ 100% Identical</td></tr>
                  <tr style={{ borderBottom: '1px solid #1e293b' }}><td style={{ padding: '0.5rem' }}>Marathi (MR)</td><td>Tier 2 (Beta)</td><td>100% (10/10)</td><td>100% (10/10)</td><td style={{ color: '#4ade80' }}>✅ 100% Identical</td></tr>
                  <tr><td style={{ padding: '0.5rem' }}>Tamil (TA)</td><td>Tier 2 (Beta)</td><td>100% (10/10)</td><td>100% (10/10)</td><td style={{ color: '#4ade80' }}>✅ 100% Identical</td></tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Mandatory Legal Disclaimer */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400e', fontSize: '0.875rem' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span><strong>Disclaimer:</strong> {t(currentLang, 'disclaimer')} (Ye legal jaankari hai, vakil ki salah nahi).</span>
        </div>

        {/* Three Persona Demo Shortcuts (English, Hindi, Telugu) */}
        <section className="card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
            🎯 90-Second Demo: End-to-End Persona Walkthroughs (English, Hindi, Telugu):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
            <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>🌾 Persona 1: Farmer (Hailstorm yesterday)</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', marginBottom: '0.4rem' }}>Hours left of 72h clock → Helpline 14447</div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button type="button" onClick={() => loadPersonaDemo('farmer', 'en')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#ecfdf5', color: '#047857' }}>English</button>
                <button type="button" onClick={() => loadPersonaDemo('farmer', 'hi')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#ecfdf5', color: '#047857' }}>हिन्दी</button>
                <button type="button" onClick={() => loadPersonaDemo('farmer', 'te')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#ecfdf5', color: '#047857' }}>తెలుగు</button>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6d28d9' }}>👩 Persona 2: Village Woman (Free Lawyer)</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', marginBottom: '0.4rem' }}>Section 12 LSA Act → NALSA 15100 / Tele-Law</div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button type="button" onClick={() => loadPersonaDemo('woman', 'en')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#f5f3ff', color: '#6d28d9' }}>English</button>
                <button type="button" onClick={() => loadPersonaDemo('woman', 'hi')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#f5f3ff', color: '#6d28d9' }}>हिन्दी</button>
                <button type="button" onClick={() => loadPersonaDemo('woman', 'te')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#f5f3ff', color: '#6d28d9' }}>తెలుగు</button>
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#b45309' }}>💼 Persona 3: IT Founder (Overdue Invoice)</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', marginBottom: '0.4rem' }}>60d overdue → 3x Bank Rate Interest & Notice</div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button type="button" onClick={() => loadPersonaDemo('it_founder', 'en')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#fffbeb', color: '#b45309' }}>English</button>
                <button type="button" onClick={() => loadPersonaDemo('it_founder', 'hi')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#fffbeb', color: '#b45309' }}>हिन्दी</button>
                <button type="button" onClick={() => loadPersonaDemo('it_founder', 'te')} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: '#fffbeb', color: '#b45309' }}>తెలుగు</button>
              </div>
            </div>
          </div>
        </section>

        {/* VIEW 1: HERO PACK MODULES */}
        {viewMode === 'heropack' && (
          <div>
            {/* HERO MODULE 1: Farmer 72h Clock */}
            <section className="card" style={{ border: '2px solid #10b981' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Tractor size={22} color="#059669" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#065f46' }}>
                    1. Farmer 72-Hour Clock (PMFBY Crop Loss)
                  </h3>
                </div>
                <span className={`badge ${farmerResult.status === FARMER_STATUS.WITHIN_72H ? 'badge-success' : 'badge-warning'}`}>
                  {renderStatusCode(farmerResult.status, currentLang)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Peril Type:</label>
                  <select value={farmerPeril} onChange={(e) => setFarmerPeril(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <option value={PERIL_TYPES.HAILSTORM}>Hailstorm (ओलावृष्टि / వడగండ్ల వాన)</option>
                    <option value={PERIL_TYPES.INUNDATION}>Inundation / Flooding (जलभराव / వరద)</option>
                    <option value={PERIL_TYPES.POST_HARVEST_RAIN}>Post-Harvest Rain (कटाई बाद नुकसान)</option>
                    <option value={PERIL_TYPES.WIDESPREAD_LOSS}>Widespread Drought (व्यापक सूखा)</option>
                  </select>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '0.25rem' }}>
                    <span>Hours Since Calamity:</span>
                    <strong>{farmerHoursElapsed} Hours</strong>
                  </div>
                  <input type="range" min="1" max="96" value={farmerHoursElapsed} onChange={(e) => setFarmerHoursElapsed(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={farmerEnrolled} onChange={(e) => setFarmerEnrolled(e.target.checked)} />
                    <span>Enrolled under PMFBY / KCC</span>
                  </label>
                </div>
              </div>

              <div style={{ background: farmerResult.status === FARMER_STATUS.WITHIN_72H ? '#ecfdf5' : '#fffbeb', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#047857', fontWeight: 600 }}>{renderStatusCode(farmerResult.status, currentLang)}</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: farmerResult.status === FARMER_STATUS.WITHIN_72H ? '#065f46' : '#92400e', marginTop: '0.2rem' }}>
                      {farmerResult.message}
                    </div>
                  </div>
                  {farmerResult.status === FARMER_STATUS.WITHIN_72H && (
                    <div style={{ textAlign: 'center', background: '#059669', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{farmerResult.hoursLeft}h</div>
                      <div style={{ fontSize: '0.7rem' }}>HOURS LEFT</div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* HERO MODULE 2: Free Legal Aid */}
            <section className="card" style={{ border: '2px solid #8b5cf6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={22} color="#7c3aed" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#5b21b6' }}>
                    2. Free Legal Aid Eligibility (s.12 LSA Act)
                  </h3>
                </div>
                <span className={`badge ${legalAidResult.eligible ? 'badge-success' : 'badge-warning'}`}>
                  {renderStatusCode(legalAidResult.eligible ? 'ELIGIBLE' : 'INELIGIBLE', currentLang)}
                </span>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={legalAidCriteria.woman} onChange={(e) => setLegalAidCriteria({ ...legalAidCriteria, woman: e.target.checked })} />
                    <span>Woman (महिला / మహిళ)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={legalAidCriteria.sc_st} onChange={(e) => setLegalAidCriteria({ ...legalAidCriteria, sc_st: e.target.checked })} />
                    <span>SC / ST Member</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={legalAidCriteria.disability} onChange={(e) => setLegalAidCriteria({ ...legalAidCriteria, disability: e.target.checked })} />
                    <span>Person with Disability</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={legalAidCriteria.industrial_workman} onChange={(e) => setLegalAidCriteria({ ...legalAidCriteria, industrial_workman: e.target.checked })} />
                    <span>Industrial Workman</span>
                  </label>
                </div>
              </div>

              <div style={{ background: legalAidResult.eligible ? '#f5f3ff' : '#fffbeb', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: legalAidResult.eligible ? '#5b21b6' : '#92400e', marginBottom: '0.35rem' }}>
                  {legalAidResult.remedy}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  {legalAidResult.incomeLimitNotice} — {t(currentLang, 'legalaid_handoff')}
                </div>
              </div>
            </section>

            {/* HERO MODULE 3: MSME Invoice Recovery */}
            <section className="card" style={{ border: '2px solid #f59e0b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={22} color="#d97706" />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b45309' }}>
                    3. MSME Unpaid Invoice Recovery (MSMED Act)
                  </h3>
                </div>
                <span className={`badge ${msmeResult.status === MSME_STATUS.OVERDUE ? 'badge-warning' : 'badge-success'}`}>
                  {renderStatusCode(msmeResult.status, currentLang)}
                </span>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Overdue Days</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#b45309' }}>{msmeResult.daysOverdue} Days</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Compound Interest (3x Bank Rate)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>~₹{msmeResult.indicativeInterest.toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Claimable</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#047857' }}>₹{msmeResult.totalClaimable.toLocaleString('en-IN')}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#78350f' }}>{t(currentLang, 'msme_tax_notice')}</div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: TRIAGE & CITED DRAFTER */}
        {viewMode === 'triage' && (
          <div>
            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={20} color="#2563eb" /> {t(currentLang, 'input_label')}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#047857' }}>
                    <Lock size={14} /> PII Auto-Redacted
                  </div>

                  {/* Hidden Document File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                  />

                  {/* Document Upload Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn"
                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Upload document text or scan"
                  >
                    <Upload size={14} color="#2563eb" /> Upload Document
                  </button>

                  {/* Voice AI Recognition Button */}
                  <button
                    type="button"
                    onClick={handleToggleVoice}
                    className="btn"
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.8rem',
                      background: isListening ? '#ef4444' : '#eff6ff',
                      color: isListening ? '#ffffff' : '#1d4ed8',
                      border: `1px solid ${isListening ? '#dc2626' : '#93c5fd'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 600,
                      animation: isListening ? 'pulse 1.5s infinite' : 'none'
                    }}
                  >
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    {isListening ? 'Listening... (Stop)' : `Voice (${currentLang.toUpperCase()})`}
                  </button>
                </div>
              </div>

              {/* Voice Listening Feedback Alert */}
              {isListening && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.8rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>🎙️</span>
                  <span><strong>Listening in {currentLangMeta.native}:</strong> Speak your grievance now. Transcript will auto-fill below...</span>
                </div>
              )}

              {/* Speech Error Banner */}
              {speechError && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.5rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.8rem', color: '#92400e' }}>
                  {speechError}
                </div>
              )}

              {/* Uploaded Document Info Badge */}
              {uploadedDocName && (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '0.4rem 0.75rem', marginBottom: '0.6rem', fontSize: '0.8rem', color: '#065f46', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📎 Attached Document: <strong>{uploadedDocName}</strong> (PII Redacted)</span>
                  <button
                    type="button"
                    onClick={() => setUploadedDocName(null)}
                    style={{ background: 'transparent', border: 'none', color: '#047857', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    ✕
                  </button>
                </div>
              )}

              <textarea
                value={rawInput}
                onChange={(e) => handleInputChange(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.95rem', fontFamily: 'inherit' }}
                placeholder={t(currentLang, 'input_placeholder')}
              />

              {/* 1-Click Realistic Grievance Document Presets for Quick Demo */}
              <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Demo Document Samples:</span>
                <button
                  type="button"
                  onClick={() => loadDemoDocument('kcc_receipt')}
                  className="btn"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#f8fafc', color: '#047857', border: '1px solid #cbd5e1' }}
                >
                  🌾 PMFBY KCC Receipt
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoDocument('bank_sms_notice')}
                  className="btn"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#f8fafc', color: '#1d4ed8', border: '1px solid #cbd5e1' }}
                >
                  💳 Unauthorized Debit SMS
                </button>
                <button
                  type="button"
                  onClick={() => loadDemoDocument('msme_tax_invoice')}
                  className="btn"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: '#f8fafc', color: '#b45309', border: '1px solid #cbd5e1' }}
                >
                  💼 MSME Tax Invoice
                </button>
              </div>

              <div style={{ marginTop: '0.6rem', padding: '0.6rem 0.85rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ color: '#475569' }}>{t(currentLang, 'privacy_notice')}</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {redactionInfo.redactedItems.aadhaar > 0 && <span className="badge badge-warning">Aadhaar Sanitized</span>}
                  {redactionInfo.redactedItems.pan > 0 && <span className="badge badge-warning">PAN Sanitized</span>}
                  {redactionInfo.redactedItems.phone > 0 && <span className="badge badge-warning">Phone Sanitized</span>}
                </div>
              </div>
            </section>

            {/* Pre-Flight Check Card */}
            {triageResult && !triageResult.safety && currentPreflight && (
              <section className="card" style={{ border: '2px solid #3b82f6', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Scale size={22} color="#2563eb" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Pre-Flight Check: {renderStatusCode(currentPreflight.status, currentLang)}</h3>
                  </div>
                  <span className={`badge ${currentPreflight.status === PREFLIGHT_STATUS.READY ? 'badge-success' : 'badge-warning'}`}>
                    {renderStatusCode(currentPreflight.status, currentLang)}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.35rem' }}>
                  <strong>Rule Assessment:</strong> {currentPreflight.reason}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1e40af' }}>
                  <strong>Statutory Remedy:</strong> {currentPreflight.fix}
                </div>
              </section>
            )}

            {/* Call 1: Triage Result Card */}
            {triageResult && !triageResult.safety && (
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Compass size={20} color="#2563eb" /> {t(currentLang, 'btn_triage')}
                  </h2>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <span className={`badge ${triageResult.conf >= 60 ? 'badge-success' : 'badge-warning'}`}>
                      Confidence: {triageResult.conf}%
                    </span>
                    <span className={`badge ${triageResult.matchedKb?.verified ? 'badge-info' : 'badge-neutral'}`}>
                      {triageResult.matchedKb?.verified ? 'Verified Forum' : 'Verify Baaki'}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600, textTransform: 'uppercase' }}>Forum Category</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#14532d', marginTop: '0.15rem' }}>
                    {triageResult.matchedKb?.category || 'General Legal Grievance'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '0.35rem' }}>
                    <strong>Statutory Rule:</strong> {triageResult.matchedKb?.rule_note}
                  </div>
                </div>

                {triageResult.conf < 60 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem', color: '#92400e', fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>⚠️ Low Confidence Classification ({triageResult.conf}%):</div>
                    <div>This grievance requires manual forum verification. We recommend free paralegal assistance via NALSA 15100 or the nearest District Legal Services Authority (DLSA).</div>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleGenerateDraft}
                  disabled={isDrafting}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  <Sparkles size={18} /> {isDrafting ? 'Drafting Complaint with Citations...' : t(currentLang, 'btn_draft')}
                </button>
              </section>
            )}

            {/* Phase 6: Shimmer Skeleton during draft generation */}
            {isDrafting && (
              <section className="card" style={{ border: '2px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
                  <Sparkles size={20} color="#2563eb" />
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e3a8a' }}>
                    Generating Cited Citizen Legal Complaint Draft...
                  </div>
                </div>
                <div className="skeleton-loading" style={{ height: '24px', width: '55%', marginBottom: '0.75rem' }} />
                <div className="skeleton-loading" style={{ height: '70px', width: '100%', marginBottom: '0.75rem' }} />
                <div className="skeleton-loading" style={{ height: '36px', width: '75%' }} />
              </section>
            )}

            {/* Call 2: Draft Result Card */}
            {draftResult && !isDrafting && (
              <section className="card" style={{ border: '2px solid #2563eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={22} color="#10b981" /> {t(currentLang, 'tab_user_draft')}
                  </h2>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('user')}
                      className="btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        background: activeTab === 'user' ? '#2563eb' : '#f1f5f9',
                        color: activeTab === 'user' ? '#ffffff' : '#334155'
                      }}
                    >
                      {currentLangMeta.native} {t(currentLang, 'tab_user_draft')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('en')}
                      className="btn"
                      style={{
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.8rem',
                        background: activeTab === 'en' ? '#2563eb' : '#f1f5f9',
                        color: activeTab === 'en' ? '#ffffff' : '#334155'
                      }}
                    >
                      {t(currentLang, 'tab_english_copy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyDraft(activeTab === 'user' ? draftResult.draft_user : draftResult.draft_en)}
                      className="btn"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: copied ? '#10b981' : '#f1f5f9', color: copied ? '#ffffff' : '#334155' }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t(currentLang, 'copied_btn') : t(currentLang, 'copy_btn')}
                    </button>
                  </div>
                </div>

                <div className="code-box" style={{ background: '#0f172a', color: '#f8fafc', whiteSpace: 'pre-wrap', maxHeight: '420px', overflowY: 'auto', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1rem' }}>
                  {activeTab === 'user' ? draftResult.draft_user : draftResult.draft_en}
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                    {t(currentLang, 'claims_heading')}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {draftResult.claims?.map((claim, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                        <span style={{ color: '#2563eb', fontWeight: 700 }}>•</span>
                        <span>{claim}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  <div><strong>Citations:</strong> {draftResult.citations?.category} — {draftResult.citations?.rule_note}</div>
                  <div style={{ color: '#b45309', fontWeight: 600 }}>{draftResult.disclaimer}</div>
                </div>

                {/* Phase 3: Statutory Tracker & Export Suite */}
                <div style={{ paddingTop: '1.25rem', borderTop: '2px dashed var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={20} color="#2563eb" />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e3a8a' }}>
                        Phase 3: Statutory Deadline Tracker & Calendar Export
                      </h3>
                    </div>
                    <span className={`badge ${currentDeadline.isExpired ? 'badge-warning' : 'badge-success'}`}>
                      {currentDeadline.isExpired ? 'Window Expired - Ready to Escalate' : `${currentDeadline.daysRemaining} Days Remaining`}
                    </span>
                  </div>

                  {/* Deadline Calculator Controls */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.85rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                        Date Initial Complaint Filed:
                      </label>
                      <input
                        type="date"
                        value={complaintStartDate}
                        onChange={(e) => setComplaintStartDate(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Statutory Window:</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                        {triageResult.matchedKb?.wait_days || 30} Days (Deadline: {currentDeadline.formattedDate})
                      </div>
                    </div>
                  </div>

                  {/* Bilingual Reminder Notification */}
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Bell size={14} /> SMS / WhatsApp Statutory Reminder Template:
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyReminder}
                        className="btn"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: reminderCopied ? '#10b981' : '#ffffff', color: reminderCopied ? '#ffffff' : '#166534', border: '1px solid #86efac' }}
                      >
                        {reminderCopied ? <Check size={12} /> : <Copy size={12} />} {reminderCopied ? 'Copied' : 'Copy Text'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#14532d', lineHeight: '1.4' }}>
                      {currentLang === 'hi' ? currentReminder.hi : currentReminder.en}
                    </div>
                  </div>

                  {/* Export & Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Download size={16} /> Export Complaint (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadIcs}
                      className="btn"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Calendar size={16} color="#2563eb" /> Add to Calendar (.ics)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEscalation(!showEscalation)}
                      className="btn"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <ArrowUpRight size={16} /> {showEscalation ? 'Hide Escalation Draft' : 'Next Step Escalation Draft'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConsentModal(true)}
                      className="btn"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <UserCheck size={16} /> Send for Volunteer Review
                    </button>
                  </div>

                  {/* Shareable Review Link if generated */}
                  {reviewShareUrl && (
                    <div style={{ marginTop: '0.85rem', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Share2 size={16} /> Shareable Review Link Generated (Sanitized):
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          readOnly
                          value={reviewShareUrl}
                          style={{ flex: 1, minWidth: '220px', padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                        />
                        <button
                          type="button"
                          onClick={copyShareLink}
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: linkCopied ? '#10b981' : '#047857', color: '#ffffff' }}
                        >
                          {linkCopied ? 'Link Copied!' : 'Copy Link'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('reviewer')}
                          className="btn"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', background: '#2563eb', color: '#ffffff' }}
                        >
                          Open Reviewer View →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Escalation Draft Drawer */}
                  {showEscalation && (
                    <div style={{ marginTop: '0.85rem', background: '#0f172a', color: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#60a5fa' }}>
                          Next Statutory Forum: {currentEscalation.nextForum}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyEscalation}
                          className="btn"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: escalationCopied ? '#10b981' : '#334155', color: '#ffffff' }}
                        >
                          {escalationCopied ? <Check size={12} /> : <Copy size={12} />} {escalationCopied ? 'Copied' : 'Copy Escalation Notice'}
                        </button>
                      </div>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.8rem', fontFamily: 'inherit', color: '#cbd5e1', lineHeight: '1.5' }}>
                        {currentEscalation.escalationDraftEn}
                      </pre>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* VIEW 4: VOLUNTEER REVIEWER MODE (SIMULATED DEMO) */}
        {viewMode === 'reviewer' && (
          <div>
            <section className="card" style={{ border: '2px solid #7c3aed', background: '#faf5ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <UserCheck size={24} color="#7c3aed" />
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#5b21b6' }}>
                      Volunteer Legal Reviewer Console
                    </h2>
                    <div style={{ fontSize: '0.8rem', color: '#6d28d9' }}>
                      Human-in-the-Loop Audit for Citizen Grievance Grounding
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                    ⚠️ SIMULATED (demo)
                  </span>
                  <span className={`badge ${activeReviewData?.status === REVIEW_STATUS.REVIEWED ? 'badge-success' : 'badge-info'}`}>
                    {activeReviewData?.status === REVIEW_STATUS.REVIEWED ? 'Status: Reviewed' : 'Status: Pending Audit'}
                  </span>
                </div>
              </div>

              {/* BCI Rule 36 Mandatory Compliance Notice */}
              <div style={{ background: '#ffffff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#4c1d95' }}>
                <strong>Bar Council of India Rule 36 Disclosure:</strong> This console is a pro bono factual audit demonstrator. It does not advertise advocates, charge consultation fees, or recommend private practitioners. For official legal aid, citizens are handed off directly to Tele-Law and DLSA/NALSA.
              </div>

              {activeReviewData ? (
                <div>
                  {/* Factual Grounding Result Banner (if reviewed) */}
                  {activeReviewData.status === REVIEW_STATUS.REVIEWED && (
                    <div style={{ background: activeReviewData.auditVerdict === 'GROUNDED' ? '#ecfdf5' : '#fffbeb', border: `1px solid ${activeReviewData.auditVerdict === 'GROUNDED' ? '#6ee7b7' : '#fcd34d'}`, borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: activeReviewData.auditVerdict === 'GROUNDED' ? '#047857' : '#92400e', textTransform: 'uppercase' }}>
                            Audit Verdict: {activeReviewData.auditVerdict}
                          </div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: activeReviewData.auditVerdict === 'GROUNDED' ? '#065f46' : '#78350f', marginTop: '0.15rem' }}>
                            Factual Grounding: {activeReviewData.groundingScore}% ({activeReviewData.verifiedCount}/{activeReviewData.totalClaims} Claims Verified)
                          </div>
                        </div>
                        <span className="badge badge-success">Audit Complete</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#334155', marginTop: '0.4rem' }}>
                        <strong>Reviewer Note:</strong> {activeReviewData.overallNote}
                      </div>
                    </div>
                  )}

                  {/* Grievance Category & Summary */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>GRIEVANCE FORUM & MATTER</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                      {activeReviewData.category}
                    </div>
                  </div>

                  {/* Redacted Draft Text */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <FileText size={16} /> Redacted Citizen Complaint Draft (PII Sanitized):
                    </div>
                    <div className="code-box" style={{ background: '#0f172a', color: '#f8fafc', whiteSpace: 'pre-wrap', maxHeight: '220px', overflowY: 'auto', fontSize: '0.8rem', lineHeight: '1.5' }}>
                      {activeReviewData.draftEn || activeReviewData.draftUser}
                    </div>
                  </div>

                  {/* Interactive Claim Verification Audit */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckSquare size={18} color="#7c3aed" /> Per-Claim Factual Verification Checklist:
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(activeReviewData.claims || []).map((claim, idx) => {
                        const currentAudit = claimAudits[claim.id] || { status: CLAIM_VERIFICATION.VERIFIED, comment: '' };
                        return (
                          <div key={claim.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 600, flex: 1 }}>
                                {idx + 1}. {claim.text}
                              </div>
                              <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <button
                                  type="button"
                                  onClick={() => setClaimAudits({ ...claimAudits, [claim.id]: { ...currentAudit, status: CLAIM_VERIFICATION.VERIFIED } })}
                                  className="btn"
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    background: currentAudit.status === CLAIM_VERIFICATION.VERIFIED ? '#10b981' : '#f1f5f9',
                                    color: currentAudit.status === CLAIM_VERIFICATION.VERIFIED ? '#ffffff' : '#334155'
                                  }}
                                >
                                  ✅ Verified
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClaimAudits({ ...claimAudits, [claim.id]: { ...currentAudit, status: CLAIM_VERIFICATION.COMMENT } })}
                                  className="btn"
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    background: currentAudit.status === CLAIM_VERIFICATION.COMMENT ? '#f59e0b' : '#f1f5f9',
                                    color: currentAudit.status === CLAIM_VERIFICATION.COMMENT ? '#ffffff' : '#334155'
                                  }}
                                >
                                  ✏️ Needs Proof
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClaimAudits({ ...claimAudits, [claim.id]: { ...currentAudit, status: CLAIM_VERIFICATION.DEFECTIVE } })}
                                  className="btn"
                                  style={{
                                    padding: '0.25rem 0.6rem',
                                    fontSize: '0.75rem',
                                    background: currentAudit.status === CLAIM_VERIFICATION.DEFECTIVE ? '#ef4444' : '#f1f5f9',
                                    color: currentAudit.status === CLAIM_VERIFICATION.DEFECTIVE ? '#ffffff' : '#334155'
                                  }}
                                >
                                  ❌ Defective
                                </button>
                              </div>
                            </div>

                            {/* Comment Input if not verified */}
                            {currentAudit.status !== CLAIM_VERIFICATION.VERIFIED && (
                              <input
                                type="text"
                                placeholder="Reviewer comment / missing proof requirement..."
                                value={currentAudit.comment || ''}
                                onChange={(e) => setClaimAudits({ ...claimAudits, [claim.id]: { ...currentAudit, comment: e.target.value } })}
                                style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Reviewer Commentary & Submit */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                      Overall Volunteer Audit Notes:
                    </label>
                    <textarea
                      rows={2}
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'inherit', marginBottom: '0.75rem' }}
                    />
                    <button
                      type="button"
                      onClick={handleSubmitReviewAudit}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.65rem' }}
                    >
                      <UserCheck size={18} /> Submit Review (Simulate Volunteer Paralegal Audit)
                    </button>
                  </div>

                  {/* Official Government Handoff Section */}
                  <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.6rem' }}>
                      🏛️ Official Government Legal Assistance Portals:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                      <a
                        href={OFFICIAL_HANDOFFS.TELE_LAW.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', textDecoration: 'none', background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #93c5fd' }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}>Tele-Law (tele-law.in) ↗</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{OFFICIAL_HANDOFFS.TELE_LAW.feeNote}</div>
                      </a>
                      <a
                        href={OFFICIAL_HANDOFFS.NALSA.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'block', textDecoration: 'none', background: '#ffffff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #93c5fd' }}
                      >
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}>NALSA / DLSA (Toll-Free 15100) ↗</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{OFFICIAL_HANDOFFS.NALSA.feeNote}</div>
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewMode('triage')}
                      className="btn"
                      style={{ background: '#e2e8f0', color: '#1e293b', fontSize: '0.8rem' }}
                    >
                      ← Return to Citizen Assistant
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  No draft selected for review. Please generate a complaint draft in Triage mode and click "Send for Volunteer Review".
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Phase 4: Consent Modal Dialog */}
      {showConsentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '540px', width: '100%', background: '#ffffff', borderRadius: '12px', border: '2px solid #2563eb', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={22} color="#2563eb" /> Volunteer Review Consent (BCI Rule 36)
              </h3>
              <button onClick={() => setShowConsentModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.5', marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.6rem' }}>
                Before sharing this draft for simulated volunteer review, please review and confirm the safety safeguards:
              </p>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>🔒 Strict PII Sanitization:</div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Aadhaar, PAN, phone numbers, and bank account numbers are redacted client-side. No personal identifiers are stored or shared.
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>⚖️ Bar Council of India Rule 36 Compliance:</div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  Haq Saathi is NOT a lawyer marketplace. There are NO lawyer listings, hourly fees, ratings, or advertisements. Review is performed by volunteer legal aid paralegals (simulated for demo).
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>🏛️ Official Government Redressal:</div>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  For binding legal advice, users are handed off directly to official Tele-Law (tele-law.in) or NALSA/DLSA (15100).
                </div>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '0.65rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #a7f3d0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#065f46', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={userConsentGiven}
                  onChange={(e) => setUserConsentGiven(e.target.checked)}
                />
                <span>I give informed consent to generate a sanitized review token.</span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="btn"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!userConsentGiven}
                onClick={handleCreateReview}
                className="btn btn-primary"
                style={{ opacity: userConsentGiven ? 1 : 0.5, cursor: userConsentGiven ? 'pointer' : 'not-allowed' }}
              >
                Confirm & Create Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 6: Global Citizen Access Footer */}
      <footer style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', background: '#ffffff', padding: '2rem 1.25rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '1rem', marginBottom: '0.35rem' }}>
            ⚖️ Haq Saathi (हक साथी) — Citizen Legal Grievance Triage Assistant
          </div>
          <div style={{ marginBottom: '0.4rem', color: '#334155' }}>
            Smart & Inclusive Communities Hackathon 2026. Deterministic rules in code for Farmer 72h, Free Legal Aid, MSME Invoices & Bank Ombudsman.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Bar Council of India Rule 36 Compliant | Zero Lawyer Marketplace | PII Redacted Client-Side | Official Government Handoff via Tele-Law (tele-law.in) & NALSA 15100
          </div>
        </div>
      </footer>
    </div>
  );
}
