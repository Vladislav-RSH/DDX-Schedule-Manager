import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import {
  createIntroTrainingAssignment,
  deleteIntroTrainingAssignment,
  getIntroTrainingAssignments,
  subscribeToIntroTrainingAssignments,
  updateIntroTrainingAssignment,
} from '../api/introTrainingAssignments';
import { getTrainers, sortTrainers, subscribeToTrainers, type Trainer } from '../api/trainers';

type IntroTrainingDay = {
  label: string;
  date: Date;
  sessions: Array<string | null>;
};

type IntroTrainingWeek = {
  id: string;
  days: IntroTrainingDay[];
};

type DayHeader = {
  weekday: string;
  date: string;
};

type TrainerOption = {
  trainer: Trainer;
  label: string;
  searchLabel: string;
};

type SavedAssignment = {
  trainerId: string | null;
  trainerName: string;
  date: string;
  time: string;
};

type AssignmentMap = Record<string, SavedAssignment>;
type SavingMap = Record<string, boolean>;

const introTrainingTimeSlots = ['10:00', '13:00', '16:00', '19:00', '21:00'];

const weekdayLabels = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

const formatDayLabel = (date: Date) => {
  const weekday = weekdayLabels[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${weekday} - ${day}.${month}.${year}`;
};

const splitDayLabel = (label: string): DayHeader => {
  const [weekday = label, date = ''] = label.split(' - ');

  return { weekday, date };
};

const getTrainerName = (trainer: Trainer) =>
  [trainer.lastName, trainer.firstName].filter(Boolean).join(' ') || 'Без имени';

const getTrainerShortName = (trainer: Trainer) => trainer.lastName.trim() || getTrainerName(trainer);

const getTrainerShortNameFromLabel = (label: string) => label.trim().split(/\s+/)[0] || label;

const normalizeValue = (value: string) => value.trim().toLocaleLowerCase('ru-RU');

const createDay = (date: Date): IntroTrainingDay => ({
  label: formatDayLabel(date),
  date,
  sessions: introTrainingTimeSlots.map(() => null),
});

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  copy.setDate(copy.getDate() + offset);
  copy.setHours(0, 0, 0, 0);

  return copy;
};

const endOfYear = (year: number) => {
  const date = new Date(year, 11, 31);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toYearEndWeeks = (anchorDate: Date) => {
  const weeks: IntroTrainingWeek[] = [];
  const current = startOfWeek(anchorDate);
  const lastDay = endOfYear(anchorDate.getFullYear());

  let weekIndex = 1;

  while (current <= lastDay) {
    const days: IntroTrainingDay[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(current);
      day.setDate(current.getDate() + offset);

      if (day > lastDay) {
        break;
      }

      days.push(createDay(day));
    }

    weeks.push({
      id: `intro-training-week-${weekIndex}`,
      days,
    });

    current.setDate(current.getDate() + 7);
    weekIndex += 1;
  }

  return weeks;
};

const now = new Date();
const currentYear = now.getFullYear();
const currentMonthIndex = now.getMonth();
const currentYearWeeks = toYearEndWeeks(now);

const monthLabelFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
});

const monthOptions = Array.from({ length: 12 - currentMonthIndex }, (_, offset) => {
  const monthIndex = currentMonthIndex + offset;
  const label = monthLabelFormatter.format(new Date(currentYear, monthIndex, 1));

  return {
    value: monthIndex,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
});

const getMonthWeeks = (weeks: IntroTrainingWeek[], monthIndex: number) =>
  weeks.filter((week) => week.days.some((day) => day.date.getMonth() === monthIndex));

const getWeekdayDays = (days: IntroTrainingDay[]) =>
  days.filter((day) => day.date.getDay() >= 1 && day.date.getDay() <= 5);

const getWeekendDays = (days: IntroTrainingDay[]) =>
  days.filter((day) => day.date.getDay() === 6 || day.date.getDay() === 0);

const getCellKey = (date: Date, slot: string) =>
  `intro-training-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}-${slot.replace(/[^0-9]/g, '')}`;

const getDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const buildTrainerOptions = (trainers: Trainer[]): TrainerOption[] =>
  trainers
    .map((trainer) => {
      const label = getTrainerName(trainer);

      return {
        trainer,
        label,
        searchLabel: normalizeValue([label, trainer.firstName, trainer.lastName].join(' ')),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'ru-RU'));

const getAssignmentDisplayValue = (assignment: SavedAssignment | null, trainerOptions: TrainerOption[]) => {
  if (!assignment) {
    return '';
  }

  const matchedTrainer = trainerOptions.find((option) => option.trainer.id === assignment.trainerId);

  if (matchedTrainer) {
    return getTrainerShortName(matchedTrainer.trainer);
  }

  return getTrainerShortNameFromLabel(assignment.trainerName);
};

type TrainerFieldProps = {
  inputId: string;
  selectedValue: string;
  selectedTrainerId: string | null;
  trainerOptions: TrainerOption[];
  disabled: boolean;
  saving: boolean;
  onCommit: (trainer: Trainer | null) => void;
};

function TrainerField({
  inputId,
  selectedValue,
  selectedTrainerId,
  trainerOptions,
  disabled,
  saving,
  onCommit,
}: TrainerFieldProps) {
  const [query, setQuery] = useState(selectedValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedTrainerIndex = trainerOptions.findIndex(
    ({ trainer }) => trainer.id === selectedTrainerId,
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeValue(query);

    if (!normalizedQuery) {
      return trainerOptions;
    }

    return trainerOptions.filter(({ searchLabel }) => searchLabel.includes(normalizedQuery));
  }, [query, trainerOptions]);
  const visibleActiveIndex =
    filteredOptions.length === 0 ? 0 : Math.min(activeIndex, filteredOptions.length - 1);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setIsOpen(false);
        setActiveIndex(0);
        setQuery(selectedValue);
      }
    };

    if (!isOpen) {
      return undefined;
    }

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isOpen, selectedValue]);

  const commitTrainer = (trainer: Trainer | null) => {
    onCommit(trainer);
    setIsOpen(false);
    setActiveIndex(0);
    setQuery(trainer ? getTrainerShortName(trainer) : '');
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (disabled || saving) {
      return;
    }

    const input = event.currentTarget;

    setIsOpen(true);
    setQuery(selectedValue);
    setActiveIndex(selectedTrainerIndex >= 0 ? selectedTrainerIndex : 0);

    requestAnimationFrame(() => {
      if (input.isConnected) {
        input.select();
      }
    });
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);
    setIsOpen(true);
    setActiveIndex(0);

    if (!nextQuery.trim()) {
      onCommit(null);
      return;
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget as Node | null;

    if (nextTarget && containerRef.current?.contains(nextTarget)) {
      return;
    }

    setIsOpen(false);
    setActiveIndex(0);
    setQuery(selectedValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || saving) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        filteredOptions.length === 0 ? 0 : (currentIndex + 1) % filteredOptions.length,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        filteredOptions.length === 0
          ? 0
          : (currentIndex - 1 + filteredOptions.length) % filteredOptions.length,
      );
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();

      if (filteredOptions.length === 0) {
        return;
      }

      const selectedOption = filteredOptions[visibleActiveIndex] ?? filteredOptions[0];
      commitTrainer(selectedOption.trainer);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(0);
      setQuery(selectedValue);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        spellCheck={false}
        className="h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-center text-[11px] font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        value={isOpen ? query : selectedValue}
        disabled={disabled || saving}
        placeholder={disabled ? 'Нет тренеров' : 'Тренер'}
        aria-label="Выбрать тренера"
        aria-expanded={isOpen}
        aria-controls={`${inputId}-options`}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />

      {isOpen && !disabled && !saving ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <ul id={`${inputId}-options`} role="listbox" className="max-h-56 overflow-auto py-1 text-left">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(({ trainer, label }, index) => {
                const isSelected = selectedTrainerId === trainer.id;
                const isHighlighted = index === visibleActiveIndex;

                return (
                  <li key={trainer.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                        isHighlighted
                          ? 'bg-[#ff6a00]/10 text-slate-950'
                          : 'text-slate-700 hover:bg-slate-50'
                      } ${isSelected ? 'font-bold' : 'font-medium'}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => commitTrainer(trainer)}
                    >
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      {isSelected ? (
                        <span className="shrink-0 rounded-full bg-[#ecfdff] px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Выбран
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500">Совпадений нет</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type IntroTrainingBoardProps = {
  onOpenSidebar: () => void;
};

function IntroTrainingBoard({ onOpenSidebar }: IntroTrainingBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [savingCells, setSavingCells] = useState<SavingMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const boardScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedMonthWeeks = useMemo(
    () => getMonthWeeks(currentYearWeeks, selectedMonth),
    [selectedMonth],
  );

  const trainerOptions = useMemo(() => buildTrainerOptions(trainers), [trainers]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [loadedTrainers, loadedAssignments] = await Promise.all([
          getTrainers(),
          getIntroTrainingAssignments(),
        ]);

        if (!isMounted) {
          return;
        }

        const nextAssignments = loadedAssignments.reduce<AssignmentMap>((accumulator, assignment) => {
          accumulator[assignment.id] = {
            trainerId: assignment.trainerId,
            trainerName: assignment.trainerName,
            date: assignment.date,
            time: assignment.time,
          };

          return accumulator;
        }, {});

        setTrainers(sortTrainers(loadedTrainers));
        setAssignments(nextAssignments);
        setErrorMessage('');
      } catch {
        if (isMounted) {
          setErrorMessage('Не удалось загрузить список тренеров.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

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

    const unsubscribeAssignments = subscribeToIntroTrainingAssignments((change) => {
      if (!isMounted) {
        return;
      }

      setAssignments((currentAssignments) => {
        const nextAssignments = { ...currentAssignments };

        if (change.type === 'delete') {
          delete nextAssignments[change.assignmentId];
        } else {
          nextAssignments[change.assignment.id] = change.assignment;
        }

        return nextAssignments;
      });
    });

    return () => {
      isMounted = false;
      unsubscribeTrainers();
      unsubscribeAssignments();
    };
  }, []);

  useEffect(() => {
    boardScrollRef.current?.scrollTo({ left: 0 });
  }, [selectedMonth]);

  const commitTrainer = async (
    cellKey: string,
    date: Date,
    slot: string,
    trainer: Trainer | null,
  ) => {
    const previousAssignment = assignments[cellKey] ?? null;
    const nextAssignment =
      trainer === null
        ? null
        : {
            trainerId: trainer.id,
            trainerName: getTrainerName(trainer),
            date: getDateKey(date),
            time: slot,
          };

    if (
      previousAssignment?.trainerId === nextAssignment?.trainerId &&
      previousAssignment?.trainerName === nextAssignment?.trainerName
    ) {
      return;
    }

    setSavingCells((currentSavingCells) => ({
      ...currentSavingCells,
      [cellKey]: true,
    }));
    setErrorMessage('');

    setAssignments((currentAssignments) => {
      const nextAssignments = { ...currentAssignments };

      if (nextAssignment) {
        nextAssignments[cellKey] = nextAssignment;
      } else {
        delete nextAssignments[cellKey];
      }

      return nextAssignments;
    });

    try {
      if (nextAssignment && previousAssignment) {
        await updateIntroTrainingAssignment(cellKey, nextAssignment);
      } else if (nextAssignment) {
        await createIntroTrainingAssignment({
          id: cellKey,
          ...nextAssignment,
        });
      } else if (previousAssignment) {
        await deleteIntroTrainingAssignment(cellKey);
      }
    } catch {
      if (nextAssignment) {
        setErrorMessage('Не удалось сохранить тренера на сервере, но он останется после обновления.');
      } else {
        setErrorMessage('Не удалось удалить тренера на сервере, но изменение останется после обновления.');
      }
    } finally {
      setSavingCells((currentSavingCells) => {
        const nextSavingCells = { ...currentSavingCells };
        delete nextSavingCells[cellKey];

        return nextSavingCells;
      });
    }
  };

  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
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
            Расписание Федосеевский
          </h1>
        </header>

        <div className="flex justify-start">
          <label className="sr-only" htmlFor="intro-training-month">
            Month
          </label>
          <div className="relative w-44 sm:w-56">
            <select
              id="intro-training-month"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div ref={boardScrollRef} className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
          <div className="flex gap-0">
            {selectedMonthWeeks.map((week, weekIndex) => {
              const weekdayDays = getWeekdayDays(week.days);
              const weekendDays = getWeekendDays(week.days);

              return (
                <section
                  key={week.id}
                  className="w-full shrink-0 snap-start overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Ознакомительные - неделя {weekIndex + 1}
                      </p>
                      <p className="text-xs text-slate-500">
                        {week.days[0]?.label} - {week.days[week.days.length - 1]?.label}
                      </p>
                    </div>
                    <div className="h-1.5 w-16 rounded-full bg-[#ff6a00] sm:w-24" />
                  </div>

                  <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:hidden">
                    {week.days.map((day) => {
                      const header = splitDayLabel(day.label);

                      return (
                        <article
                          key={day.label}
                          className="overflow-hidden rounded-lg border border-slate-200 bg-[#fbfcfe] shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#ff6a00]">
                                {header.weekday}
                              </p>
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {header.date}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-[#ecfdff] px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                              Ознакомительные
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200">
                            {introTrainingTimeSlots.map((slot) => {
                              const cellKey = getCellKey(day.date, slot);
                              const savedAssignment = assignments[cellKey] ?? null;

                              return (
                                <div
                                  key={`${day.label}-${slot}`}
                                  className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 px-3 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                                >
                                  <span className="text-[11px] font-black leading-tight text-slate-700">
                                    {slot}
                                  </span>
                                  <div className="flex min-h-7 items-start">
                                    <TrainerField
                                      key={`${cellKey}-${savedAssignment?.trainerId ?? savedAssignment?.trainerName ?? 'empty'}`}
                                      inputId={`${cellKey}-mobile`}
                                      selectedValue={getAssignmentDisplayValue(savedAssignment, trainerOptions)}
                                      selectedTrainerId={savedAssignment?.trainerId ?? null}
                                      trainerOptions={trainerOptions}
                                      disabled={isLoading || trainerOptions.length === 0}
                                      saving={savingCells[cellKey] === true}
                                      onCommit={(trainer) =>
                                        void commitTrainer(cellKey, day.date, slot, trainer)
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden xl:block">
                    <table className="w-full min-w-[1280px] table-fixed border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-30 w-32 border-b border-r border-slate-200 bg-[#ff8a2a] px-3 py-3 text-left text-[10px] font-black uppercase text-slate-950 shadow-[1px_0_0_rgba(15,23,42,0.08)]">
                            Время/Дата
                          </th>
                          {weekdayDays.map((day) => {
                            const header = splitDayLabel(day.label);

                            return (
                              <th
                                key={day.label}
                                className="border-b border-r border-slate-200 bg-[#ff8a2a] px-2 py-3 text-center text-slate-950"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-black uppercase">
                                    {header.weekday}
                                  </span>
                                  <span className="text-xs font-black tracking-tight">
                                    {header.date}
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                          {weekendDays.length > 0 ? (
                            <th className="w-20 border-b border-r border-slate-200 bg-[#ff8a2a] px-2 py-3 text-center text-[10px] font-black text-slate-950">
                              Время
                            </th>
                          ) : null}
                          {weekendDays.map((day) => {
                            const header = splitDayLabel(day.label);

                            return (
                              <th
                                key={day.label}
                                className="border-b border-r border-slate-200 bg-[#ff8a2a] px-2 py-3 text-center text-slate-950 last:border-r-0"
                              >
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-black uppercase">
                                    {header.weekday}
                                  </span>
                                  <span className="text-xs font-black tracking-tight">
                                    {header.date}
                                  </span>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody>
                        {introTrainingTimeSlots.map((slot) => (
                          <tr key={slot} className="group">
                            <th
                              scope="row"
                              className="sticky left-0 z-20 border-b border-r border-slate-200 bg-[#4fb2c4] px-3 py-3 text-center align-middle text-[11px] font-black text-slate-950 transition-colors group-hover:bg-[#47a9ba]"
                            >
                              {slot}
                            </th>

                            {weekdayDays.map((day) => {
                              const cellKey = getCellKey(day.date, slot);
                              const savedAssignment = assignments[cellKey] ?? null;

                              return (
                                <td
                                  key={`${week.id}-${day.label}-${slot}`}
                                  className="border-b border-r border-slate-200 px-3 py-3 text-center align-middle transition-colors group-hover:bg-slate-50/80"
                                >
                                  <div className="flex min-h-12 items-center justify-center">
                                    <TrainerField
                                      key={`${cellKey}-${savedAssignment?.trainerId ?? savedAssignment?.trainerName ?? 'empty'}`}
                                      inputId={`${cellKey}-desktop`}
                                      selectedValue={getAssignmentDisplayValue(savedAssignment, trainerOptions)}
                                      selectedTrainerId={savedAssignment?.trainerId ?? null}
                                      trainerOptions={trainerOptions}
                                      disabled={isLoading || trainerOptions.length === 0}
                                      saving={savingCells[cellKey] === true}
                                      onCommit={(trainer) =>
                                        void commitTrainer(cellKey, day.date, slot, trainer)
                                      }
                                    />
                                  </div>
                                </td>
                              );
                            })}

                            {weekendDays.length > 0 ? (
                              <th className="border-b border-r border-slate-200 bg-[#4fb2c4] px-2 py-3 text-center align-middle text-[11px] font-black text-slate-950 transition-colors group-hover:bg-[#47a9ba]">
                                {slot}
                              </th>
                            ) : null}

                            {weekendDays.map((day) => {
                              const cellKey = getCellKey(day.date, slot);
                              const savedAssignment = assignments[cellKey] ?? null;

                              return (
                                <td
                                  key={`${week.id}-${day.label}-${slot}`}
                                  className="border-b border-r border-slate-200 px-3 py-3 text-center align-middle transition-colors group-hover:bg-slate-50/80 last:border-r-0"
                                >
                                  <div className="flex min-h-12 items-center justify-center">
                                    <TrainerField
                                      key={`${cellKey}-${savedAssignment?.trainerId ?? savedAssignment?.trainerName ?? 'empty'}`}
                                      inputId={`${cellKey}-desktop`}
                                      selectedValue={getAssignmentDisplayValue(savedAssignment, trainerOptions)}
                                      selectedTrainerId={savedAssignment?.trainerId ?? null}
                                      trainerOptions={trainerOptions}
                                      disabled={isLoading || trainerOptions.length === 0}
                                      saving={savingCells[cellKey] === true}
                                      onCommit={(trainer) =>
                                        void commitTrainer(cellKey, day.date, slot, trainer)
                                      }
                                    />
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default IntroTrainingBoard;
