import { AdoptionRequestDetailResponse } from '@/types';
import { StatusBadge } from '@/components';

interface RequestCardProps {
  request: AdoptionRequestDetailResponse;
  onAction: (id: string, action: string) => void;
}

export default function RequestCard({ request, onAction }: RequestCardProps) {
  const displayName = request.adopter_name || request.adopter_email || 'Adoptante';

  return (
    <div
      data-testid={`request-card-${request.id}`}
      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-base font-semibold text-gray-900">{displayName}</h3>
            <StatusBadge status={request.status} />
          </div>
          <p className="text-sm text-gray-500">
            {new Date(request.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>
      </div>

      {request.message && (
        <p className="text-sm text-gray-700 mb-4">{request.message}</p>
      )}

      {request.status === 'ACCEPTED' && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-sm font-medium text-green-800 mb-1">Información de contacto:</p>
          {request.adopter_email && (
            <p className="text-sm text-green-700">Email: {request.adopter_email}</p>
          )}
          {request.adopter_phone && (
            <p className="text-sm text-green-700">Teléfono: {request.adopter_phone}</p>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {request.status === 'SENT' && (
          <>
            <button
              data-testid={`request-review-button-${request.id}`}
              onClick={() => onAction(request.id, 'review')}
              className="rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
            >
              Revisar
            </button>
            <button
              data-testid={`request-accept-button-${request.id}`}
              onClick={() => onAction(request.id, 'accept')}
              className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Aceptar
            </button>
            <button
              data-testid={`request-reject-button-${request.id}`}
              onClick={() => onAction(request.id, 'reject')}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Rechazar
            </button>
          </>
        )}

        {request.status === 'IN_REVIEW' && (
          <>
            <button
              data-testid={`request-accept-button-${request.id}`}
              onClick={() => onAction(request.id, 'accept')}
              className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Aceptar
            </button>
            <button
              data-testid={`request-reject-button-${request.id}`}
              onClick={() => onAction(request.id, 'reject')}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
            >
              Rechazar
            </button>
          </>
        )}

        {request.status === 'WAITLISTED' && (
          <button
            data-testid={`request-reject-button-${request.id}`}
            onClick={() => onAction(request.id, 'reject')}
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
          >
            Rechazar
          </button>
        )}
      </div>
    </div>
  );
}
