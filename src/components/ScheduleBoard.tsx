import { useEffect, useMemo, useRef, useState } from 'react';

type ScheduleDay = {
  label: string;
  date: Date;
  cells: string[][];
};

type ScheduleWeek = {
  id: string;
  days: ScheduleDay[];
};

type DayHeader = {
  weekday: string;
  date: string;
};

const timeSlots = [
  '06:00 - 09:00',
  '09:00 - 13:00',
  '13:00 - 17:00',
  '17:00 - 21:00',
  '21:00 - 00:00',
];

const weekdayLabels = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

const formatDayLabel = (date: Date) => {
  const weekday = weekdayLabels[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${weekday} - ${day}.${month}`;
};

const createDay = (date: Date, filledCells: Record<number, string[]> = {}): ScheduleDay => ({
  label: formatDayLabel(date),
  date,
  cells: timeSlots.map((_, index) => filledCells[index] ?? []),
});

const splitDayLabel = (label: string): DayHeader => {
  const [weekday = label, date = ''] = label.split(' - ');

  return { weekday, date };
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
  const weeks: ScheduleWeek[] = [];
  const current = startOfWeek(anchorDate);
  const lastDay = endOfYear(anchorDate.getFullYear());

  let weekIndex = 1;

  while (current <= lastDay) {
    const days: ScheduleDay[] = [];

    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(current);
      day.setDate(current.getDate() + offset);

      if (day > lastDay) {
        break;
      }

      days.push(createDay(day));
    }

    weeks.push({
      id: `week-${weekIndex}`,
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

const getMonthWeeks = (weeks: ScheduleWeek[], monthIndex: number) =>
  weeks.filter((week) => week.days.some((day) => day.date.getMonth() === monthIndex));

const assignmentBadgeClass =
  'inline-flex w-fit max-w-full items-center rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-white break-words';

const renderAssignments = (items: string[]) =>
  items.map((item, index) => (
    <span key={`${item}-${index}`} className={assignmentBadgeClass}>
      {item}
    </span>
  ));

type ScheduleBoardProps = {
  onOpenSidebar: () => void;
};

function ScheduleBoard({ onOpenSidebar }: ScheduleBoardProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthIndex);
  const boardScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedMonthWeeks = useMemo(
    () => getMonthWeeks(currentYearWeeks, selectedMonth),
    [selectedMonth],
  );

  useEffect(() => {
    boardScrollRef.current?.scrollTo({ left: 0 });
  }, [selectedMonth]);

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
            DDX schedule
          </h1>
        </header>

        <div className="flex justify-start">
          <label className="sr-only" htmlFor="schedule-month">
            Month
          </label>
          <div className="relative w-44 sm:w-56">
            <select
              id="schedule-month"
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

        <div ref={boardScrollRef} className="overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
          <div className="flex gap-0">
            {selectedMonthWeeks.map((week, weekIndex) => (
              <section
                key={week.id}
                className="w-full shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Неделя {weekIndex + 1}</p>
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
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-[#fbfcfe] shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[#ff6a00]">
                              {header.weekday}
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-950">{header.date}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#ecfdff] px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                            Day
                          </span>
                        </div>

                        <div className="divide-y divide-slate-200">
                          {timeSlots.map((slot, slotIndex) => {
                            const cell = day.cells[slotIndex];

                            return (
                              <div
                                key={`${day.label}-${slot}`}
                                className="grid grid-cols-[5.75rem_minmax(0,1fr)] gap-2 px-3 py-2.5 sm:grid-cols-[6.5rem_minmax(0,1fr)]"
                              >
                                <span className="text-[10px] font-black uppercase leading-tight tracking-[0.22em] text-slate-700">
                                  {slot}
                                </span>
                                <div className="flex min-h-6 flex-wrap gap-1.5">
                                  {cell.length > 0 ? renderAssignments(cell) : (
                                    <span className="text-[11px] text-slate-400">Свободно</span>
                                  )}
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
                  <table className="w-full min-w-[1240px] table-fixed border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-30 w-36 border-b border-r border-slate-200 bg-[#ff6a00] px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.3em] text-white shadow-[1px_0_0_rgba(15,23,42,0.08)]">
                          Время
                        </th>
                        {week.days.map((day) => {
                          const header = splitDayLabel(day.label);

                          return (
                            <th
                              key={day.label}
                              className="border-b border-r border-slate-200 bg-[#ff6a00] px-2 py-3 text-center text-white last:border-r-0"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.32em] opacity-90">
                                  {header.weekday}
                                </span>
                                <span className="text-sm font-semibold tracking-tight">{header.date}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody>
                      {timeSlots.map((slot, slotIndex) => (
                        <tr key={slot} className="group">
                          <th
                            scope="row"
                            className="sticky left-0 z-20 border-b border-r border-slate-200 bg-[#87e5ee] px-3 py-3 text-left align-top text-[11px] font-black uppercase tracking-[0.22em] text-slate-900 transition-colors group-hover:bg-[#7bdfe8]"
                          >
                            <span className="block leading-tight">{slot}</span>
                          </th>

                          {week.days.map((day) => {
                            const cell = day.cells[slotIndex];

                            return (
                              <td
                                key={`${week.id}-${day.label}-${slot}`}
                                className="border-b border-r border-slate-200 px-3 py-3 align-top transition-colors group-hover:bg-slate-50/80 last:border-r-0"
                              >
                                {cell.length > 0 ? (
                                  <div className="flex min-h-16 flex-col gap-1">
                                    {renderAssignments(cell)}
                                  </div>
                                ) : (
                                  <div className="min-h-16" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ScheduleBoard;
