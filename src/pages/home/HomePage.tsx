import { Link } from 'react-router-dom';
import { withBase } from '../../lib/basePath';

const HomePage = () => (
  <section className="cover-page">
    <div
      className="cover-page__image"
      style={{ backgroundImage: `url(${withBase('/assets/crime-scene-cover.png')})` }}
      aria-hidden="true"
    />
    <div className="cover-page__veil" />

    <div className="cover-page__content">
      <p className="cover-page__kicker">CASA0029 group19 project</p>
      <h1>London Crime Inequality Atlas</h1>
      <p>
        A map-led story about where crime concentrates, why neighbourhood vulnerability matters,
        and how public safety is shaped by more than policing alone.
      </p>
      <div className="cover-page__actions">
        <Link to="/introduction" className="cover-page__button cover-page__button--primary">
          Enter the atlas
        </Link>
        <Link to="/crime-map" className="cover-page__button">
          Start with the map
        </Link>
      </div>
    </div>

    <div className="cover-page__caption">
      <span>Real London borough, LSOA, and Q4 2025 incident data</span>
      <span>Scroll-free linked pages for a clearer project narrative</span>
    </div>
  </section>
);

export default HomePage;
