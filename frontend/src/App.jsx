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
  // If this is a fresh tab open (no sessionStorage flag), wipe localStorage
  // so the user starts from scratch instead of resuming a previous session.
  // A page refresh preserves sessionStorage, so mid-questionnaire progress is kept.
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

function buildActiveQuestions(allQuestions, activeBranches) {
  return allQuestions.filter(q => q.branch === null || activeBranches.includes(q.branch));
}

export default function App() {
  const [screen,         setScreen]         = useState('init');
  const [allQuestions,   setAllQuestions]   = useState([]);
  const [sessionId,      setSessionId]      = useState(null);
  const [answers,        setAnswers]        = useState([]);
  const [activeBranches, setActiveBranches] = useState([]);
  const [currentIdx,     setCurrentIdx]     = useState(0);
  const [recommendation, setRecommendation] = useState(null);
  const [explanation,    setExplanation]    = useState(null);
  const [explainError,   setExplainError]   = useState(false);
  const [errorMsg,       setErrorMsg]       = useState('');

  const patientId = getPid();

  useEffect(() => {
    async function boot() {
      const stored = loadStorage();

      // Parallel: fetch questions + init (or restore) session
      const questionsPromise = fetchQuestions();

      if (stored.sessionId && stored.completed && stored.recommendation) {
        const qs = await questionsPromise;
        setAllQuestions(qs.questions);
        setSessionId(stored.sessionId);
        setAnswers(stored.answers || []);
        setActiveBranches(stored.activeBranches || []);
        setRecommendation(stored.recommendation);
        setScreen('result');
        return;
      }

      if (stored.sessionId && stored.answers?.length) {
        const qs = await questionsPromise;
        setAllQuestions(qs.questions);
        const active = buildActiveQuestions(qs.questions, stored.activeBranches || []);
        const answeredIds = new Set((stored.answers || []).map(a => a.questionId));
        const nextIdx = active.findIndex(q => !answeredIds.has(q.id));
        setSessionId(stored.sessionId);
        setAnswers(stored.answers);
        setActiveBranches(stored.activeBranches || []);
        setCurrentIdx(nextIdx === -1 ? active.length - 1 : nextIdx);
        setScreen('questionnaire');
        return;
      }

      // Fresh session — init in parallel with questions fetch
      try {
        const [qs, { sessionId: sid, createdAt }] = await Promise.all([
          questionsPromise,
          initSession(patientId)
        ]);
        setAllQuestions(qs.questions);
        setSessionId(sid);
        persist({ sessionId: sid, patientId, answers: [], activeBranches: [], createdAt });
        setScreen('welcome');
      } catch {
        setErrorMsg('Could not start your session. Please check your connection and try again.');
        setScreen('error');
      }
    }
    boot();
  }, []);

  function handleStart() {
    setScreen('questionnaire');
  }

  function handleAnswer(question, option) {
    const newAnswer = {
      questionId:   question.id,
      questionText: question.text,
      answerId:     option.id,
      answerText:   option.text
    };

    // Replace existing answer for this question if going back and re-answering
    const updatedAnswers = [
      ...answers.filter(a => a.questionId !== question.id),
      newAnswer
    ];

    // Recompute branches: Q3 resets them, others accumulate
    let updatedBranches;
    if (question.id === 'Q3') {
      updatedBranches = option.triggersBranch || [];
    } else {
      updatedBranches = [...activeBranches];
      for (const b of (option.triggersBranch || [])) {
        if (!updatedBranches.includes(b)) updatedBranches.push(b);
      }
    }

    setAnswers(updatedAnswers);
    setActiveBranches(updatedBranches);
    persist({ sessionId, patientId, answers: updatedAnswers, activeBranches: updatedBranches });

    const activeQs = buildActiveQuestions(allQuestions, updatedBranches);
    const nextIdx  = currentIdx + 1;

    if (nextIdx >= activeQs.length) {
      submit(updatedAnswers, updatedBranches);
    } else {
      setCurrentIdx(nextIdx);
    }
  }

  function handleBack() {
    if (currentIdx === 0) {
      setScreen('welcome');
    } else {
      setCurrentIdx(i => i - 1);
    }
  }

  async function submit(finalAnswers, finalBranches) {
    setScreen('submitting');
    const delays = [1000, 2000, 4000];
    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        await saveResponses(sessionId, finalAnswers, finalBranches);
        const rec = await getRecommendation(sessionId);
        setRecommendation(rec);
        persist({ sessionId, patientId, answers: finalAnswers, activeBranches: finalBranches, recommendation: rec, completed: true });
        setScreen('result');
        return;
      } catch {
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, delays[attempt]));
        }
      }
    }
    setErrorMsg('We couldn\'t save your answers. Please check your connection and try again.');
    setScreen('error');
  }

  async function handleExplain() {
    setExplainError(false);
    setExplanation(null);
    setScreen('explaining');
    try {
      const { explanation: exp } = await getExplanation(sessionId);
      setExplanation(exp);
      setScreen('explain');
    } catch {
      setExplainError(true);
      setScreen('result');
    }
  }

  function handleRetry() {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  function handleBook() {
    // 1. Server-to-server: backend assembles full payload from MongoDB and POSTs to Fortis webhook.
    //    Fire-and-forget — Fortis downtime must never block the user.
    notifyBooking(sessionId).catch(() => {});

    // 2. JS bridge: postMessage to the parent tab (myFortis) with the key recommendation fields
    //    so their UI can pre-fill or confirm the booking flow.
    if (window.opener) {
      window.opener.postMessage({
        type:        'FORTIS_PACKAGE_BOOKED',
        patientId,
        sessionId,
        oracleCode:  recommendation?.recommendedPackage?.oracleCode,
        packageName: recommendation?.recommendedPackage?.name,
        gender:      recommendation?.recommendedPackage?.gender,
        price:       recommendation?.recommendedPackage?.price
      }, '*');
      // Small delay so the opener's event loop processes the message before the tab closes
      setTimeout(() => window.close(), 150);
    } else {
      window.history.back();
    }
  }

  async function handleRetake() {
    try {
      // Provision a brand-new session in MongoDB before resetting local state
      const { sessionId: newSid, createdAt } = await initSession(patientId);
      persist({ sessionId: newSid, patientId, answers: [], activeBranches: [], createdAt });
      setSessionId(newSid);
    } catch {
      // If init fails, still let the user restart locally — they'll get a proper session on submit
      persist({ sessionId: null, patientId, answers: [], activeBranches: [] });
      setSessionId(null);
    }
    setAnswers([]);
    setActiveBranches([]);
    setCurrentIdx(0);
    setRecommendation(null);
    setExplanation(null);
    setExplainError(false);
    setScreen('welcome');
  }

  const activeQs   = buildActiveQuestions(allQuestions, activeBranches);
  const question   = activeQs[currentIdx];
  const selAnswerId = answers.find(a => a.questionId === question?.id)?.answerId;

  switch (screen) {
    case 'init':
      return <LoadingScreen message="Setting up your session…" />;
    case 'submitting':
      return <LoadingScreen message="Finding your best match…" />;
    case 'explaining':
      return <LoadingScreen message="Generating your personalised explanation…" />;
    case 'error':
      return <ErrorScreen message={errorMsg} onRetry={handleRetry} />;
    case 'welcome':
      return <WelcomeScreen onStart={handleStart} />;
    case 'questionnaire':
      return (
        <QuestionnaireScreen
          question={question}
          questionNumber={currentIdx + 1}
          totalQuestions={activeQs.length}
          selectedAnswerId={selAnswerId}
          onAnswer={handleAnswer}
          onBack={handleBack}
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
    default:
      return null;
  }
}
