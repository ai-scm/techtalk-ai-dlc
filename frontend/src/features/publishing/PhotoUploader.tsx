import { useState, useRef } from 'react';
import * as api from '@/services/api';
import { PhotoResponse } from '@/types';
import { ErrorMessage } from '@/components';

interface PhotoUploaderProps {
  petId: string;
  photos: PhotoResponse[];
  onPhotosChange: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS = 3;

export default function PhotoUploader({ petId, photos, onPhotosChange }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError('El archivo no debe superar los 5MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (photos.length >= MAX_PHOTOS) {
      setError(`Máximo ${MAX_PHOTOS} fotos permitidas`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      await api.photos.upload(petId, file);
      onPhotosChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(photoId: string) {
    setError(null);
    try {
      await api.photos.delete(petId, photoId);
      onPhotosChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la foto');
    }
  }

  return (
    <div data-testid="photo-uploader" className="space-y-4">
      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-3 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group">
            <img
              src={api.photos.getUrl(petId, photo.id)}
              alt={photo.filename}
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
            />
            <button
              data-testid={`photo-delete-button-${photo.id}`}
              onClick={() => handleDelete(photo.id)}
              type="button"
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
              aria-label={`Eliminar foto ${photo.filename}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {photos.length} / {MAX_PHOTOS} fotos
        </p>
        {photos.length < MAX_PHOTOS && (
          <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            {uploading ? 'Subiendo...' : 'Agregar Foto'}
            <input
              data-testid="photo-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleUpload}
              disabled={uploading}
              className="sr-only"
            />
          </label>
        )}
      </div>
    </div>
  );
}
