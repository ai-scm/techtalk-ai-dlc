import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '@/services/api';
import { AdoptionRequestDetailResponse } from '@/types';
import { LoadingSpinner, ErrorMessage, EmptyState } from '@/components';
import RequestCard from './RequestCard';

export default function PetRequestsPage() {
  const { petId } = useParams<{ petId: string }>();
  const [requests, setRequests] = useState<AdoptionRequestDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [petId]);

  async function fetchRequests() {
    if (!petId) return;
    try {
      const response = await api.requests.getForPet(petId);
      setRequests(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(requestId: string, action: string) {
    setError(null);
    try {
      switch (action) {
        case 'accept':
          await api.requests.accept(requestId);
          break;
        case 'reject':
          await api.requests.reject(requestId);
          break;
        case 'review':
          await api.requests.review(requestId);
          break;
      }
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la solicitud');
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error && requests.length === 0) return <ErrorMessage message={error} />;

  return (
    <div data-testid="pet-requests-page" className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Solicitudes de Adopción</h1>

      {error && <ErrorMessage message={error} />}

      {requests.length === 0 ? (
        <EmptyState
          title="Sin solicitudes"
          description="Aún no hay solicitudes de adopción para esta mascota."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  );
}
