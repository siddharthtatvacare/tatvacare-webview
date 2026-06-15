// One screen per category — shows that category's two questions together.
// Single-select questions render as radios; multi-select as checkboxes.
export default function QuestionnaireScreen({
  screen,
  screenNumber,
  totalScreens,
  selections,
  onSelect,
  onContinue,
  onBack,
  canContinue,
  isLast,
}) {
  if (!screen) return null;
  const progress = screenNumber / totalScreens;

  function isSelected(question, optionId) {
    const sel = selections[question.id];
    return question.type === 'multi'
      ? Array.isArray(sel) && sel.includes(optionId)
      : sel === optionId;
  }

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">
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
              <div className="h-full bg-tc-green rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          <span className="text-xs font-medium text-gray-400 flex-shrink-0">{screenNumber} / {totalScreens}</span>
        </div>
        <span className="inline-block text-xs font-semibold tracking-wide text-tc-green bg-tc-green-bg px-3 py-1 rounded-full">
          {screen.category}
        </span>
      </div>

      {/* The two questions in this category */}
      <div className="flex-1 px-5 pt-3 pb-4 overflow-y-auto space-y-7">
        {screen.questions.map(question => (
          <div key={question.id}>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900 leading-snug pr-3">{question.text}</h2>
              {question.type === 'multi' && (
                <span className="text-[11px] font-medium text-gray-400 flex-shrink-0">select all that apply</span>
              )}
            </div>

            <div className="space-y-2.5">
              {question.options.map(option => {
                const selected = isSelected(question, option.id);
                const multi = question.type === 'multi';
                return (
                  <button
                    key={option.id}
                    onClick={() => onSelect(question, option)}
                    className={[
                      'w-full text-left px-4 py-3.5 rounded-2xl border-2 transition-all duration-150',
                      'flex items-center gap-3 active:scale-[0.98]',
                      selected ? 'border-tc-green bg-tc-green-bg' : 'border-gray-200 bg-white hover:border-tc-green-border',
                    ].join(' ')}
                  >
                    <div className={[
                      'w-5 h-5 flex-shrink-0 flex items-center justify-center border-2',
                      multi ? 'rounded-md' : 'rounded-full',
                      selected ? 'border-tc-green bg-tc-green' : 'border-gray-300',
                    ].join(' ')}>
                      {selected && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={['text-sm font-medium leading-snug', selected ? 'text-tc-green-dark' : 'text-gray-700'].join(' ')}>
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Continue */}
      <div className="px-5 pb-8 pt-3 border-t border-gray-100">
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={[
            'w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-150 active:scale-[0.98]',
            canContinue ? 'bg-tc-green text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {isLast ? 'See my recommendation' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
