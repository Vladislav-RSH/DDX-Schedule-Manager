const authenticatedNavigationItems = [
  {
    id: 'schedule',
    label: 'Расписание дежурств',
    href: '#/',
  },
  {
    id: 'smart-start',
    label: 'Расписание Smart Start',
    href: '#/smart-start',
  },
  {
    id: 'intro-training',
    label: 'Ознакомительные тренировки',
    href: '#/intro-training',
  },
  {
    id: 'trainers',
    label: 'Список тренеров',
    href: '#/trainers',
  },
  {
    id: 'auth',
    label: 'Авторизация',
    href: '#/auth',
  },
];

const unauthenticatedNavigationItems = [
  {
    id: 'auth',
    label: 'Авторизация',
    href: '#/auth',
  },
];

type SidebarProps = {
  isOpen: boolean;
  currentPage: string;
  isAuthenticated: boolean;
  onClose: () => void;
};

function Sidebar({ isOpen, currentPage, isAuthenticated, onClose }: SidebarProps) {
  const navigationItems = isAuthenticated
    ? authenticatedNavigationItems
    : unauthenticatedNavigationItems;

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/35"
          aria-label="Закрыть меню"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-72 max-w-[calc(100vw-2rem)] border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <p className="text-sm font-black tracking-tight text-slate-950">Расписание Федосеевский</p>
          <button
            type="button"
            className="relative h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/30"
            aria-label="Закрыть меню"
            onClick={onClose}
          >
            <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-current" />
            <span className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current" />
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-4">
          {navigationItems.map((item) => {
            const isActive = item.id === currentPage;

            return (
              <a
                key={item.id}
                href={item.href}
                className={`flex h-11 items-center rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/30 ${
                  isActive
                    ? 'bg-slate-950 text-white hover:bg-slate-800'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
                aria-current={isActive ? 'page' : undefined}
                onClick={onClose}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
