export default function WelcomeScreen({ onStart }) {
  return (
    <div className="flex flex-col min-h-dvh bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-tc-green uppercase mb-1">Powered by TatvaCare</p>
          <p className="text-xs text-gray-400">in partnership with Fortis Hospitals</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-tc-green-bg flex items-center justify-center">
          <HeartIcon />
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 px-5 pb-8">
        <div className="bg-tc-green-bg rounded-2xl p-6 mb-6">
          <div className="flex gap-2 mb-4">
            {['BMI', 'HbA1c', 'BP', 'Lipids'].map(chip => (
              <span key={chip} className="text-xs font-semibold bg-white text-tc-green px-2.5 py-1 rounded-full border border-tc-green-border">
                {chip}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug mb-3">
            Find the health package that's right for you
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Answer a few quick questions about your health profile and we'll match you to the Fortis package that covers what matters most for you.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: '8–13', sub: 'questions' },
            { label: '~3', sub: 'minutes' },
            { label: '5', sub: 'packages' },
          ].map(({ label, sub }) => (
            <div key={sub} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-tc-green">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* What to expect */}
        <div className="space-y-3 mb-8">
          {[
            { icon: '🩺', text: 'Your health history and any diagnosed conditions' },
            { icon: '👨‍👩‍👧', text: 'Family history of diabetes or heart conditions' },
            { icon: '🎯', text: 'Your primary health concern today' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{icon}</span>
              <p className="text-sm text-gray-600 leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 pb-10">
        <button
          onClick={onStart}
          className="w-full bg-tc-green text-white font-semibold text-base py-4 rounded-2xl active:bg-tc-green-dark transition-colors"
        >
          Get Started →
        </button>
        <p className="text-xs text-center text-gray-400 mt-3">
          Your answers are used only to recommend a package — they are not stored as medical records.
        </p>
      </div>
    </div>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a7a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
