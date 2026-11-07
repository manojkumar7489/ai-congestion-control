import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';

import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import PlannerPage from './pages/PlannerPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SimulationPage from './pages/SimulationPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

import './styles/main.css';

export default function App() {
  const [activePage, setActivePage] = useState('planner'); // Default to main feature for instant demo
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const renderPage = () => {
    switch (activePage) {
      case 'landing':
        return <LandingPage setActivePage={setActivePage} onOpenAuth={() => setIsAuthOpen(true)} />;
      case 'dashboard':
        return <DashboardPage setActivePage={setActivePage} />;
      case 'planner':
        return <PlannerPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'simulation':
        return <SimulationPage />;
      case 'profile':
        return <ProfilePage onOpenAuth={() => setIsAuthOpen(true)} />;
      case 'admin':
        return <AdminPage />;
      default:
        return <PlannerPage />;
    }
  };

  return (
    <AuthProvider>
      <div className="app-layout">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />

        <div className="app-main">
          <Navbar
            activePage={activePage}
            setActivePage={setActivePage}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
            onOpenAuth={() => setIsAuthOpen(true)}
          />

          <main className="page-container">
            {renderPage()}
          </main>
        </div>

        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
        />
      </div>
    </AuthProvider>
  );
}
