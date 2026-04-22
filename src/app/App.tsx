import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import HomePage from '../pages/home/HomePage';
import IntroductionPage from '../pages/introduction/IntroductionPage';
import BoroughCrimeSituationPage from '../pages/borough-crime-situation/BoroughCrimeSituationPage';
import RecentIncidentsPage from '../pages/recent-incidents/RecentIncidentsPage';
import MappingVulnerabilityPage from '../pages/mapping-vulnerability/MappingVulnerabilityPage';
import CrimeInequalityPage from '../pages/crime-inequality/CrimeInequalityPage';
import PriorityPlacesPage from '../pages/priority-places/PriorityPlacesPage';
import AboutPage from '../pages/about/AboutPage';

const navigation = [
  { to: '/', label: 'Home' },
  { to: '/introduction', label: 'Introduction' },
  { to: '/borough-crime-situation', label: 'Borough Crime' },
  { to: '/recent-incidents', label: 'Hotspots' },
  { to: '/mapping-vulnerability', label: 'Vulnerability' },
  { to: '/crime-and-inequality', label: 'Overlap' },
  { to: '/priority-places', label: 'Priority Places' },
  { to: '/about', label: 'About' },
];

const App = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  return (
    <div className={isHome ? 'site-shell site-shell--cover' : 'site-shell'}>
      <header className={isHome ? 'site-header site-header--cover' : 'site-header'}>
        <div className="shell-width site-header__inner">
          <div className="brand-block">
            <span className="brand-block__kicker">CASA0029 group prototype</span>
            <NavLink to="/" className="brand-block__title">
              London Crime Inequality Atlas
            </NavLink>
          </div>

          <nav className="site-nav" aria-label="Primary">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'site-nav__link site-nav__link--active' : 'site-nav__link'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="site-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/introduction" element={<IntroductionPage />} />
          <Route path="/borough-crime-situation" element={<BoroughCrimeSituationPage />} />
          <Route path="/crime-overview" element={<BoroughCrimeSituationPage />} />
          <Route path="/recent-incidents" element={<RecentIncidentsPage />} />
          <Route path="/mapping-vulnerability" element={<MappingVulnerabilityPage />} />
          <Route path="/crime-and-inequality" element={<CrimeInequalityPage />} />
          <Route path="/priority-places" element={<PriorityPlacesPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </main>

      <footer className={isHome ? 'site-footer site-footer--cover' : 'site-footer'}>
        <div className="shell-width site-footer__inner">
          <p>
            A narrative-first static prototype built for a CASA0029 group project using
            London borough, LSOA, and Q4 2025 incident data already stored in the project
            folder.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
