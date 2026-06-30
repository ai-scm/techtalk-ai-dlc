import { useState, useEffect } from 'react';
import * as api from '@/services/api';
import { PetResponse, PetFilters, ApiError } from '@/types';
import { LoadingSpinner, ErrorMessage, Pagination, EmptyState } from '@/components';
import FilterBar from './FilterBar';
import PetCard from './PetCard';

export default function CatalogPage() {
  const [pets, setPets] = useState<PetResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [filters, setFilters] = useState<PetFilters>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPets = async () => {
      setIsLoading(true);
      setError('');

      try {
        const response = await api.pets.list(filters, page, pageSize);
        setPets(response.items);
        setTotal(response.total);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError('Error al cargar las mascotas. Intenta de nuevo.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPets();
  }, [filters, page, pageSize]);

  const handleFilterChange = (newFilters: PetFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8" data-testid="catalog-page">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">
        Mascotas en Adopción
      </h1>

      <FilterBar filters={filters} onFilterChange={handleFilterChange} />

      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {error && !isLoading && <ErrorMessage message={error} />}

      {!isLoading && !error && pets.length === 0 && (
        <div data-testid="catalog-empty-message">
          <EmptyState
            title="No se encontraron mascotas"
            message="Intenta ajustar los filtros de búsqueda."
          />
        </div>
      )}

      {!isLoading && !error && pets.length > 0 && (
        <>
          <div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            data-testid="catalog-pet-list"
          >
            {pets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
