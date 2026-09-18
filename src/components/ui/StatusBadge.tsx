type StatusVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

const STATUS_MAP: Record<string, StatusVariant> = {
  ACTIVE: 'success', ON: 'success', PRESENT: 'success', PAID: 'success', APPROVED: 'success',
  PENDING: 'warning', DRAFT: 'warning', SUBMITTED: 'info', IN_PROGRESS: 'info',
  OVERDUE: 'danger', ABSENT: 'danger', REJECTED: 'danger', CANCELLED: 'danger',
  ON_LEAVE: 'info', SICK_LEAVE: 'info', UNPAID_LEAVE: 'purple',
  HOLIDAY: 'purple', WEEKEND_OFF: 'default',
  OPEN: 'success', CLOSED: 'default', LOCKED: 'warning',
  CHECKED: 'info', RATE_ENTERED: 'info', CALCULATED: 'info',
  PAYMENT_PROCESSING: 'info', RETURNED: 'danger',
  INACTIVE: 'default', TERMINATED: 'danger',
  FULL_TIME: 'info', PART_TIME: 'warning', CONTRACT: 'purple',
};

function getVariant(status: string, override?: StatusVariant): StatusVariant {
  if (override) return override;
  return STATUS_MAP[status] || 'default';
}

export function StatusBadge({ status, variant, className = '' }: StatusBadgeProps) {
  const v = getVariant(status, variant);
  const styles: Record<StatusVariant, string> = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  const label = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[v]} ${className}`}>
      {label}
    </span>
  );
}
