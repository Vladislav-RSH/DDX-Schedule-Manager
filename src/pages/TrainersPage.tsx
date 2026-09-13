import { useEffect, useState, type FormEvent } from 'react';
import {
  getIntroTrainingAssignments,
  subscribeToIntroTrainingAssignments,
} from '../api/introTrainingAssignments';
import {
  getScheduleAssignments,
  subscribeToScheduleAssignments,
} from '../api/scheduleAssignments';
import {
  getSmartStartAssignments,
  subscribeToSmartStartAssignments,
} from '../api/smartStartAssignments';
import {
  createTrainer,
  deleteTrainer,
  getTrainers,
  sortTrainers,
  subscribeToTrainers,
  type Trainer,
} from '../api/trainers';

type TrainersPageProps = {
  onOpenSidebar: () => void;
};

const getTrainerName = (trainer: Trainer) =>
  [trainer.lastName, trainer.firstName].filter(Boolean).join(' ') || 'Без имени';

type CountableAssignment = {
  trainerId: string | null;
  date: string;
};

type TrainerMonthlyStats = {
  schedule: number;
  smartStart: number;
  introTraining: number;
};

type TrainerMonthlyStatsMap = Record<string, TrainerMonthlyStats>;

const emptyMonthlyStats: TrainerMonthlyStats = {
  schedule: 0,
  smartStart: 0,
  introTraining: 0,
};

const formatDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const now = new Date();
const currentMonthStart = formatDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
const nextMonthStart = formatDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 1));

const isCurrentMonthAssignment = (assignment: CountableAssignment) =>
  assignment.date >= currentMonthStart && assignment.date < nextMonthStart;

const addAssignmentsToStats = (
  stats: TrainerMonthlyStatsMap,
  assignments: CountableAssignment[],
  key: keyof TrainerMonthlyStats,
) => {
  assignments.forEach((assignment) => {
    if (!assignment.trainerId || !isCurrentMonthAssignment(assignment)) {
      return;
    }

    stats[assignment.trainerId] = {
      ...(stats[assignment.trainerId] ?? emptyMonthlyStats),
      [key]: (stats[assignment.trainerId]?.[key] ?? 0) + 1,
    };
  });
};

const buildMonthlyStats = (
  scheduleAssignments: CountableAssignment[],
  smartStartAssignments: CountableAssignment[],
  introTrainingAssignments: CountableAssignment[],
) => {
  const stats: TrainerMonthlyStatsMap = {};

  addAssignmentsToStats(stats, scheduleAssignments, 'schedule');
  addAssignmentsToStats(stats, smartStartAssignments, 'smartStart');
  addAssignmentsToStats(stats, introTrainingAssignments, 'introTraining');

  return stats;
};

const getMonthlyStats = async () => {
  const [scheduleAssignments, smartStartAssignments, introTrainingAssignments] = await Promise.all([
    getScheduleAssignments(),
    getSmartStartAssignments(),
    getIntroTrainingAssignments(),
  ]);

  return buildMonthlyStats(scheduleAssignments, smartStartAssignments, introTrainingAssignments);
};

function MonthlyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 sm:min-h-0 sm:justify-center sm:bg-transparent sm:px-1 sm:py-0">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:hidden">
        {label}
      </span>
      <span className="text-sm font-black tabular-nums text-slate-950">{value}</span>
    </div>
  );
}

