/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Filter,
  Calendar,
  X,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DatePreset = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';

export interface FilterFieldOption {
  label: string;
  value: string;
}

export interface DynamicFilterField {
  id: string;
  label: string;
  type: 'select' | 'text' | 'number-range';
  options?: FilterFieldOption[];
  placeholder?: string;
  minPlaceholder?: string;
  maxPlaceholder?: string;
}

export interface SortOption {
  label: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface StatusOption {
  label: string;
  value: string;
  colorClass?: string;
  count?: number;
}

export interface GlobalFilterValues {
  search: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  status: string;
  dynamicFilters: Record<string, any>;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface GlobalFilterEngineProps {
  initialValues?: Partial<GlobalFilterValues>;
  statusOptions?: StatusOption[];
  dynamicFields?: DynamicFilterField[];
  sortOptions?: SortOption[];
  searchPlaceholder?: string;
  onFilterChange: (values: GlobalFilterValues) => void;
  className?: string;
}

const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'كافة الأوقات' },
  { id: 'today', label: 'اليوم' },
  { id: 'yesterday', label: 'أمس' },
  { id: 'last_7_days', label: 'آخر 7 أيام' },
  { id: 'last_30_days', label: 'آخر 30 يوم' },
  { id: 'this_month', label: 'هذا الشهر' },
  { id: 'custom', label: 'مخصص' },
];

export function computeDatesForPreset(preset: DatePreset): { dateFrom: string; dateTo: string } {
  const toLocalIso = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const todayStr = toLocalIso(today);

  switch (preset) {
    case 'today':
      return { dateFrom: todayStr, dateTo: todayStr };
    case 'yesterday': {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = toLocalIso(y);
      return { dateFrom: yStr, dateTo: yStr };
    }
    case 'last_7_days': {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { dateFrom: toLocalIso(d), dateTo: todayStr };
    }
    case 'last_30_days': {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { dateFrom: toLocalIso(d), dateTo: todayStr };
    }
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toLocalIso(firstDay), dateTo: todayStr };
    }
    case 'all':
    case 'custom':
    default:
      return { dateFrom: '', dateTo: '' };
  }
}

