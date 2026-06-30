export default function LoadingSpinner() {
  return (
    <div
      className="flex items-center justify-center p-8"
      data-testid="loading-spinner"
      role="status"
      aria-label="Cargando"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
