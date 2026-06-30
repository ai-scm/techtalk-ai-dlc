import { useState, useEffect } from 'react';
import { PetFilters } from '@/types';

interface FilterBarProps {
  filters: PetFilters;
  onFilterChange: (filters: PetFilters) => void;
}

export default function FilterBar({ filters, onFilterChange }: FilterBarProps) {
  const [locationInput, setLocationInput] = useState(filters.location || '');

  useEffect(() => {
    setLocationInput(filters.location || '');
  }, [filters.location]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (locationInput !== (filters.location || '')) {
        onFilterChange({
          ...filters,
          location: locationInput || undefined,
        });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [locationInput]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpeciesChange = (value: string) => {
    onFilterChange({ ...filters, species: value || undefined });
  };

  const handleSizeChange = (value: string) => {
    onFilterChange({ ...filters, size: value || undefined });
  };

  const handleAgeChange = (value: string) => {
    onFilterChange({ ...filters, age_group: value || undefined });
  };

  const handleClear = () => {
    setLocationInput('');
    onFilterChange({});
  };

  return (
    <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow-sm border border-gray-200">
      <div className="flex-1 min-w-[150px]">
        <label htmlFor="filter-species" className="mb-1 block text-xs font-medium text-gray-600">
          Especie
        </label>
        <select
          id="filter-species"
          value={filters.species || ''}
          onChange={(e) => handleSpeciesChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          data-testid="filter-species-select"
        >
          <option value="">Todos</option>
          <option value="DOG">Perro</option>
          <option value="CAT">Gato</option>
          <option value="BIRD">Ave</option>
          <option value="RABBIT">Conejo</option>
          <option value="OTHER">Otro</option>
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label htmlFor="filter-location" className="mb-1 block text-xs font-medium text-gray-600">
          Ubicación
        </label>
        <input
          id="filter-location"
          type="text"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          placeholder="Ciudad o región"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          data-testid="filter-location-input"
        />
      </div>

      <div className="flex-1 min-w-[150px]">
        <label htmlFor="filter-size" className="mb-1 block text-xs font-medium text-gray-600">
          Tamaño
        </label>
        <select
          id="filter-size"
          value={filters.size || ''}
          onChange={(e) => handleSizeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          data-testid="filter-size-select"
        >
          <option value="">Todos</option>
          <option value="SMALL">Pequeño</option>
          <option value="MEDIUM">Mediano</option>
          <option value="LARGE">Grande</option>
        </select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label htmlFor="filter-age" className="mb-1 block text-xs font-medium text-gray-600">
          Edad
        </label>
        <select
          id="filter-age"
          value={filters.age_group || ''}
          onChange={(e) => handleAgeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          data-testid="filter-age-select"
        >
          <option value="">Todos</option>
          <option value="PUPPY">Cachorro</option>
          <option value="YOUNG">Joven</option>
          <option value="ADULT">Adulto</option>
          <option value="SENIOR">Senior</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleClear}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        data-testid="filter-clear-button"
      >
        Limpiar
      </button>
    </div>
  );
}
