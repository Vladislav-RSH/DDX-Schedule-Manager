import { useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from '../lib/supabaseClient';
import { getTelegramAuthRedirectUrl, telegramAuthProvider } from '../lib/auth';

type AuthPageProps = {
  onOpenSidebar: () => void;
  session: Session | null;
};

const userField = (value: ReactNode) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
    {value}
  </div>
);

function AuthPage({ onOpenSidebar, session }: AuthPageProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignIn = async () => {
    if (!supabase) {
      setErrorMessage('Supabase не настроен. Проверьте переменные окружения.');
      return;
    }

    try {
      setIsSigningIn(true);
      setErrorMessage('');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: telegramAuthProvider,
        options: {
          redirectTo: getTelegramAuthRedirectUrl(),
        },
      });

      if (error) {
        throw error;
      }
    } catch {
      setErrorMessage('Не удалось открыть Telegram авторизацию.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    try {
      setIsSigningOut(true);
      setErrorMessage('');
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch {
      setErrorMessage('Не удалось выйти из аккаунта.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const displayName =
    session?.user.user_metadata?.full_name ??
    session?.user.user_metadata?.name ??
    session?.user.user_metadata?.username ??
    session?.user.email ??
    'Telegram user';

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/30"
            aria-label="Открыть меню"
            onClick={onOpenSidebar}
          >
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
            <span className="h-0.5 w-5 rounded-full bg-current" />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Авторизация
          </h1>
        </header>

        {!hasSupabaseConfig ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Не настроены переменные Supabase.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {session ? (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Вы вошли как</p>
                <p className="mt-1 text-xl font-black text-slate-950">{displayName}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {userField(session.user.id)}
                {userField(session.user.user_metadata?.username ?? 'Telegram')}
              </div>

              <div>
                <button
                  type="button"
                  className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSigningOut || !supabase}
                  onClick={() => void handleSignOut()}
                >
                  {isSigningOut ? 'Выход...' : 'Выйти'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Вход через Telegram</p>
                <p className="mt-1 text-base font-semibold text-slate-700">
                  Нажми кнопку и пройди авторизацию через Telegram.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  className="h-10 rounded-lg bg-[#2aabee] px-4 text-sm font-bold text-white transition hover:bg-[#2296d1] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSigningIn || !hasSupabaseConfig}
                  onClick={() => void handleSignIn()}
                >
                  {isSigningIn ? 'Открываю Telegram...' : 'Войти через Telegram'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AuthPage;
