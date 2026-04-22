type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
};

const PageHero = ({ eyebrow, title, description, note }: PageHeroProps) => (
  <section className="page-hero">
    <p className="page-hero__eyebrow">{eyebrow}</p>
    <h1 className="page-hero__title">{title}</h1>
    <p className="page-hero__description">{description}</p>
    {note ? <p className="page-hero__note">{note}</p> : null}
  </section>
);

export default PageHero;
