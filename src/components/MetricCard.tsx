import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string;
  caption: string;
  icon: LucideIcon;
};

export function MetricCard({ title, value, caption, icon: Icon }: MetricCardProps) {
  return (
    <section className="metric-card" aria-label={title}>
      <div className="metric-icon">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <span>{caption}</span>
      </div>
    </section>
  );
}
