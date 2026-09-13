import {
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  getTrainerShortName,
  normalizeValue,
  type TrainerAssignmentCounts,
  type TrainerOption,
} from '../lib/trainerAssignmentUtils';
import type { Trainer } from '../api/trainers';

type TrainerFieldProps = {
  inputId: string;
  selectedValue: string;
  selectedTrainerId: string | null;
  trainerOptions: TrainerOption[];
  disabled: boolean;
  saving: boolean;
  readOnly?: boolean;
  assignmentCounts?: TrainerAssignmentCounts;
  assignmentCountLabel?: string;
  onCommit: (trainer: Trainer | null) => void;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function TrainerField({
  inputId,
  selectedValue,
  selectedTrainerId,
  trainerOptions,
  disabled,
  saving,
  readOnly = false,
  assignmentCounts,
  assignmentCountLabel = 'назначений',
  onCommit,
}: TrainerFieldProps) {
  const [query, setQuery] = useState(selectedValue);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
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

      if (
        target &&
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
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

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const updateDropdownPosition = () => {
      const input = inputRef.current;

      if (!input) {
        return;
      }

      const rect = input.getBoundingClientRect();
      const viewportPadding = 8;
      const gap = 4;
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const openAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      const availableSpace = openAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(96, Math.min(320, availableSpace));
      const width = Math.min(
        Math.max(rect.width, 220),
        window.innerWidth - viewportPadding * 2,
      );
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - width,
      );
      const top = openAbove
        ? Math.max(viewportPadding, rect.top - gap - maxHeight)
        : Math.min(
            window.innerHeight - viewportPadding - maxHeight,
            rect.bottom + gap,
          );

      setDropdownPosition({
        top,
        left,
        width,
        maxHeight,
      });
    };

    const frameId = window.requestAnimationFrame(updateDropdownPosition);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen]);

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

    setDropdownPosition(null);
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
      setDropdownPosition(null);
      setIsOpen(true);
      setActiveIndex((currentIndex) =>
        filteredOptions.length === 0 ? 0 : (currentIndex + 1) % filteredOptions.length,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setDropdownPosition(null);
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

  if (readOnly) {
    return (
      <div className="flex min-h-9 w-full min-w-0 items-center justify-center px-2 text-center text-[11px] font-bold text-slate-950">
        {selectedValue}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <input
        id={inputId}
        ref={inputRef}
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

      {isOpen && !disabled && !saving && dropdownPosition
        ? createPortal(
            <div
              ref={dropdownRef}
              className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-xl"
              style={{
                position: 'fixed',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 1000,
              }}
            >
              {assignmentCounts ? (
                <div className="whitespace-nowrap border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold text-slate-500">
                  За текущий месяц: {assignmentCountLabel}
                </div>
              ) : null}
              <ul
                id={`${inputId}-options`}
                role="listbox"
                className="overflow-y-auto overscroll-contain py-1 text-left"
                style={{ maxHeight: dropdownPosition.maxHeight }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map(({ trainer, label }, index) => {
                    const isSelected = selectedTrainerId === trainer.id;
                    const isHighlighted = index === visibleActiveIndex;
                    const assignmentCount = assignmentCounts?.[trainer.id] ?? 0;

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
                          {assignmentCounts ? (
                            <span
                              className="shrink-0 rounded-full bg-[#fff1e6] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#c85300]"
                              title={`${assignmentCount} ${assignmentCountLabel} за текущий месяц`}
                            >
                              {assignmentCount}
                            </span>
                          ) : null}
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
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export default TrainerField;
