import { Link } from 'react-router-dom';

type StoryCardProps = {
  title: string;
  description: string;
  href: string;
};

const StoryCard = ({ title, description, href }: StoryCardProps) => (
  <Link className="story-card" to={href}>
    <span className="story-card__eyebrow">Explore</span>
    <h3>{title}</h3>
    <p>{description}</p>
    <span className="story-card__link">Open page</span>
  </Link>
);

export default StoryCard;
