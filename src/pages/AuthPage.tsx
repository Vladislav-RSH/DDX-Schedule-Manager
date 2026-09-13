import { useState, type FormEvent } from 'react';
import { getAuthEmail } from '../lib/auth';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient';

function AuthPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !hasSupabaseConfig) {
      setErrorMessage('Авторизация временно недоступна: Supabase не настроен.');
      return;
    }

    const email = getAuthEmail(login);

    if (!email || !password) {
      setErrorMessage('Неверный логин или пароль.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage('Неверный логин или пароль.');
      }
    } catch {
      setErrorMessage('Не удалось выполнить вход. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ff6a00]">
            Расписание Федосеевский
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Вход</h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Введите данные администратора.
          </p>
        </div>

        {!hasSupabaseConfig ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-800">
            Не настроены переменные Supabase.
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-600">Логин</span>
            <input
              autoComplete="username"
              className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/20"
              disabled={isSubmitting || !hasSupabaseConfig}
              placeholder="tkachev"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-600">Пароль</span>
            <input
              autoComplete="current-password"
              className="h-11 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/20"
              disabled={isSubmitting || !hasSupabaseConfig}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <button
            type="submit"
            className="mt-2 h-11 rounded-lg bg-[#ff6a00] px-4 text-sm font-bold text-white transition hover:bg-[#e85f00] focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/30 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !hasSupabaseConfig}
          >
            {isSubmitting ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