export default function GlobalFilterEngine({
  initialValues,
  statusOptions = [],
  dynamicFields = [],
  sortOptions = [],
  searchPlaceholder = 'بحث بالاسم، الكود، الهاتف...',
  onFilterChange,
  className,
}: GlobalFilterEngineProps) {
  const [search, setSearch] = useState(initialValues?.search || '');
  const [debouncedSearch, setDebouncedSearch] = useState(initialValues?.search || '');
  const [datePreset, setDatePreset] = useState<DatePreset>(initialValues?.datePreset || 'all');
  const [dateFrom, setDateFrom] = useState(initialValues?.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialValues?.dateTo || '');
  const [status, setStatus] = useState(initialValues?.status || 'all');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, any>>(initialValues?.dynamicFilters || {});
  const [sortBy, setSortBy] = useState(initialValues?.sortBy || (sortOptions[0]?.sortBy || 'createdAt'));
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    initialValues?.sortOrder || (sortOptions[0]?.sortOrder || 'desc')
  );
  const [isExpanded, setIsExpanded] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Sync date preset changes
  const handlePresetChange = useCallback((newPreset: DatePreset) => {
    setDatePreset(newPreset);
    if (newPreset !== 'custom') {
      const { dateFrom: df, dateTo: dt } = computeDatesForPreset(newPreset);
      setDateFrom(df);
      setDateTo(dt);
    }
  }, []);

  // Emit filter updates whenever state changes
  useEffect(() => {
    onFilterChange({
      search: debouncedSearch,
      datePreset,
      dateFrom,
      dateTo,
      status,
      dynamicFilters,
      sortBy,
      sortOrder,
    });
  }, [debouncedSearch, datePreset, dateFrom, dateTo, status, dynamicFilters, sortBy, sortOrder, onFilterChange]);

  // Handle dynamic field update
  const handleDynamicChange = (fieldId: string, value: any) => {
    setDynamicFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === null || value === '' || value === 'all') {
        delete next[fieldId];
      } else {
        next[fieldId] = value;
      }
      return next;
    });
  };

  // Handle number-range update
  const handleRangeChange = (fieldId: string, subKey: 'min' | 'max', val: string) => {
    setDynamicFilters((prev) => {
      const current = prev[fieldId] || {};
      const numVal = val !== '' ? Number(val) : undefined;
      const updated = { ...current, [subKey]: numVal };
      if (updated.min === undefined && updated.max === undefined) {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      }
      return { ...prev, [fieldId]: updated };
    });
  };

  // Clear all filters
  const handleResetAll = () => {
    setSearch('');
    setDebouncedSearch('');
    setDatePreset('all');
    setDateFrom('');
    setDateTo('');
    setStatus('all');
    setDynamicFilters({});
    if (sortOptions.length > 0) {
      setSortBy(sortOptions[0].sortBy);
      setSortOrder(sortOptions[0].sortOrder);
    }
  };

  // Compute active chips
  const activeChips = useMemo(() => {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];

    if (debouncedSearch.trim()) {
      chips.push({
        id: 'search',
        label: `بحث: "${debouncedSearch.trim()}"`,
        onRemove: () => {
          setSearch('');
          setDebouncedSearch('');
        },
      });
    }

    if (datePreset !== 'all') {
      const presetObj = DATE_PRESETS.find((p) => p.id === datePreset);
      let label = presetObj ? presetObj.label : datePreset;
      if (datePreset === 'custom' && (dateFrom || dateTo)) {
        label = `من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}`;
      }
      chips.push({
        id: 'date',
        label: `التاريخ: ${label}`,
        onRemove: () => handlePresetChange('all'),
      });
    }

    if (status && status !== 'all') {
      const statusObj = statusOptions.find((s) => s.value === status);
      chips.push({
        id: 'status',
        label: `الحالة: ${statusObj?.label || status}`,
        onRemove: () => setStatus('all'),
      });
    }

    dynamicFields.forEach((field) => {
      const val = dynamicFilters[field.id];
      if (val !== undefined && val !== null && val !== '' && val !== 'all') {
        if (field.type === 'select') {
          const opt = field.options?.find((o) => o.value === val);
          chips.push({
            id: field.id,
            label: `${field.label}: ${opt?.label || val}`,
            onRemove: () => handleDynamicChange(field.id, 'all'),
          });
        } else if (field.type === 'number-range') {
          const min = val.min;
          const max = val.max;
          if (min !== undefined || max !== undefined) {
            chips.push({
              id: field.id,
              label: `${field.label}: ${min !== undefined ? `من ${min}` : ''} ${max !== undefined ? `إلى ${max}` : ''}`,
              onRemove: () => handleDynamicChange(field.id, undefined),
            });
          }
        } else {
          chips.push({
            id: field.id,
            label: `${field.label}: ${val}`,
            onRemove: () => handleDynamicChange(field.id, ''),
          });
        }
      }
    });

    return chips;
  }, [debouncedSearch, datePreset, dateFrom, dateTo, status, dynamicFilters, dynamicFields, statusOptions, handlePresetChange]);

  const hasActiveFilters = activeChips.length > 0;

  return (
    <div className={cn('space-y-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs', className)}>
      {/* Top Main Row: Search + Quick Date Presets + Sort + Toggle Advanced */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search input with live clear */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-10 py-2.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
              }}
              className="absolute left-3 top-2.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Date Presets Pill List (Scrollable on mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {DATE_PRESETS.map((p) => {
            const isSelected = datePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  isSelected
                    ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30 ring-2 ring-sky-500/20'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                )}
              >
                {p.id === 'custom' && <CalendarDays className="w-3 h-3" />}
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sort Dropdown & Expand Controls */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {sortOptions.length > 0 && (
            <div className="relative flex items-center">
              <select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split(':');
                  setSortBy(sb);
                  setSortOrder(so as 'asc' | 'desc');
                }}
                className="pl-3 pr-8 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold focus:outline-hidden focus:border-sky-500 appearance-none cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={`${opt.sortBy}:${opt.sortOrder}`} value={`${opt.sortBy}:${opt.sortOrder}`}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          )}

          {/* Advanced toggle button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border',
              isExpanded || hasActiveFilters
                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/60'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>فلاتر متقدمة</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker Inputs (shown when datePreset === 'custom' or isExpanded) */}
      {datePreset === 'custom' && (
        <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-500" />
            تحديد نطاق زمني مخصص:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 text-[11px]">من:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-500 dark:text-slate-400 text-[11px]">إلى:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-rose-500 font-bold hover:underline"
            >
              مسح التواريخ
            </button>
          )}
        </div>
      )}

      {/* Status Filter Chips Row */}
      {statusOptions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
          <span className="text-xs font-bold text-slate-400 ml-2 shrink-0">الحالة:</span>
          {statusOptions.map((opt) => {
            const isSelected = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={cn(
                  'px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                  isSelected
                    ? opt.colorClass || 'bg-[#07345C] text-white dark:bg-[#0866C6] dark:text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <span>{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                      isSelected ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'
                    )}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible Advanced Filters Section */}
      {isExpanded && dynamicFields.length > 0 && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 animate-in fade-in-50 duration-200">
          {dynamicFields.map((field) => {
            const currentVal = dynamicFilters[field.id];

            if (field.type === 'select') {
              return (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {field.label}
                  </label>
                  <select
                    value={currentVal || 'all'}
                    onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
                  >
                    <option value="all">{field.placeholder || `كافة ${field.label}`}</option>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (field.type === 'number-range') {
              const range = currentVal || {};
              return (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {field.label}
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      placeholder={field.minPlaceholder || 'الحد الأدنى'}
                      value={range.min !== undefined ? range.min : ''}
                      onChange={(e) => handleRangeChange(field.id, 'min', e.target.value)}
                      className="w-1/2 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                      type="number"
                      placeholder={field.maxPlaceholder || 'الحد الأقصى'}
                      value={range.max !== undefined ? range.max : ''}
                      onChange={(e) => handleRangeChange(field.id, 'max', e.target.value)}
                      className="w-1/2 p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              );
            }

            if (field.type === 'text') {
              return (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    placeholder={field.placeholder || field.label}
                    value={currentVal || ''}
                    onChange={(e) => handleDynamicChange(field.id, e.target.value)}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white"
                  />
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Active Filter Chips & Clear All */}
      {hasActiveFilters && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-1">
            <Filter className="w-3 h-3 text-sky-500" />
            الفلاتر النشطة ({activeChips.length}):
          </span>

          {activeChips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="hover:text-rose-500 transition-colors p-0.5 rounded-full"
                title="إزالة الفلتر"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline px-2 py-0.5"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة ضبط الكل</span>
          </button>
        </div>
      )}
    </div>
  );
}
