import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import { PetDetailResponse, ApiError } from '@/types';
import { LoadingSpinner, ErrorMessage, StatusBadge } from '@/components';

const speciesLabel: Record<string, string> = {
  DOG: 'Perro',
  CAT: 'Gato',
  BIRD: 'Ave',
  RABBIT: 'Conejo',
  OTHER: 'Otro',
};

const sizeLabel: Record<string, string> = {
  SMALL: 'Pequeño',
  MEDIUM: 'Mediano',
  LARGE: 'Grande',
};

const ageLabel: Record<string, string> = {
  PUPPY: 'Cachorro',
  YOUNG: 'Joven',
  ADULT: 'Adulto',
  SENIOR: 'Senior',
};

const speciesEmoji: Record<string, string> = {
  DOG: '🐶',
  CAT: '🐱',
  BIRD: '🐦',
  RABBIT: '🐰',
  OTHER: '🐾',
};

export default function PetDetailPage() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();

  const [pet, setPet] = useState<PetDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      if (!petId) return;
      setIsLoading(true);
      setError('');

      try {
        const data = await api.pets.get(petId);
        setPet(data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError('Error al cargar los detalles de la mascota.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPet();
  }, [petId]);

  const handleSubmitRequest = async () => {
    if (!petId) return;
    setIsSending(true);
    setRequestError('');

    try {
      await api.requests.create({ pet_id: petId, message: message || undefined });
      setRequestSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setRequestError(err.detail);
      } else {
        setRequestError('Error al enviar la solicitud.');
      }
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (!pet) return null;

  const canAdopt = user?.role === 'ADOPTER' && pet.status === 'AVAILABLE';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="pet-detail-page">
      {/* Photo gallery or placeholder */}
      <div className="mb-8" data-testid="pet-detail-photos">
        {pet.photos && pet.photos.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pet.photos.map((photo) => (
              <img
                key={photo.id}
                src={api.getPhotoUrl(pet.id, photo.id)}
                alt={`Foto de ${pet.name}`}
                className="h-64 w-full rounded-lg object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100">
            <span className="text-8xl" aria-hidden="true">
              {speciesEmoji[pet.species] || '🐾'}
            </span>
          </div>
        )}
      </div>

      {/* Pet info */}
      <div className="mb-6 flex items-start justify-between">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="pet-detail-name">
          {pet.name}
        </h1>
        <StatusBadge status={pet.status} type="pet" />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <InfoRow label="Especie" value={speciesLabel[pet.species] || pet.species} />
          <InfoRow label="Tamaño" value={sizeLabel[pet.size] || pet.size} />
          <InfoRow label="Edad" value={ageLabel[pet.age_group] || pet.age_group} />
        </div>
        <div className="space-y-3">
          <InfoRow label="Ubicación" value={pet.location} />
          <InfoRow label="Estado de salud" value={pet.health_status} />
        </div>
      </div>

      {pet.description && (
        <div className="mb-8">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Descripción</h2>
          <p className="text-gray-700 leading-relaxed">{pet.description}</p>
        </div>
      )}

      {/* Adoption request section */}
      {canAdopt && !requestSent && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            ¿Te interesa adoptar a {pet.name}?
          </h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe un mensaje opcional para el publicador..."
            rows={3}
            className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {requestError && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {requestError}
            </div>
          )}
          <button
            onClick={handleSubmitRequest}
            disabled={isSending}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="pet-detail-request-button"
          >
            {isSending ? 'Enviando...' : 'Enviar Solicitud'}
          </button>
        </div>
      )}

      {requestSent && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-green-800">
          <p className="font-semibold">¡Solicitud enviada exitosamente!</p>
          <p className="mt-1 text-sm">
            El publicador revisará tu solicitud y te contactará pronto.
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-500">{label}:</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
