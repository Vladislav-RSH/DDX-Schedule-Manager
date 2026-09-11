import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import IntroTrainingPage from './pages/IntroTrainingPage';
import SmartStartPage from './pages/SmartStartPage';
import TrainersPage from './pages/TrainersPage';

type AppPage = 'intro-training' | 'schedule' | 'smart-start' | 'trainers';

const getCurrentPage = (): AppPage => {
  if (window.location.hash === '#/trainers') {
    return 'trainers';
  }

  if (window.location.hash === '#/smart-start') {
    return 'smart-start';
  }

  if (window.location.hash === '#/intro-training') {
    return 'intro-training';
  }

  return 'schedule';
};

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(getCurrentPage);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getCurrentPage());

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleOpenSidebar = () => setIsSidebarOpen(true);

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <Sidebar
        isOpen={isSidebarOpen}
        currentPage={currentPage}
        onClose={() => setIsSidebarOpen(false)}
      />

      {currentPage === 'trainers' ? (
        <TrainersPage onOpenSidebar={handleOpenSidebar} />
      ) : currentPage === 'smart-start' ? (
        <SmartStartPage onOpenSidebar={handleOpenSidebar} />
      ) : currentPage === 'intro-training' ? (
        <IntroTrainingPage onOpenSidebar={handleOpenSidebar} />
      ) : (
        <HomePage onOpenSidebar={handleOpenSidebar} />
      )}
    </main>
  );
}

export default App;
