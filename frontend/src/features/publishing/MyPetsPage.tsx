import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '@/services/api';
import { PetResponse } from '@/types';
import { LoadingSpinner, ErrorMessage, StatusBadge, EmptyState } from '@/components';

export default function MyPetsPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState<PetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPets() {
      try {
        const response = await api.pets.getMine();
        setPets(response.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar mascotas');
      } finally {
        setLoading(false);
      }
    }
    fetchPets();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div data-testid="my-pets-page" className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis Mascotas</h1>
        <button
          data-testid="my-pets-new-button"
          onClick={() => navigate('/pets/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Nueva Mascota
        </button>
      </div>

      {pets.length === 0 ? (
        <EmptyState
          title="No tienes mascotas publicadas"
          description="Publica tu primera mascota para que encuentre un hogar."
        />
      ) : (
        <div data-testid="my-pets-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <div
              key={pet.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 truncate">{pet.name}</h3>
                <StatusBadge status={pet.status} />
              </div>
              <p className="text-sm text-gray-500 mb-1">
                {pet.species} · {pet.size} · {pet.age_group}
              </p>
              <p className="text-sm text-gray-500 mb-4">{pet.location}</p>
              <div className="flex gap-3">
                <Link
                  to={`/pets/${pet.id}/edit`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Editar
                </Link>
                <Link
                  to={`/pets/${pet.id}/requests`}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Solicitudes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
