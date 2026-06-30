import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import { UserResponse } from '@/types';
import { LoadingSpinner, ErrorMessage, ConfirmModal } from '@/components';

export default function AccountPage() {
  const { logout } = useAuth();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await api.users.getMe();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los datos del usuario');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.users.deleteMe();
      logout();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la cuenta');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  const roleLabels: Record<string, string> = {
    ADOPTER: 'Adoptante',
    PUBLISHER: 'Publicador',
    FOUNDATION: 'Fundación',
  };

  if (loading) return <LoadingSpinner />;
  if (error && !user) return <ErrorMessage message={error} />;
  if (!user) return <ErrorMessage message="No se pudo cargar la información" />;

  return (
    <div data-testid="account-page" className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mi Cuenta</h1>

      {error && <ErrorMessage message={error} />}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-500">Nombre</p>
          <p className="text-base text-gray-900">{user.name}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Email</p>
          <p className="text-base text-gray-900">{user.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Rol</p>
          <p className="text-base text-gray-900">{roleLabels[user.role] || user.role}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Miembro desde</p>
          <p className="text-base text-gray-900">
            {new Date(user.created_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Zona de peligro</h2>
        <p className="text-sm text-gray-600 mb-4">
          Al eliminar tu cuenta se borrarán todos tus datos permanentemente. Esta acción no se puede deshacer.
        </p>
        <button
          data-testid="account-delete-button"
          onClick={() => setShowDeleteModal(true)}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Eliminar mi cuenta
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="¿Eliminar cuenta?"
        message="Esta acción es permanente. Todos tus datos, mascotas publicadas y solicitudes serán eliminados."
        confirmText={deleting ? 'Eliminando...' : 'Eliminar cuenta'}
        confirmTestId="account-delete-confirm-button"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
