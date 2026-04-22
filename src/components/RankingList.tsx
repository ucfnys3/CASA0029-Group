type RankingItem = {
  title: string;
  subtitle?: string;
  value: string;
  note?: string;
};

type RankingListProps = {
  title: string;
  items: RankingItem[];
};

const RankingList = ({ title, items }: RankingListProps) => (
  <section className="panel-card">
    <div className="panel-card__header">
      <h3>{title}</h3>
    </div>
    <ol className="ranking-list">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="ranking-list__item">
          <div>
            <span className="ranking-list__rank">{String(index + 1).padStart(2, '0')}</span>
            <div className="ranking-list__content">
              <h4>{item.title}</h4>
              {item.subtitle ? <p>{item.subtitle}</p> : null}
              {item.note ? <span className="ranking-list__note">{item.note}</span> : null}
            </div>
          </div>
          <span className="ranking-list__value">{item.value}</span>
        </li>
      ))}
    </ol>
  </section>
);

export default RankingList;
