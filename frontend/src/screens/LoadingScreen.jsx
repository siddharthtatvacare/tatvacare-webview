export default function LoadingScreen({ message }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-white px-8">
      <div className="w-14 h-14 rounded-full border-4 border-tc-green-bg border-t-tc-green animate-spin mb-6" />
      <p className="text-base font-medium text-gray-700 text-center">{message}</p>
    </div>
  );
}
