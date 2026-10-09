'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Save, Calendar, Clock, Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function AdminBookingSettingsPage() {
  const [mounted, setMounted] = useState(false);
  const booking = useSettingsStore((s) => s.settings.booking);
  const updateBooking = useSettingsStore((s) => s.updateBooking);
  const addHoliday = useSettingsStore((s) => s.addHoliday);
  const removeHoliday = useSettingsStore((s) => s.removeHoliday);
  const toggleBlockedDate = useSettingsStore((s) => s.toggleBlockedDate);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);
  const [saving, setSaving] = useState(false);

  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('22:00');
  const [slotDuration, setSlotDuration] = useState('60');
  const [slotInterval, setSlotInterval] = useState('60');
  const [bufferTime, setBufferTime] = useState('15');
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState('2');
  const [advanceBookingDays, setAdvanceBookingDays] = useState('14');
  const [sameDayBooking, setSameDayBooking] = useState(true);
  const [workingDays, setWorkingDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [blockDateInput, setBlockDateInput] = useState('');

  useEffect(() => {
    setMounted(true);
    fetchAdminSettings();
  }, [fetchAdminSettings]);

  useEffect(() => {
    if (booking) {
      setWorkingHoursStart(booking.workingHoursStart || '09:00');
      setWorkingHoursEnd(booking.workingHoursEnd || '22:00');
      setSlotDuration((booking.slotDuration || 60).toString());
      setSlotInterval((booking.slotInterval || 60).toString());
      setBufferTime((booking.bufferTime !== undefined ? booking.bufferTime : 15).toString());
      setMaxBookingsPerSlot((booking.maxBookingsPerSlot || 2).toString());
      setAdvanceBookingDays((booking.advanceBookingDays || 14).toString());
      setSameDayBooking(booking.sameDayBooking ?? true);
      setWorkingDays(booking.workingDays || [0, 1, 2, 3, 4, 5, 6]);
    }
  }, [booking]);

  const toggleDay = (dayIdx: number) => {
    setWorkingDays((prev) =>
      prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx]
    );
  };

  const normalizeTimeString = (val: string): string => {
    if (!val) return '09:00';
    const clean = val.trim();
    if (/^\d{1,2}$/.test(clean)) {
      const h = parseInt(clean, 10);
      return `${h.toString().padStart(2, '0')}:00`;
    }
    if (/^\d{1,2}:\d{1,2}$/.test(clean)) {
      const [h, m] = clean.split(':');
      return `${parseInt(h, 10).toString().padStart(2, '0')}:${parseInt(m, 10).toString().padStart(2, '0')}`;
    }
    return clean;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const normStart = normalizeTimeString(workingHoursStart);
    const normEnd = normalizeTimeString(workingHoursEnd);
    setWorkingHoursStart(normStart);
    setWorkingHoursEnd(normEnd);

    const updatedBooking = {
      ...booking,
      workingHoursStart: normStart,
      workingHoursEnd: normEnd,
      slotDuration: Number(slotDuration) || 60,
      slotInterval: Number(slotInterval) || 60,
      bufferTime: Number(bufferTime) || 15,
      maxBookingsPerSlot: Number(maxBookingsPerSlot) || 2,
      advanceBookingDays: Number(advanceBookingDays) || 14,
      sameDayBooking,
      workingDays,
      holidays: booking.holidays || [],
      blockedDates: booking.blockedDates || [],
    };

    updateBooking(updatedBooking);
    const success = await saveSettingsToDatabase({ booking: updatedBooking as any });
    setSaving(false);

    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تحديث قواعد الحجز وحفظها في قاعدة البيانات',
        module: 'settings',
        target: 'إعدادات الحجز',
      });
      toast.success('تم حفظ قواعد الحجز والمواعيد في قاعدة البيانات وتطبيقها فوراً!');
    } else {
      toast.error('حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات');
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayName) {
      toast.error('يرجى إدخال تاريخ العطلة والمناسبة');
      return;
    }
    addHoliday(newHolidayDate, newHolidayName);
    const existing = booking.holidays || [];
    const updatedHolidays = [...existing.filter(h => h.date !== newHolidayDate), { date: newHolidayDate, name: newHolidayName }];
    await saveSettingsToDatabase({ booking: { ...booking, holidays: updatedHolidays } as any });
    setNewHolidayDate('');
    setNewHolidayName('');
    toast.success('تمت إضافة الإجازة وحفظها في قاعدة البيانات');
  };

  const handleRemoveHoliday = async (date: string) => {
    removeHoliday(date);
    const updatedHolidays = (booking.holidays || []).filter((h) => h.date !== date);
    await saveSettingsToDatabase({ booking: { ...booking, holidays: updatedHolidays } as any });
    toast.success('تم حذف الإجازة وتحديث قاعدة البيانات');
  };

  const handleAddBlockedDate = async () => {
    if (!blockDateInput) {
      toast.error('يرجى تحديد التاريخ المراد حجبه');
      return;
    }
    toggleBlockedDate(blockDateInput);
    const existing = booking.blockedDates || [];
    const exists = existing.includes(blockDateInput);
    const updatedBlocked = exists ? existing.filter((d) => d !== blockDateInput) : [...existing, blockDateInput];
    await saveSettingsToDatabase({ booking: { ...booking, blockedDates: updatedBlocked } as any });
    setBlockDateInput('');
    toast.success('تم تحديث قائمة التواريخ المحجوبة في قاعدة البيانات');
  };

  const handleRemoveBlockedDate = async (date: string) => {
    toggleBlockedDate(date);
    const existing = booking.blockedDates || [];
    const updatedBlocked = existing.filter((d) => d !== date);
    await saveSettingsToDatabase({ booking: { ...booking, blockedDates: updatedBlocked } as any });
    toast.success('تم إزالة حجب التاريخ من قاعدة البيانات');
  };

  if (!mounted) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        جارٍ تحميل قواعد الحجز والمواعيد...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/settings"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة الإعدادات
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          قواعد الحجز والجاهزية (Booking Availability Rules)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          التحكم بساعات العمل، فواصل المواعيد، الفترات العازلة، والتواريخ المحجوبة
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Working Hours & Slot Times */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">ساعات العمل وفواصل المواعيد</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">بداية العمل اليومي</label>
              <input
                type="text"
                required
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                onBlur={() => setWorkingHoursStart(normalizeTimeString(workingHoursStart))}
                placeholder="09:00"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">نهاية العمل اليومي</label>
              <input
                type="text"
                required
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                onBlur={() => setWorkingHoursEnd(normalizeTimeString(workingHoursEnd))}
                placeholder="22:00"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">الفاصل بين الفترات (دقيقة)</label>
              <input
                type="number"
                required
                min={15}
                max={240}
                value={slotInterval}
                onChange={(e) => setSlotInterval(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">الوقت العازل Buffer (دقيقة)</label>
              <input
                type="number"
                required
                min={0}
                max={120}
                value={bufferTime}
                onChange={(e) => setBufferTime(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-sky-500"
              />
            </div>
          </div>

          {/* Working Days Checkboxes */}
          <div className="pt-2">
            <label className="block text-xs font-semibold mb-2">أيام العمل المتاحة للحجز</label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((name, idx) => {
                const active = workingDays.includes(idx);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-[#0866C6] text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                    style={active ? { backgroundColor: 'var(--cleanzo-blue)' } : undefined}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Advance Booking & Capacity */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">السعة والحجز المسبق</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">أقصى حجوزات في نفس الوقت</label>
              <input
                type="number"
                min={1}
                max={20}
                value={maxBookingsPerSlot}
                onChange={(e) => setMaxBookingsPerSlot(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">إمكانية الحجز المسبق حتى (يوم)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={advanceBookingDays}
                onChange={(e) => setAdvanceBookingDays(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="sameday"
                checked={sameDayBooking}
                onChange={(e) => setSameDayBooking(e.target.checked)}
                className="w-4 h-4 rounded-sm text-sky-500"
              />
              <label htmlFor="sameday" className="font-semibold cursor-pointer select-none">
                السماح بالحجز في نفس اليوم (Same-Day)
              </label>
            </div>
          </div>
        </div>

        {/* Holidays & Blocked Dates */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-xs text-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">الإجازات والتواريخ المحجوبة</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Holidays */}
            <div className="space-y-3">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">العطلات الرسمية</span>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <input
                  type="text"
                  placeholder="المناسبة"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={handleAddHoliday}
                  className="px-3 py-2 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 transition-colors"
                  style={{ backgroundColor: 'var(--cleanzo-blue)' }}
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-1">
                {(booking.holidays || []).map((h, i) => (
                  <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                    <span>{h.name} ({h.date})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.date)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocked Dates */}
            <div className="space-y-3">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">تواريخ محجوبة للصيانة</span>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={blockDateInput}
                  onChange={(e) => setBlockDateInput(e.target.value)}
                  className="flex-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={handleAddBlockedDate}
                  className="px-3 py-2 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors"
                >
                  حجب
                </button>
              </div>

              <div className="space-y-1">
                {(booking.blockedDates || []).map((date, i) => (
                  <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
                    <span className="font-mono">{date}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedDate(date)}
                      className="text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'جارٍ الحفظ في قاعدة البيانات...' : 'حفظ قواعد الحجز والمواعيد'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
