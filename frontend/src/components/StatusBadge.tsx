interface StatusBadgeProps {
  status: string;
  type: "pet" | "request";
}

const petStatusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 border-green-200",
  IN_PROCESS: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ADOPTED: "bg-blue-100 text-blue-800 border-blue-200",
};

const requestStatusColors: Record<string, string> = {
  SENT: "bg-gray-100 text-gray-700 border-gray-200",
  IN_REVIEW: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ACCEPTED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
  WAITLISTED: "bg-purple-100 text-purple-800 border-purple-200",
  CANCELLED: "bg-gray-200 text-gray-600 border-gray-300",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Disponible",
  IN_PROCESS: "En proceso",
  ADOPTED: "Adoptado",
  SENT: "Enviada",
  IN_REVIEW: "En revisión",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  WAITLISTED: "En espera",
  CANCELLED: "Cancelada",
};

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const colorMap = type === "pet" ? petStatusColors : requestStatusColors;
  const colorClasses = colorMap[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const label = statusLabels[status] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClasses}`}
      data-testid="status-badge"
      aria-label={`Estado: ${label}`}
    >
      {label}
    </span>
  );
}
