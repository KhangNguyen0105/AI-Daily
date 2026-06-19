interface SummaryCardProps {
  label: string;
  value: string | number;
  status?: 'healthy' | 'error' | 'unknown';
}

export function SummaryCard({ label, value, status }: SummaryCardProps) {
  const statusColor = {
    healthy: 'bg-accent-green',
    error: 'bg-accent-red',
    unknown: 'bg-text-tertiary',
  };

  return (
    <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-text-primary">{value}</span>
        {status && (
          <span className={`w-2 h-2 rounded-full ${statusColor[status]}`} />
        )}
      </div>
      <p className="text-sm text-text-tertiary mt-1">{label}</p>
    </div>
  );
}
