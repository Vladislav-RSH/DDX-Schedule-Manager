import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import AuthPage from './pages/AuthPage';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import IntroTrainingPage from './pages/IntroTrainingPage';
import SmartStartPage from './pages/SmartStartPage';
import TrainersPage from './pages/TrainersPage';
import { supabase } from './lib/supabaseClient';

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
  const [session, setSession] = useState<Session | null | undefined>(() =>
    supabase ? undefined : null,
  );
  const isAdminLoginRoute = window.location.hash === '#/admin';

  useEffect(() => {
    const handleHashChange = () => setCurrentPage(getCurrentPage());

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      return () => {
        isMounted = false;
      };
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session && isAdminLoginRoute) {
      window.location.hash = '#/trainers';
    }
  }, [isAdminLoginRoute, session]);

  useEffect(() => {
    if (session === null && window.location.hash === '#/trainers') {
      window.location.hash = '#/';
    }
  }, [session]);

  const handleOpenSidebar = () => setIsSidebarOpen(true);
  const handleSignOut = () => {
    if (supabase) {
      void supabase.auth.signOut();
    }
  };

  if (session === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="text-sm font-semibold text-slate-500">Загрузка...</div>
      </main>
    );
  }

  if (isAdminLoginRoute && !session) {
    return <AuthPage />;
  }

  const canManage = Boolean(session);
  const visiblePage = !canManage && currentPage === 'trainers' ? 'schedule' : currentPage;

  return (
    <main className="min-h-screen bg-[#f5f7fb]">
      <Sidebar
        isOpen={isSidebarOpen}
        currentPage={visiblePage}
        onClose={() => setIsSidebarOpen(false)}
        isAdmin={canManage}
        onSignOut={handleSignOut}
      />

      {visiblePage === 'trainers' ? (
        <TrainersPage onOpenSidebar={handleOpenSidebar} />
      ) : visiblePage === 'smart-start' ? (
        <SmartStartPage onOpenSidebar={handleOpenSidebar} canManage={canManage} />
      ) : visiblePage === 'intro-training' ? (
        <IntroTrainingPage onOpenSidebar={handleOpenSidebar} canManage={canManage} />
      ) : (
        <HomePage onOpenSidebar={handleOpenSidebar} canManage={canManage} />
      )}
    </main>
  );
}

export default App;
