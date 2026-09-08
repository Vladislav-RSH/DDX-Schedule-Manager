import { useEffect, useMemo, useRef, useState } from 'react';
import { createSmartStartAssignment, deleteSmartStartAssignment, getSmartStartAssignments, updateSmartStartAssignment } from '../api/smartStartAssignments';
import { getTrainers, type Trainer } from '../api/trainers';
import TrainerField from './TrainerField';
import {
  buildTrainerOptions,
  getAssignmentDisplayValue,
  getDateKey,
  getTrainerName,
  loadStoredAssignments,
  saveStoredAssignments,
  type TrainerAssignmentMap,
} from '../lib/trainerAssignmentUtils';

type SmartStartDay = {
  label: string;
  date: Date;
  sessions: Array<string | null>;
};

type SmartStartWeek = {
  id: string;
  days: SmartStartDay[];
};

type DayHeader = {
  weekday: string;
  date: string;
};

type AssignmentMap = TrainerAssignmentMap;
type SavingMap = Record<string, boolean>;

const smartStartTimeSlots = ['10:00', '14:00', '18:00', '20:00'];

const weekdaySessions = [
  'SMART START НИЗ ТЕЛА',
  'SMART START ВСЕ ТЕЛО',
  'SMART START СПИНА+ГРУДЬ',
  'SMART START НИЗ ТЕЛА',
];

const weekendSessions = [
  'SMART START НИЗ ТЕЛА',
  'SMART START ВСЕ ТЕЛО',
  'SMART START СПИНА+ГРУДЬ',
  null,
];

const weekdayLabels = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

const smartStartAssignmentsStorageKey = 'ddx-smart-start-assignments';

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

