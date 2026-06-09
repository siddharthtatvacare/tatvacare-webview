const PACKAGE_META = {
  'Basic Health Package':       { icon: '🌱', color: 'bg-emerald-50 text-emerald-700',   tagline: 'A solid foundation for your annual health check' },
  'Silver Health Package':      { icon: '⭐', color: 'bg-sky-50 text-sky-700',            tagline: 'Enhanced coverage for a more complete picture' },
  'Gold Health Package':        { icon: '🏆', color: 'bg-amber-50 text-amber-700',        tagline: 'Comprehensive head-to-toe health assessment' },
  'Diabetic Profile':           { icon: '💙', color: 'bg-blue-50 text-blue-700',          tagline: 'Targeted monitoring for blood sugar and diabetes markers' },
  'Healthy Heart Profile':      { icon: '❤️', color: 'bg-red-50 text-red-700',            tagline: 'Cardiac risk assessment and heart health screening' },
};

function packageKey(name) {
  // strip M/F suffix variations if any
  return name;
}

export default function ResultScreen({ recommendation, explainError, onExplain, onBook, onRetake }) {
  if (!recommendation) return null;

  const { recommendedPackage, ranked = [] } = recommendation;
  const meta   = PACKAGE_META[packageKey(recommendedPackage.name)] || { icon: '✅', color: 'bg-gray-50 text-gray-700', tagline: '' };
  const price  = recommendedPackage.price.toLocaleString('en-IN');
  const gender = recommendedPackage.gender === 'male' ? 'Male' : 'Female';

  // Packages ranked by fit (0–100), best first
  const maxFit = ranked[0]?.fit || 100;

  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Header band */}
      <div className="bg-tc-green px-5 pt-12 pb-8">
        <p className="text-xs font-semibold tracking-widest text-green-200 uppercase mb-3">Your recommendation</p>
        <div className="flex items-start gap-3">
          <span className="text-4xl">{meta.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight">{recommendedPackage.name}</h1>
            <p className="text-sm text-green-200 mt-1">{gender} variant</p>
          </div>
        </div>
        <p className="text-sm text-green-100 mt-4 leading-relaxed">{meta.tagline}</p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-5 overflow-y-auto">
        {/* Price card */}
        <div className="flex items-center justify-between bg-tc-green-bg rounded-2xl px-5 py-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Package price</p>
            <p className="text-2xl font-bold text-tc-green">₹{price}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-0.5">Oracle code</p>
            <p className="text-sm font-mono font-semibold text-gray-600">{recommendedPackage.oracleCode}</p>
          </div>
        </div>

        {/* Fit ranking */}
        {ranked.length > 0 && (
          <div className="bg-gray-50 rounded-2xl px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">How each package fits you</p>
            <p className="text-[11px] text-gray-400 mb-4">Match of your risk profile to each package (0–100)</p>
            <div className="space-y-3">
              {ranked.map((p, i) => {
                const isWinner = i === 0;
                return (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className={isWinner ? 'font-semibold text-tc-green' : 'text-gray-500'}>
                        {isWinner ? '★ ' : ''}{p.name}
                      </span>
                      <span className={isWinner ? 'font-bold text-tc-green' : 'text-gray-400'}>{p.fit}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isWinner ? 'bg-tc-green' : 'bg-gray-300'}`}
                        style={{ width: `${(p.fit / maxFit) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explain error notice */}
        {explainError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700">Couldn't generate explanation. Please try again.</p>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="px-5 pb-10 space-y-3">
        <button
          className="w-full bg-tc-green text-white font-semibold text-base py-4 rounded-2xl active:bg-tc-green-dark transition-colors"
          onClick={onBook}
        >
          Book This Package
        </button>
        <button
          onClick={onExplain}
          className="w-full bg-white border-2 border-tc-green text-tc-green font-semibold text-base py-4 rounded-2xl active:bg-tc-green-bg transition-colors"
        >
          Why this package? ✨
        </button>
        <button
          onClick={onRetake}
          className="w-full text-sm text-gray-400 py-2 hover:text-gray-600 transition-colors"
        >
          Retake questionnaire
        </button>
      </div>
    </div>
  );
}
