export default function ErrorScreen({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-white px-8 text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-5">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-8">{message}</p>
      <button
        onClick={onRetry}
        className="w-full max-w-xs bg-tc-green text-white font-semibold text-base py-4 rounded-2xl active:bg-tc-green-dark transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