function TrainersPage({ onOpenSidebar }: TrainersPageProps) {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<TrainerMonthlyStatsMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingTrainerId, setDeletingTrainerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    let isMounted = true;

    const reloadMonthlyStats = async () => {
      const stats = await getMonthlyStats();

      if (isMounted) {
        setMonthlyStats(stats);
      }
    };

    const loadPageData = async () => {
      const [trainersResult, statsResult] = await Promise.allSettled([
        getTrainers(),
        getMonthlyStats(),
      ]);

      if (!isMounted) {
        return;
      }

      const loadErrors: string[] = [];

      if (trainersResult.status === 'fulfilled') {
        setTrainers(trainersResult.value);
      } else {
        loadErrors.push('Не удалось загрузить список тренеров.');
      }

      if (statsResult.status === 'fulfilled') {
        setMonthlyStats(statsResult.value);
      } else {
        loadErrors.push('Не удалось загрузить статистику за текущий месяц.');
      }

      setErrorMessage(loadErrors.join(' '));
      setIsLoading(false);
    };

    void loadPageData();

    const handleAssignmentsChange = () => {
      void reloadMonthlyStats().catch(() => {
        if (isMounted) {
          setErrorMessage('Не удалось обновить статистику за текущий месяц.');
        }
      });
    };

    const unsubscribeTrainers = subscribeToTrainers((change) => {
      if (!isMounted) {
        return;
      }

      setTrainers((currentTrainers) => {
        if (change.type === 'delete') {
          return currentTrainers.filter((trainer) => trainer.id !== change.trainerId);
        }

        return sortTrainers([
          ...currentTrainers.filter((trainer) => trainer.id !== change.trainer.id),
          change.trainer,
        ]);
      });
    });
    const unsubscribeScheduleAssignments = subscribeToScheduleAssignments(handleAssignmentsChange);
    const unsubscribeSmartStartAssignments = subscribeToSmartStartAssignments(handleAssignmentsChange);
    const unsubscribeIntroTrainingAssignments =
      subscribeToIntroTrainingAssignments(handleAssignmentsChange);

    return () => {
      isMounted = false;
      unsubscribeTrainers();
      unsubscribeScheduleAssignments();
      unsubscribeSmartStartAssignments();
      unsubscribeIntroTrainingAssignments();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!lastName) {
      setErrorMessage('Укажите фамилию тренера.');
      return;
    }

    try {
      setIsSubmitting(true);
      const trainer = await createTrainer({ firstName, lastName });
      setTrainers((currentTrainers) =>
        sortTrainers([...currentTrainers.filter((currentTrainer) => currentTrainer.id !== trainer.id), trainer]),
      );
      setForm({ firstName: '', lastName: '' });
      setIsFormOpen(false);
      setErrorMessage('');
    } catch {
      setErrorMessage('Не удалось добавить тренера.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (trainer: Trainer) => {
    const shouldDelete = window.confirm(`Удалить тренера ${getTrainerName(trainer)}?`);

    if (!shouldDelete) {
      return;
    }

    try {
      setDeletingTrainerId(trainer.id);
      await deleteTrainer(trainer.id);
      setTrainers((currentTrainers) =>
        currentTrainers.filter((currentTrainer) => currentTrainer.id !== trainer.id),
      );
      setErrorMessage('');
    } catch {
      setErrorMessage('Не удалось удалить тренера.');
    } finally {
      setDeletingTrainerId(null);
    }
  };

  return (
    <section className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
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
              Список тренеров
            </h1>
          </div>

          <button
            type="button"
            className="h-10 rounded-lg bg-[#ff6a00] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#e85f00] focus:outline-none focus:ring-2 focus:ring-[#ff6a00]/30"
            onClick={() => setIsFormOpen((isOpen) => !isOpen)}
          >
            Добавить тренера
          </button>
        </header>

        {isFormOpen ? (
          <form
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-600">Фамилия</span>
                <input
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/20"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      lastName: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-600">Имя</span>
                <input
                  className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-[#ff6a00] focus:bg-white focus:ring-2 focus:ring-[#ff6a00]/20"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      firstName: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                className="h-10 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Сохранение' : 'Сохранить'}
              </button>
              <button
                type="button"
                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setIsFormOpen(false)}
              >
                Отмена
              </button>
            </div>
          </form>
        ) : null}

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[minmax(0,1fr)_7rem_7rem_8.5rem_8rem] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500 sm:grid">
            <span>Тренер</span>
            <span className="text-center">Дежурства</span>
            <span className="text-center">Smart Start</span>
            <span className="text-center">Ознакомит.</span>
            <span className="text-right">Действие</span>
          </div>

          {isLoading ? (
            <div className="px-4 py-8 text-sm font-semibold text-slate-500">Загрузка</div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {trainers.map((trainer) => {
                const stats = monthlyStats[trainer.id] ?? emptyMonthlyStats;

                return (
                  <li
                    key={trainer.id}
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_8.5rem_8rem] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {getTrainerName(trainer)}
                      </p>
                    </div>

                    <MonthlyStat label="Дежурства" value={stats.schedule} />
                    <MonthlyStat label="Smart Start" value={stats.smartStart} />
                    <MonthlyStat label="Ознакомит." value={stats.introTraining} />

                    <button
                      type="button"
                      className="h-9 rounded-lg border border-red-200 bg-white px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:justify-self-end"
                      disabled={deletingTrainerId === trainer.id}
                      onClick={() => void handleDelete(trainer)}
                    >
                      {deletingTrainerId === trainer.id ? 'Удаление' : 'Удалить'}
                    </button>
                  </li>
                );
              })}

              {trainers.length === 0 ? (
                <li className="px-4 py-8 text-sm font-semibold text-slate-500">
                  Тренеров пока нет
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default TrainersPage;
