'use client';

import React from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Link as LinkIcon,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { CMSActionButton } from '@/types';
import { detectDestinationType } from '@/lib/actionButtonUtils';

interface ActionButtonEditorProps {
  buttons: CMSActionButton[];
  onChange: (buttons: CMSActionButton[]) => void;
}

export function ActionButtonEditor({ buttons, onChange }: ActionButtonEditorProps) {
  const handleAddButton = () => {
    const newId = `btn-${Date.now()}`;
    const newButton: CMSActionButton = {
      id: newId,
      label: 'زر إجراء جديد',
      labelEn: 'New Action',
      enabled: true,
      destinationType: 'booking',
      destinationValue: '/booking',
      order: buttons.length,
      variant: buttons.length === 0 ? 'primary' : 'secondary',
    };
    const updated = [...buttons, newButton];
    onChange(updated);
  };

  const handleRemoveButton = (id: string) => {
    const updated = buttons.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i }));
    onChange(updated);
  };

  const handleUpdateButton = (id: string, updates: Partial<CMSActionButton>) => {
    const updated = buttons.map((b) => {
      if (b.id !== id) return b;
      const modified = { ...b, ...updates };
      if (updates.destinationValue !== undefined) {
        modified.destinationType = detectDestinationType(updates.destinationValue);
      }
      return modified;
    });
    onChange(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= buttons.length) return;

    const list = [...buttons];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((b, i) => ({ ...b, order: i }));
    onChange(reordered);
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0866C6]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              أزرار الإجراء والوجهات (Action Buttons)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            إضافة أزرار التفاعل بسهولة: اكتب الاسم بالعربية، الاسم بالإنجليزية، ورابط الوجهة فقط
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddButton}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0866C6] hover:bg-[#07345C] text-white text-xs font-bold shadow-xs active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة زر إجراء جديد</span>
        </button>
      </div>

      {buttons.length === 0 ? (
        <div className="py-8 text-center space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            لم يتم إنشاء أي أزرار إجراء حالياً.
          </p>
          <button
            type="button"
            onClick={handleAddButton}
            className="text-xs font-bold text-[#0866C6] hover:underline cursor-pointer"
          >
            + أضف زر إجراء الآن
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {buttons.map((btn, index) => {
            return (
              <div
                key={btn.id}
                className={`p-4 rounded-2xl border transition-all ${
                  btn.enabled
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/90 dark:border-slate-700/80 shadow-2xs'
                    : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800 opacity-60'
                }`}
              >
                {/* Top Row: Summary & Controls */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/70 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {btn.label || 'زر بدون تسمية'}
                    </span>
                    {btn.labelEn && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate" dir="ltr">
                        ({btn.labelEn})
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0866C6]/10 text-[#0866C6] dark:text-[#38BDF8] font-mono font-bold max-w-[200px] truncate" dir="ltr">
                      {btn.destinationValue || '/'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle Enabled */}
                    <button
                      type="button"
                      onClick={() => handleUpdateButton(btn.id, { enabled: !btn.enabled })}
                      title={btn.enabled ? 'تعطيل الزر (لن يظهر للعملاء)' : 'تفعيل الزر'}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                        btn.enabled
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-slate-300'
                      }`}
                    >
                      {btn.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{btn.enabled ? 'مفعّل' : 'معطّل'}</span>
                    </button>

                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                      title="تحريك لأعلى"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={index === buttons.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition-colors cursor-pointer"
                      title="تحريك لأسفل"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(btn.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      title="حذف الزر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Body Form: Only 3 Inputs (Arabic, English, Destination) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                  {/* Label Arabic */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      نص الزر (العربية) *
                    </label>
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) => handleUpdateButton(btn.id, { label: e.target.value })}
                      placeholder="مثال: احجز الآن"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] outline-hidden transition-all"
                    />
                  </div>

                  {/* Label English */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      نص الزر (English)
                    </label>
                    <input
                      type="text"
                      value={btn.labelEn || ''}
                      onChange={(e) => handleUpdateButton(btn.id, { labelEn: e.target.value })}
                      placeholder="e.g. Book Now"
                      dir="ltr"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] outline-hidden transition-all"
                    />
                  </div>

                  {/* Destination (Direct URL or Path) */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      وجهة التوجيه (Destination) *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={btn.destinationValue}
                        onChange={(e) =>
                          handleUpdateButton(btn.id, { destinationValue: e.target.value })
                        }
                        placeholder="مثال: /booking أو /services أو https://example.com"
                        dir="ltr"
                        className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] outline-hidden transition-all"
                      />
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Style Picker & Live Visual Button Preview */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-700/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Style Variant */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500">مظهر الزر:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateButton(btn.id, { variant: 'primary' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          btn.variant === 'primary' || !btn.variant
                            ? 'bg-[#0866C6] text-white shadow-2xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        رئيسي (أزرق)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateButton(btn.id, { variant: 'secondary' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          btn.variant === 'secondary'
                            ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        ثانوي (داكن/فاتح)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateButton(btn.id, { variant: 'outline' })}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          btn.variant === 'outline'
                            ? 'border-2 border-[#0866C6] text-[#0866C6] dark:text-[#38BDF8] bg-transparent'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        مفرغ (Outline)
                      </button>
                    </div>
                  </div>

                  {/* Live Visual Button Preview */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">معاينة شكل الزر:</span>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all select-none ${
                        btn.variant === 'primary' || !btn.variant
                          ? 'bg-[#0866C6] text-white shadow-xs'
                          : btn.variant === 'outline'
                          ? 'border border-[#0866C6] text-[#0866C6] dark:text-[#38BDF8] bg-transparent'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white'
                      }`}
                    >
                      <span>{btn.label || 'نص الزر'}</span>
                      <ArrowLeft className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
