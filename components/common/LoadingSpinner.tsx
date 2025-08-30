export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-gray-700 border-t-blue-500 animate-spin"></div>
        <div className="mt-4 text-center text-gray-400 text-sm">Loading...</div>
      </div>
    </div>
  );
}
