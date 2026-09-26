'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Layers,
  Car,
  Home,
  Calendar,
  CreditCard,
  X,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { FAQItem } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CMSLivePreview } from '@/components/admin/CMSLivePreview';

export default function AdminFAQManagementPage() {
  const faqs = useCMSStore((s) => s.faqs);
  const fetchAdminFAQs = useCMSStore((s) => s.fetchAdminFAQs);
  const addFAQ = useCMSStore((s) => s.addFAQ);
  const updateFAQ = useCMSStore((s) => s.updateFAQ);
  const deleteFAQ = useCMSStore((s) => s.deleteFAQ);
  const reorderFAQs = useCMSStore((s) => s.reorderFAQs);
  const toggleFAQVisibility = useCMSStore((s) => s.toggleFAQVisibility);
  const resetToDefaults = useCMSStore((s) => s.resetToDefaults);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  React.useEffect(() => {
    fetchAdminFAQs();
  }, [fetchAdminFAQs]);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);

  // Form State
  const [formCategory, setFormCategory] = useState<'car' | 'home' | 'booking' | 'general'>('car');
  const [formQuestion, setFormQuestion] = useState('');
  const [formQuestionEn, setFormQuestionEn] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formAnswerEn, setFormAnswerEn] = useState('');
  const [formVisible, setFormVisible] = useState(true);

  // Reset form
  const resetForm = () => {
    setEditingFaq(null);
    setFormCategory('car');
    setFormQuestion('');
    setFormQuestionEn('');
    setFormAnswer('');
    setFormAnswerEn('');
    setFormVisible(true);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (faq: FAQItem) => {
    setEditingFaq(faq);
    setFormCategory(faq.category);
    setFormQuestion(faq.question);
    setFormQuestionEn(faq.questionEn || '');
    setFormAnswer(faq.answer);
    setFormAnswerEn(faq.answerEn || '');
    setFormVisible(faq.visible);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) {
      toast.error('يرجى ملء نص السؤال والإجابة بالعربية على الأقل.');
      return;
    }

    if (editingFaq) {
      updateFAQ(editingFaq.id, {
        category: formCategory,
        question: formQuestion.trim(),
        questionEn: formQuestionEn.trim() || formQuestion.trim(),
        answer: formAnswer.trim(),
        answerEn: formAnswerEn.trim() || formAnswer.trim(),
        visible: formVisible,
      });
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تعديل سؤال شائع',
        module: 'content',
        target: formQuestion.slice(0, 30),
      });
      toast.success('تم تحديث السؤال بنجاح!');
    } else {
      addFAQ({
        category: formCategory,
        question: formQuestion.trim(),
        questionEn: formQuestionEn.trim() || formQuestion.trim(),
        answer: formAnswer.trim(),
        answerEn: formAnswerEn.trim() || formAnswer.trim(),
        visible: formVisible,
        order: faqs.length + 1,
      });
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'إضافة سؤال شائع جديد',
        module: 'content',
        target: formQuestion.slice(0, 30),
      });
      toast.success('تمت إضافة السؤال بنجاح!');
    }

    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (id: string, question: string) => {
    if (confirm(`هل أنت متأكد من حذف هذا السؤال: "${question}"؟`)) {
      deleteFAQ(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حذف سؤال شائع',
        module: 'content',
        target: question.slice(0, 30),
      });
      toast.info('تم حذف السؤال بنجاح');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const items = [...faqs];
    const [moved] = items.splice(index, 1);
    items.splice(index - 1, 0, moved);
    reorderFAQs(items);
    toast.success('تم تقديم أولوية السؤال');
  };

  const moveDown = (index: number) => {
    if (index === faqs.length - 1) return;
    const items = [...faqs];
    const [moved] = items.splice(index, 1);
    items.splice(index + 1, 0, moved);
    reorderFAQs(items);
    toast.success('تم تأخير أولوية السؤال');
  };

  const filteredFaqs = useMemo(() => {
    return faqs
      .filter((f) => {
        const matchCat = selectedCategory === 'all' || f.category === selectedCategory;
        const q = search.trim().toLowerCase();
        if (!q) return matchCat;
        return (
          matchCat &&
          ((f.question + ' ' + f.answer).toLowerCase().includes(q) ||
            (f.questionEn + ' ' + f.answerEn).toLowerCase().includes(q))
        );
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [faqs, selectedCategory, search]);

  const categoryBadge = (cat: string) => {
    switch (cat) {
      case 'car':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">سيارات</span>;
      case 'home':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#07345C]/10 text-[#07345C] dark:text-[#83AED0]">منازل</span>;
      case 'booking':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">حجز ومواعيد</span>;
      case 'general':
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">عام ودفع</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/admin/content" className="hover:text-sky-500">إدارة المحتوى</Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-bold">الأسئلة الشائعة (FAQ)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إدارة الأسئلة الشائعة (FAQ Management)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إضافة، تعديل، ترتيب الأولويات وإخفاء/إظهار الأسئلة الموجهة للعملاء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CMSLivePreview url="/faq" title="معاينة صفحة الأسئلة الشائعة" />
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة سؤال جديد</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث داخل الأسئلة والإجابات..."
            className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
          >
            <option value="all">جميع التصنيفات ({faqs.length})</option>
            <option value="car">خدمات السيارات</option>
            <option value="home">خدمات المنازل</option>
            <option value="booking">الحجز والمواعيد</option>
            <option value="general">الأسئلة العامة والدفع</option>
          </select>
        </div>
      </div>

      {/* Questions List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900 dark:text-white">
            قائمة الأسئلة ({filteredFaqs.length} من إجمالي {faqs.length})
          </span>
          <span className="text-slate-400">استخدم الأسهم لتغيير الترتيب والأولوية</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>لا توجد أسئلة مطابقة للبحث الحالي.</p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const globalIndex = faqs.findIndex((f) => f.id === faq.id);
              return (
                <div
                  key={faq.id}
                  className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Priority / Order badge */}
                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-300">
                        {index + 1}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveUp(globalIndex)}
                          disabled={globalIndex === 0}
                          title="تقديم الأولوية"
                          className="p-0.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 text-slate-500"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveDown(globalIndex)}
                          disabled={globalIndex === faqs.length - 1}
                          title="تأخير الأولوية"
                          className="p-0.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20 text-slate-500"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {categoryBadge(faq.category)}
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {faq.question}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => {
                        toggleFAQVisibility(faq.id);
                        toast.info(faq.visible ? 'تم إخفاء السؤال' : 'تم إظهار السؤال');
                      }}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-colors',
                        faq.visible
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      )}
                    >
                      {faq.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{faq.visible ? 'ظاهر' : 'مخفي'}</span>
                    </button>

                    <button
                      onClick={() => openEditModal(faq)}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                      title="تعديل السؤال"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(faq.id, faq.question)}
                      className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                      title="حذف السؤال"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-500" />
                <span>{editingFaq ? 'تعديل السؤال الشائع' : 'إضافة سؤال شائع جديد'}</span>
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  التصنيف (Category)
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="car">🚗 خدمات السيارات (Car Services)</option>
                  <option value="home">🏠 خدمات المنازل (Home Services)</option>
                  <option value="booking">📅 الحجز والمواعيد (Booking)</option>
                  <option value="general">💳 الأسئلة العامة والدفع (General & Payment)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السؤال بالعربية *
                </label>
                <input
                  type="text"
                  required
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="مثال: كم تستغرق خدمة الغسيل؟"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السؤال بالإنجليزية (اختياري)
                </label>
                <input
                  type="text"
                  value={formQuestionEn}
                  onChange={(e) => setFormQuestionEn(e.target.value)}
                  placeholder="e.g. How long does car wash take?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الإجابة التفصيلية بالعربية *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formAnswer}
                  onChange={(e) => setFormAnswer(e.target.value)}
                  placeholder="مثال: من 45 إلى 60 دقيقة للغسيل الشامل..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الإجابة بالإنجليزية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formAnswerEn}
                  onChange={(e) => setFormAnswerEn(e.target.value)}
                  placeholder="e.g. 45 to 60 minutes for complete wash..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="visibleCheckbox"
                  checked={formVisible}
                  onChange={(e) => setFormVisible(e.target.checked)}
                  className="rounded-sm border-slate-400 cursor-pointer"
                />
                <label htmlFor="visibleCheckbox" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  إظهار السؤال لزوار الموقع فوراً (Visible ✓)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-bold bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-colors"
                >
                  {editingFaq ? 'حفظ التعديلات' : 'إضافة السؤال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
