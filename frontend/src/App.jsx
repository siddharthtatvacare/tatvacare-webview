import { useState, useEffect } from 'react';
import { fetchQuestions, initSession, saveResponses, getRecommendation, getExplanation, notifyBooking } from './api/client';
import WelcomeScreen      from './screens/WelcomeScreen';
import QuestionnaireScreen from './screens/QuestionnaireScreen';
import LoadingScreen      from './screens/LoadingScreen';
import ResultScreen       from './screens/ResultScreen';
import ExplainScreen      from './screens/ExplainScreen';
import ErrorScreen        from './screens/ErrorScreen';

const STORAGE_KEY  = 'tc_fortis_session';
const SESSION_FLAG = 'tc_fortis_active'; // sessionStorage — cleared when tab closes

function getPid() {
  return new URLSearchParams(window.location.search).get('pid') || 'DEMO_PATIENT';
}

function loadStorage() {
  // Fresh tab open (no sessionStorage flag) → wipe localStorage so the user starts
  // from scratch. A refresh keeps the flag, so mid-questionnaire progress survives.
  if (!sessionStorage.getItem(SESSION_FLAG)) {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(SESSION_FLAG, '1');
  }
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function persist(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Group the flat question list into one screen per category (5 screens × 2 questions).
function buildScreens(questions, categories) {
  return categories.map(cat => ({
    category: cat,
    questions: questions.filter(q => q.category === cat)
  }));
}

// `selections` is a map: questionId -> optionId (single) | [optionIds] (multi).
// Flatten to the API's [{questionId, answerId, ...}] shape (one row per chosen option).
function flattenAnswers(questions, selections) {
  const rows = [];
  for (const q of questions) {
    const sel = selections[q.id];
    if (sel == null) continue;
    const ids = Array.isArray(sel) ? sel : [sel];
    for (const optId of ids) {
      const opt = q.options.find(o => o.id === optId);
      rows.push({ questionId: q.id, questionText: q.text, answerId: optId, answerText: opt?.text || optId });
    }
  }
  return rows;
}

// A category screen is complete when every question on it has at least one selection.
function screenComplete(screen, selections) {
  return screen.questions.every(q => {
    const s = selections[q.id];
    return Array.isArray(s) ? s.length > 0 : !!s;
  });
}

export default function App() {
  const [screen,         setScreen]         = useState('init');
  const [allQuestions,   setAllQuestions]   = useState([]);
  const [categories,     setCategories]     = useState([]);
  const [sessionId,      setSessionId]      = useState(null);
  const [selections,     setSelections]     = useState({});   // questionId -> id | [ids]
  const [screenIdx,      setScreenIdx]      = useState(0);
  const [recommendation, setRecommendation] = useState(null);
  const [explanation,    setExplanation]    = useState(null);
  const [explainError,   setExplainError]   = useState(false);
  const [errorMsg,       setErrorMsg]       = useState('');

  const patientId = getPid();
  const screens   = buildScreens(allQuestions, categories);

  useEffect(() => {
    async function boot() {
      const stored = loadStorage();
      const questionsPromise = fetchQuestions();

      // Completed session → restore the result
      if (stored.sessionId && stored.completed && stored.recommendation) {
        const qs = await questionsPromise;
        setAllQuestions(qs.questions); setCategories(qs.categories);
        setSessionId(stored.sessionId);
        setSelections(stored.selections || {});
        setRecommendation(stored.recommendation);
        setScreen('result');
        return;
      }

      // Mid-questionnaire → resume at the first incomplete category screen
      if (stored.sessionId && stored.selections && Object.keys(stored.selections).length) {
        const qs = await questionsPromise;
        setAllQuestions(qs.questions); setCategories(qs.categories);
        const scr = buildScreens(qs.questions, qs.categories);
        const next = scr.findIndex(s => !screenComplete(s, stored.selections));
        setSessionId(stored.sessionId);
        setSelections(stored.selections);
        setScreenIdx(next === -1 ? scr.length - 1 : next);
        setScreen('questionnaire');
        return;
      }

      // Fresh session
      try {
        const [qs, { sessionId: sid, createdAt }] = await Promise.all([
          questionsPromise, initSession(patientId)
        ]);
        setAllQuestions(qs.questions); setCategories(qs.categories);
        setSessionId(sid);
        persist({ sessionId: sid, patientId, selections: {}, createdAt });
        setScreen('welcome');
      } catch {
        setErrorMsg('Could not start your session. Please check your connection and try again.');
        setScreen('error');
      }
    }
    boot();
  }, []);

  function handleStart() { setScreen('questionnaire'); }

  // toggle a selection for a question (single replaces, multi toggles with exclusive "none")
  function handleSelect(question, option) {
    setSelections(prev => {
      let next;
      if (question.type === 'multi') {
        const cur = Array.isArray(prev[question.id]) ? prev[question.id] : [];
        const isExclusive = /_(none|active)$/.test(option.id); // None / Physically active
        if (cur.includes(option.id)) {
          next = { ...prev, [question.id]: cur.filter(id => id !== option.id) };
        } else if (isExclusive) {
          next = { ...prev, [question.id]: [option.id] };
        } else {
          const cleaned = cur.filter(id => !/_(none|active)$/.test(id));
          next = { ...prev, [question.id]: [...cleaned, option.id] };
        }
      } else {
        next = { ...prev, [question.id]: option.id };
      }
      persist({ sessionId, patientId, selections: next });
      return next;
    });
  }

  function handleContinue() {
    const nextIdx = screenIdx + 1;
    if (nextIdx >= screens.length) submit(selections);
    else setScreenIdx(nextIdx);
  }

  function handleBack() {
    if (screenIdx === 0) setScreen('welcome');
    else setScreenIdx(i => i - 1);
  }

  async function submit(finalSelections) {
    setScreen('submitting');
    const finalAnswers = flattenAnswers(allQuestions, finalSelections);
    const delays = [1000, 2000, 4000];
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        await saveResponses(sessionId, finalAnswers, []); // no branches in V2
        const rec = await getRecommendation(sessionId);
        setRecommendation(rec);
        persist({ sessionId, patientId, selections: finalSelections, recommendation: rec, completed: true });
        setScreen('result');
        return;
      } catch {
        if (attempt < 3) await new Promise(r => setTimeout(r, delays[attempt]));
      }
    }
    setErrorMsg('We couldn\'t save your answers. Please check your connection and try again.');
    setScreen('error');
  }

  async function handleExplain() {
    setExplainError(false); setExplanation(null); setScreen('explaining');
    try {
      const { explanation: exp } = await getExplanation(sessionId);
      setExplanation(exp); setScreen('explain');
    } catch {
      setExplainError(true); setScreen('result');
    }
  }

  function handleRetry() { localStorage.removeItem(STORAGE_KEY); window.location.reload(); }

  function handleBook() {
    notifyBooking(sessionId).catch(() => {});
    if (window.opener) {
      window.opener.postMessage({
        type:        'FORTIS_PACKAGE_BOOKED',
        patientId, sessionId,
        oracleCode:  recommendation?.recommendedPackage?.oracleCode,
        packageName: recommendation?.recommendedPackage?.name,
        gender:      recommendation?.recommendedPackage?.gender,
        price:       recommendation?.recommendedPackage?.price
      }, '*');
      setTimeout(() => window.close(), 150);
    } else {
      window.history.back();
    }
  }

  async function handleRetake() {
    try {
      const { sessionId: newSid, createdAt } = await initSession(patientId);
      persist({ sessionId: newSid, patientId, selections: {}, createdAt });
      setSessionId(newSid);
    } catch {
      persist({ sessionId: null, patientId, selections: {} });
      setSessionId(null);
    }
    setSelections({}); setScreenIdx(0);
    setRecommendation(null); setExplanation(null); setExplainError(false);
    setScreen('welcome');
  }

  const currentScreen = screens[screenIdx];

  switch (screen) {
    case 'init':       return <LoadingScreen message="Setting up your session…" />;
    case 'submitting': return <LoadingScreen message="Finding your best match…" />;
    case 'explaining': return <LoadingScreen message="Generating your personalised explanation…" />;
    case 'error':      return <ErrorScreen message={errorMsg} onRetry={handleRetry} />;
    case 'welcome':    return <WelcomeScreen onStart={handleStart} />;
    case 'questionnaire':
      return (
        <QuestionnaireScreen
          screen={currentScreen}
          screenNumber={screenIdx + 1}
          totalScreens={screens.length}
          selections={selections}
          onSelect={handleSelect}
          onContinue={handleContinue}
          onBack={handleBack}
          canContinue={currentScreen ? screenComplete(currentScreen, selections) : false}
          isLast={screenIdx === screens.length - 1}
        />
      );
    case 'result':
      return (
        <ResultScreen
          recommendation={recommendation}
          explainError={explainError}
          onExplain={handleExplain}
          onBook={handleBook}
          onRetake={handleRetake}
        />
      );
    case 'explain':
      return (
        <ExplainScreen
          recommendation={recommendation}
          explanation={explanation}
          onBack={() => setScreen('result')}
          onBook={handleBook}
          onRetake={handleRetake}
        />
      );
    default: return null;
  }
}
