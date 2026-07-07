import { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '@/services/api';
import { ErrorMessage } from '@/components';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 3;

export default function CreatePetPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    species: 'DOG',
    size: 'MEDIUM',
    age_group: 'ADULT',
    location: '',
    health_status: '',
    description: '',
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setError(null);

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        setError('Cada archivo no debe superar los 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('Solo se permiten imágenes JPG o PNG');
        return;
      }
    }

    const totalFiles = selectedFiles.length + files.length;
    if (totalFiles > MAX_PHOTOS) {
      setError(`Máximo ${MAX_PHOTOS} fotos permitidas`);
      return;
    }

    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    // Generate previews
    const newPreviews = [...previews];
    for (const file of files) {
      newPreviews.push(URL.createObjectURL(file));
    }
    setPreviews(newPreviews);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeFile(index: number) {
    const newFiles = [...selectedFiles];
    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedFiles.length === 0) {
      setError('Debes agregar al menos una foto de la mascota');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create the pet
      const newPet = await api.pets.create(formData);

      // 2. Upload photos
      for (const file of selectedFiles) {
        await api.photos.upload(newPet.id, file);
      }

      // Clean up preview URLs
      previews.forEach(URL.revokeObjectURL);

      navigate('/pets/mine');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la mascota');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Publicar Nueva Mascota</h1>

      {error && <ErrorMessage message={error} />}

      <form data-testid="create-pet-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            value={formData.name}
            onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="species" className="block text-sm font-medium text-gray-700 mb-1">
              Especie
            </label>
            <select
              id="species"
              name="species"
              value={formData.species}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {SPECIES_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
              Tamaño
            </label>
            <select
              id="size"
              name="size"
              value={formData.size}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="age_group" className="block text-sm font-medium text-gray-700 mb-1">
              Edad
            </label>
            <select
              id="age_group"
              name="age_group"
              value={formData.age_group}
              onChange={handleChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              {AGE_GROUP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Ubicación
          </label>
          <input
            id="location"
            name="location"
            type="text"
            required
            value={formData.location}
            onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="health_status" className="block text-sm font-medium text-gray-700 mb-1">
            Estado de Salud
          </label>
          <input
            id="health_status"
            name="health_status"
            type="text"
            required
            value={formData.health_status}
            onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            required
            value={formData.description}
            onChange={handleChange}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Photo upload section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fotos <span className="text-red-500">*</span>
            <span className="ml-1 font-normal text-gray-500">(mín. 1, máx. {MAX_PHOTOS})</span>
          </label>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-28 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    aria-label={`Eliminar foto ${index + 1}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {selectedFiles.length < MAX_PHOTOS && (
            <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-400 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:border-indigo-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Agregar Foto ({selectedFiles.length}/{MAX_PHOTOS})
              <input
                ref={fileInputRef}
                data-testid="photo-upload-input"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileSelect}
                className="sr-only"
              />
            </label>
          )}

          <p className="mt-1 text-xs text-gray-500">JPG o PNG, máximo 5MB por foto</p>
        </div>

        <button
          data-testid="create-pet-submit-button"
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Publicando...' : 'Publicar Mascota'}
        </button>
      </form>
    </div>
  );
}
