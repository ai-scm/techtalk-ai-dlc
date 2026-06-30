import { useEffect, useState } from 'react';
import * as api from '@/services/api';
import { AdoptionRequestResponse } from '@/types';
import { LoadingSpinner, ErrorMessage, StatusBadge, EmptyState } from '@/components';

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<AdoptionRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
    try {
      const response = await api.requests.getMine();
      setRequests(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(requestId: string) {
    setError(null);
    try {
      await api.requests.cancel(requestId);
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar la solicitud');
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error && requests.length === 0) return <ErrorMessage message={error} />;

  return (
    <div data-testid="my-requests-page" className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mis Solicitudes de Adopción</h1>

      {error && <ErrorMessage message={error} />}

      {requests.length === 0 ? (
        <EmptyState
          title="No tienes solicitudes"
          description="Cuando solicites adoptar una mascota, aparecerá aquí."
        />
      ) : (
        <div data-testid="my-requests-list" className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 truncate">
                      Mascota: {req.pet_id}
                    </h3>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-gray-500 mb-1">
                    Fecha: {new Date(req.created_at).toLocaleDateString('es-ES')}
                  </p>
                  {req.message && (
                    <p className="text-sm text-gray-600 truncate">
                      {req.message}
                    </p>
                  )}
                </div>
                {(req.status === 'SENT' || req.status === 'IN_REVIEW') && (
                  <button
                    data-testid={`request-cancel-button-${req.id}`}
                    onClick={() => handleCancel(req.id)}
                    className="ml-4 shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
