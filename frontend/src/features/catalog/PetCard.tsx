import { useNavigate } from 'react-router-dom';
import { PetResponse } from '@/types';

interface PetCardProps {
  pet: PetResponse;
}

const speciesEmoji: Record<string, string> = {
  DOG: '🐶',
  CAT: '🐱',
  BIRD: '🐦',
  RABBIT: '🐰',
  OTHER: '🐾',
};

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

export default function PetCard({ pet }: PetCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/catalog/${pet.id}`);
  };

  return (
    <article
      className="cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Ver detalles de ${pet.name}`}
      data-testid={`pet-card-${pet.id}`}
    >
      <div className="flex h-48 items-center justify-center bg-gray-100">
        <span className="text-6xl" aria-hidden="true">
          {speciesEmoji[pet.species] || '🐾'}
        </span>
      </div>

      <div className="p-4">
        <h3 className="mb-2 text-lg font-bold text-gray-900">{pet.name}</h3>

        <div className="mb-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
            {speciesLabel[pet.species] || pet.species}
          </span>
          <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
            {sizeLabel[pet.size] || pet.size}
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-gray-500">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>{pet.location}</span>
        </div>
      </div>
    </article>
  );
}
