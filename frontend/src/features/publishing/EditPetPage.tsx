import { useEffect, useState, FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '@/services/api';
import { PetDetailResponse } from '@/types';
import { LoadingSpinner, ErrorMessage } from '@/components';
import PhotoUploader from './PhotoUploader';

const SPECIES_OPTIONS = [
  { value: 'DOG', label: 'Perro' },
  { value: 'CAT', label: 'Gato' },
  { value: 'BIRD', label: 'Ave' },
  { value: 'RABBIT', label: 'Conejo' },
  { value: 'OTHER', label: 'Otro' },
];

const SIZE_OPTIONS = [
  { value: 'SMALL', label: 'Pequeño' },
  { value: 'MEDIUM', label: 'Mediano' },
  { value: 'LARGE', label: 'Grande' },
];

const AGE_GROUP_OPTIONS = [
  { value: 'PUPPY', label: 'Cachorro' },
  { value: 'YOUNG', label: 'Joven' },
  { value: 'ADULT', label: 'Adulto' },
  { value: 'SENIOR', label: 'Senior' },
];

export default function EditPetPage() {
  const { id } = useParams<{ id: string }>();
  const [pet, setPet] = useState<PetDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    species: 'DOG',
    size: 'MEDIUM',
    age_group: 'ADULT',
    location: '',
    health_status: '',
    description: '',
  });

  const [status, setStatus] = useState('AVAILABLE');

  useEffect(() => {
    async function fetchPet() {
      if (!id) return;
      try {
        const data = await api.pets.get(id);
        setPet(data);
        setFormData({
          name: data.name,
          species: data.species,
          size: data.size,
          age_group: data.age_group,
          location: data.location,
          health_status: data.health_status,
          description: data.description,
        });
        setStatus(data.status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar la mascota');
      } finally {
        setLoading(false);
      }
    }
    fetchPet();
  }, [id]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      await api.pets.update(id, formData);
      if (status !== pet?.status) {
        await api.pets.updateStatus(id, status);
      }
      setSuccessMessage('Mascota actualizada correctamente');
      const updatedPet = await api.pets.get(id);
      setPet(updatedPet);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotosChange() {
    if (!id) return;
    const updatedPet = await api.pets.get(id);
    setPet(updatedPet);
  }

  function getStatusOptions() {
    if (!pet) return [];
    switch (pet.status) {
      case 'IN_PROCESS':
        return [
          { value: 'IN_PROCESS', label: 'En Proceso' },
          { value: 'ADOPTED', label: 'Adoptado' },
          { value: 'AVAILABLE', label: 'Disponible' },
        ];
      case 'ADOPTED':
        return [{ value: 'ADOPTED', label: 'Adoptado' }];
      case 'AVAILABLE':
      default:
        return [{ value: 'AVAILABLE', label: 'Disponible' }];
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error && !pet) return <ErrorMessage message={error} />;
  if (!pet) return <ErrorMessage message="Mascota no encontrada" />;

  const statusOptions = getStatusOptions();
  const isStatusDisabled = pet.status === 'ADOPTED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar Mascota</h1>

      {error && <ErrorMessage message={error} />}
      {successMessage && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <form data-testid="edit-pet-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">Especie</label>
            <select id="species" name="species" value={formData.species} onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              {SPECIES_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">Tamaño</label>
            <select id="size" name="size" value={formData.size} onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              {SIZE_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
          <div>
            <label htmlFor="age_group" className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
            <select id="age_group" name="age_group" value={formData.age_group} onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              {AGE_GROUP_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
          <input id="location" name="location" type="text" required value={formData.location} onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>

        <div>
          <label htmlFor="health_status" className="block text-sm font-medium text-gray-700 mb-1">Estado de Salud</label>
          <input id="health_status" name="health_status" type="text" required value={formData.health_status} onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea id="description" name="description" rows={4} required value={formData.description} onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select id="status" data-testid="edit-pet-status-select" value={status} onChange={(e) => setStatus(e.target.value)}
            disabled={isStatusDisabled}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed">
            {statusOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>

        <button data-testid="edit-pet-save-button" type="submit" disabled={saving}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fotos</h2>
        <PhotoUploader petId={id!} photos={pet.photos} onPhotosChange={handlePhotosChange} />
      </div>
    </div>
  );
}
