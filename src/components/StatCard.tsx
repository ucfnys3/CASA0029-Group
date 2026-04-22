type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

const StatCard = ({ label, value, detail }: StatCardProps) => (
  <article className="stat-card">
    <p className="stat-card__label">{label}</p>
    <h3 className="stat-card__value">{value}</h3>
    <p className="stat-card__detail">{detail}</p>
  </article>
);

export default StatCard;
