export default function QuestionnaireScreen({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswerId,
  onAnswer,
  onBack,
}) {
  if (!question) return null;

  const progress = questionNumber / totalQuestions;

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div className="flex-1">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-tc-green rounded-full transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-400 flex-shrink-0">
            {questionNumber} / {totalQuestions}
          </span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-5 pb-8">
        {question.branch && (
          <span className="inline-block text-xs font-semibold tracking-wide text-tc-green bg-tc-green-bg px-3 py-1 rounded-full mb-4">
            {question.branch === 'BRANCH_A' ? 'Diabetes — follow-up' : 'Heart — follow-up'}
          </span>
        )}

        <h2 className="text-xl font-bold text-gray-900 leading-snug mb-7">
          {question.text}
        </h2>

        <div className="space-y-3">
          {question.options.map(option => {
            const selected = option.id === selectedAnswerId;
            return (
              <button
                key={option.id}
                onClick={() => onAnswer(question, option)}
                className={[
                  'w-full text-left px-4 py-4 rounded-2xl border-2 transition-all duration-150',
                  'flex items-center gap-3 active:scale-[0.98]',
                  selected
                    ? 'border-tc-green bg-tc-green-bg'
                    : 'border-gray-200 bg-white hover:border-tc-green-border',
                ].join(' ')}
              >
                <div className={[
                  'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
                  selected ? 'border-tc-green bg-tc-green' : 'border-gray-300',
                ].join(' ')}>
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={[
                  'text-sm font-medium leading-snug',
                  selected ? 'text-tc-green-dark' : 'text-gray-700',
                ].join(' ')}>
                  {option.text}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