const createDay = (date: Date): SmartStartDay => {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return {
    label: formatDayLabel(date),
    date,
    sessions: isWeekend ? weekendSessions : weekdaySessions,
  };
};

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
  const weeks: SmartStartWeek[] = [];
  const current = startOfWeek(anchorDate);
  const lastDay = endOfYear(anchorDate.getFullYear());

  let weekIndex = 1;

  while (current <= lastDay) {
    const days: SmartStartDay[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(current);
      day.setDate(current.getDate() + offset);

      if (day > lastDay) {
        break;
      }

      days.push(createDay(day));
    }

    weeks.push({
      id: `smart-start-week-${weekIndex}`,
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

const getMonthWeeks = (weeks: SmartStartWeek[], monthIndex: number) =>
  weeks.filter((week) => week.days.some((day) => day.date.getMonth() === monthIndex));

const getWeekdayDays = (days: SmartStartDay[]) =>
  days.filter((day) => day.date.getDay() >= 1 && day.date.getDay() <= 5);

const getWeekendDays = (days: SmartStartDay[]) =>
  days.filter((day) => day.date.getDay() === 6 || day.date.getDay() === 0);

const sessionBadgeClass =
  'inline-flex max-w-full items-center rounded-lg bg-slate-950 px-2.5 py-1.5 text-[10px] font-black uppercase leading-tight text-white break-words';

const smartStartCellKey = (date: Date, slot: string) =>
  `smart-start-${getDateKey(date)}-${slot.replace(/[^0-9]/g, '')}`;

type SmartStartBoardProps = {
  onOpenSidebar: () => void;
};

function SmartStartBoard({ onOpenSidebar }: SmartStartBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>(() =>
    loadStoredAssignments(smartStartAssignmentsStorageKey),
  );
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
    saveStoredAssignments(smartStartAssignmentsStorageKey, assignments);
  }, [assignments]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [trainersResult, assignmentsResult] = await Promise.allSettled([
        getTrainers(),
        getSmartStartAssignments(),
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

      if (assignmentsResult.status === 'fulfilled') {
        const nextAssignments = assignmentsResult.value.reduce<AssignmentMap>(
          (accumulator, assignment) => {
            accumulator[assignment.id] = {
              trainerId: assignment.trainerId,
              trainerName: assignment.trainerName,
              date: assignment.date,
              time: assignment.time,
            };

            return accumulator;
          },
          {},
        );

        setAssignments((currentAssignments) => ({
          ...nextAssignments,
          ...currentAssignments,
        }));
      } else {
        loadErrors.push('Не удалось загрузить расписание Smart Start.');
      }

      setErrorMessage(loadErrors.join(' '));
      setIsLoading(false);
    };

    void loadData();

    return () => {
      isMounted = false;
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
      previousAssignment?.trainerName === nextAssignment?.trainerName &&
      previousAssignment?.date === nextAssignment?.date &&
      previousAssignment?.time === nextAssignment?.time
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
        await updateSmartStartAssignment(cellKey, nextAssignment);
      } else if (nextAssignment) {
        await createSmartStartAssignment({
          id: cellKey,
          ...nextAssignment,
        });
      } else if (previousAssignment) {
        await deleteSmartStartAssignment(cellKey);
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

  const renderTrainerCell = (
    cellKey: string,
    date: Date,
    slot: string,
    savedAssignment: AssignmentMap[string] | null,
    session: string | null,
    variant: 'mobile' | 'desktop',
  ) => {
    const shouldShowTrainerField = session !== null || savedAssignment !== null;
    const inputId = `${cellKey}-${variant}`;

    return shouldShowTrainerField ? (
      <div
        className={`flex w-full min-w-0 flex-col gap-2 ${
          variant === 'mobile' ? 'items-start justify-center min-h-12' : 'items-center justify-center min-h-20'
        }`}
      >
        {session ? <span className={sessionBadgeClass}>{session}</span> : null}
        <TrainerField
          key={`${cellKey}-${savedAssignment?.trainerId ?? savedAssignment?.trainerName ?? 'empty'}`}
          inputId={inputId}
          selectedValue={getAssignmentDisplayValue(savedAssignment, trainerOptions)}
          selectedTrainerId={savedAssignment?.trainerId ?? null}
          trainerOptions={trainerOptions}
          disabled={isLoading || trainerOptions.length === 0}
          saving={savingCells[cellKey] === true}
          onCommit={(trainer) => void commitTrainer(cellKey, date, slot, trainer)}
        />
      </div>
    ) : (
      <div className={variant === 'mobile' ? 'min-h-12' : 'min-h-20'} aria-hidden="true" />
    );
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
          <label className="sr-only" htmlFor="smart-start-month">
            Month
          </label>
          <div className="relative w-44 sm:w-56">
            <select
              id="smart-start-month"
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
                        Smart Start - неделя {weekIndex + 1}
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
                              Smart Start
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200">
                            {smartStartTimeSlots.map((slot, slotIndex) => (
                              <div
                                key={`${day.label}-${slot}`}
                                className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-2 px-3 py-2.5 sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                              >
                                <span className="text-[11px] font-black leading-tight text-slate-700">
                                  {slot}
                                </span>
                                {renderTrainerCell(
                                  smartStartCellKey(day.date, slot),
                                  day.date,
                                  slot,
                                  assignments[smartStartCellKey(day.date, slot)] ?? null,
                                  day.sessions[slotIndex],
                                  'mobile',
                                )}
                              </div>
                            ))}
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
                        {smartStartTimeSlots.map((slot, slotIndex) => (
                          <tr key={slot} className="group">
                            <th
                              scope="row"
                              className="sticky left-0 z-20 border-b border-r border-slate-200 bg-[#4fb2c4] px-3 py-3 text-center align-middle text-[11px] font-black text-slate-950 transition-colors group-hover:bg-[#47a9ba]"
                            >
                              {slot}
                            </th>

                            {weekdayDays.map((day) => (
                              <td
                                key={`${week.id}-${day.label}-${slot}`}
                                className="border-b border-r border-slate-200 px-3 py-3 text-center align-middle transition-colors group-hover:bg-slate-50/80"
                              >
                                {renderTrainerCell(
                                  smartStartCellKey(day.date, slot),
                                  day.date,
                                  slot,
                                  assignments[smartStartCellKey(day.date, slot)] ?? null,
                                  day.sessions[slotIndex],
                                  'desktop',
                                )}
                              </td>
                            ))}

                            {weekendDays.length > 0 ? (
                              <th className="border-b border-r border-slate-200 bg-[#4fb2c4] px-2 py-3 text-center align-middle text-[11px] font-black text-slate-950 transition-colors group-hover:bg-[#47a9ba]">
                                {slot}
                              </th>
                            ) : null}

                            {weekendDays.map((day) => (
                              <td
                                key={`${week.id}-${day.label}-${slot}`}
                                className="border-b border-r border-slate-200 px-3 py-3 text-center align-middle transition-colors group-hover:bg-slate-50/80 last:border-r-0"
                              >
                                {renderTrainerCell(
                                  smartStartCellKey(day.date, slot),
                                  day.date,
                                  slot,
                                  assignments[smartStartCellKey(day.date, slot)] ?? null,
                                  day.sessions[slotIndex],
                                  'desktop',
                                )}
                              </td>
                            ))}
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

export default SmartStartBoard;
