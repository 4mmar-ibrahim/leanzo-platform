'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  HardHat,
  Plus,
  Phone,
  Star,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  Search,
  UploadCloud,
  ImageIcon,
  X,
  ExternalLink,
  ChevronLeft,
  Filter,
  Check,
  Loader2,
  AlertCircle,
  BarChart3,
  UserCheck,
  Shield,
  Layers,
} from 'lucide-react';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import {
  normalizePhoneInput,
  validateEgyptianPhone,
  isValidEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
} from '@/lib/validation/phoneValidation';
import { useAdminStore } from '@/store/useAdminStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TechnicianExtended } from '@/types';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function AdminTechniciansPage() {
  const technicians = useTechnicianStore((s) => s.technicians);
  const fetchTechnicians = useTechnicianStore((s) => s.fetchTechnicians);
  const addTechnician = useTechnicianStore((s) => s.addTechnician);
  const updateTechnician = useTechnicianStore((s) => s.updateTechnician);
  const deleteTechnician = useTechnicianStore((s) => s.deleteTechnician);
  const toggleAvailability = useTechnicianStore((s) => s.toggleAvailability);
  const toggleActive = useTechnicianStore((s) => s.toggleActive);
  const isLoading = useTechnicianStore((s) => s.isLoading);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Initial load
  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // Modal & Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');

  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'offline'>('all');

  // Delete confirmation modal state
  const [techToDelete, setTechToDelete] = useState<TechnicianExtended | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered technicians
  const filtered = technicians.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      t.specialty.toLowerCase().includes(search.toLowerCase()) ||
      (t.id && t.id.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate summary counts
  const totalTechs = technicians.length;
  const availableCount = technicians.filter((t) => t.status === 'available').length;
  const busyCount = technicians.filter((t) => t.status === 'busy').length;
  const totalCompletedTasks = technicians.reduce((sum, t) => sum + (t.completedOrders || 0), 0);

  // File validation helper
  const validateAndSetFile = (file: File) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      toast.error('صيغة الملف غير مدعومة. يرجى اختيار صورة صالحة (PNG, JPG, WEBP, GIF)');
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`حجم الصورة كبير جداً (${(file.size / (1024 * 1024)).toFixed(2)} MB). الحد الأقصى المسموح به هو 5 ميجابايت.`);
      return false;
    }

    // Clean up previous blob preview if any
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const localUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(localUrl);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openAddModal = () => {
    setEditingTechId(null);
    setName('');
    setPhone('');
    setPhoneError(null);
    setEmail('');
    setSpecialty('خبير تلميع وغسيل سيارات متنقل');
    setBio('');
    setExistingAvatar('');
    handleRemoveImage();
    setModalOpen(true);
  };

  const openEditModal = (t: TechnicianExtended) => {
    setEditingTechId(t.id);
    setName(t.name);
    setPhone(t.phone);
    if (t.phone && !isValidEgyptianPhone(t.phone)) {
      setPhoneError(CANONICAL_PHONE_ERROR_MESSAGE);
    } else {
      setPhoneError(null);
    }
    setEmail(t.email || '');
    setSpecialty(t.specialty);
    setBio(t.bio || '');
    setExistingAvatar(t.avatar || '');
    handleRemoveImage();
    setPreviewUrl(t.avatar || null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('يرجى إدخال اسم الفني بالكامل');
      return;
    }

    const phoneValidation = validateEgyptianPhone(phone);
    if (!phoneValidation.isValid) {
      const errorMsg = phoneValidation.message || CANONICAL_PHONE_ERROR_MESSAGE;
      setPhoneError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setPhoneError(null);

    setIsUploadingImage(true);
    let finalAvatarUrl = existingAvatar || '/uploads/images/default-avatar.png';

    try {
      // 1. Upload new image if selected
      if (selectedFile) {
        toast.info('جاري رفع صورة الفني إلى خادم التخزين...');
        const uploadedMedia = await cleanzoApi.media.upload(selectedFile);
        if (uploadedMedia && uploadedMedia.url) {
          finalAvatarUrl = uploadedMedia.url;
        }
      }

      // 2. Persist to DB & store
      if (editingTechId) {
        await updateTechnician(editingTechId, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          specialty: specialty.trim(),
          bio: bio.trim(),
          avatar: finalAvatarUrl,
        });

        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل بيانات فني',
          module: 'technicians',
          target: name,
        });

        toast.success('تم تحديث بيانات الفني وحفظ الصورة بنجاح');
      } else {
        await addTechnician({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          specialty: specialty.trim(),
          bio: bio.trim(),
          avatar: finalAvatarUrl,
          status: 'available',
          active: true,
          specialtiesList: ['car_wash', 'steam_wash'],
        });

        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'إضافة فني جديد للفريق',
          module: 'technicians',
          target: name,
        });

        toast.success('تمت إضافة الفني وحفظ بياناته في قاعدة البيانات بنجاح');
      }

      setModalOpen(false);
      handleRemoveImage();
    } catch (err: any) {
      console.error('Failed to save technician:', err);
      toast.error(err?.message || 'حدث خطأ أثناء حفظ الفني أو رفع الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const confirmDelete = async () => {
    if (!techToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTechnician(techToDelete.id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حذف فني من الفريق',
        module: 'technicians',
        target: techToDelete.name,
      });
      toast.success(`تم حذف الفني (${techToDelete.name}) بنجاح`);
      setTechToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'فشل حذف الفني. قد يكون لديه مهام نشطة');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              فريق الفنيين والمشرفين الميدانيين
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400">
              {technicians.length} كابتن
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة الجاهزية الميدانية، تعيين الطلبات، والاطلاع على لوحة التحليلات الخاصة بكل فني
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة فني جديد</span>
        </button>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي الطاقم الفني</span>
            <h3 className="text-xl font-black text-[#07345C] dark:text-white mt-0.5">{totalTechs}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] flex items-center justify-center">
            <HardHat className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">متاحون للعمل الآن</span>
            <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{availableCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">في مهام حالية</span>
            <h3 className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{busyCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">إجمالي المهام المنجزة</span>
            <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{totalCompletedTasks} طلب</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الفني، رقم الهاتف، أو التخصص..."
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0866C6] transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#041728] border border-slate-200/60 dark:border-slate-800 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'available', label: 'متاح' },
            { id: 'busy', label: 'في مهمة' },
            { id: 'offline', label: 'غير متصل' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                'px-3 py-1 text-xs font-bold rounded-lg transition-all',
                statusFilter === tab.id
                  ? 'bg-white dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#07345C] dark:hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technicians Grid */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#072540] rounded-3xl border border-slate-200/80 dark:border-[#133B61]">
          <Loader2 className="w-8 h-8 text-[#0866C6] animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات الفنيين والإحصائيات...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#072540] rounded-3xl border border-slate-200/80 dark:border-[#133B61]">
          <HardHat className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-[#07345C] dark:text-white">لا يوجد فنيون يطابقون البحث</h3>
          <p className="text-xs text-slate-400 mt-1">جرب تغيير كلمات البحث أو الفلاتر المحددة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((tech) => (
            <div
              key={tech.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] hover:border-[#0866C6]/40 dark:hover:border-[#0866C6]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Card Top: Photo, Name, Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={tech.avatar || '/uploads/images/default-avatar.png'}
                        alt={tech.name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';
                        }}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shadow-md group-hover:scale-105 transition-transform"
                      />
                      <span
                        className={cn(
                          'w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 ring-2 ring-white dark:ring-slate-900',
                          tech.status === 'available'
                            ? 'bg-emerald-500'
                            : tech.status === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-slate-400'
                        )}
                      />
                    </div>
                    <div>
                      <Link
                        href={`/admin/technicians/${tech.id}`}
                        className="text-sm font-black text-[#07345C] dark:text-white hover:text-[#0866C6] dark:hover:text-[#38BDF8] transition-colors flex items-center gap-1.5"
                      >
                        <span>{tech.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{tech.specialty}</p>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 mt-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{Number(tech.rating || 5).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[10px] font-black shrink-0 border',
                      tech.status === 'available'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : tech.status === 'busy'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    )}
                  >
                    {tech.status === 'available' ? 'متاح للعمل' : tech.status === 'busy' ? 'في مهمة حالياً' : 'غير متصل'}
                  </span>
                </div>

                {/* Orders Statistics Badges */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">مهام مكتملة</span>
                    <span className="font-black text-[#07345C] dark:text-white text-sm">
                      {tech.completedOrders ?? 0} طلب
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">مهام جارية</span>
                    <span className="font-black text-[#0866C6] dark:text-sky-400 text-sm">
                      {tech.assignedOrders ?? 0} طلب
                    </span>
                  </div>
                </div>

                {/* Contact Phone */}
                {isValidEgyptianPhone(tech.phone) ? (
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#041728] border border-slate-100 dark:border-slate-800/80 p-2 rounded-xl">
                    <Phone className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                    <span className="font-mono font-bold" dir="ltr">{tech.phone}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold text-[11px] truncate">رقم غير صالح:</span>
                      <span className="font-mono font-bold line-through text-slate-400 shrink-0" dir="ltr">{tech.phone}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEditModal(tech)}
                      className="text-[10px] font-black underline text-amber-600 hover:text-amber-700 shrink-0"
                    >
                      تصحيح
                    </button>
                  </div>
                )}

                {/* Link to Technician Full Profile Dashboard */}
                <Link
                  href={`/admin/technicians/${tech.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-sky-50 dark:bg-[#0866C6]/20 text-[#0866C6] dark:text-sky-300 hover:bg-[#0866C6] hover:text-white dark:hover:bg-[#0866C6] dark:hover:text-white font-bold text-xs transition-all"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>لوحة أداء وتحليلات الفني</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Bottom Actions Toolbar */}
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={async () => {
                    await toggleAvailability(tech.id);
                    toast.info(`تم تبديل جاهزية الكابتن ${tech.name}`);
                  }}
                  className="text-[11px] font-bold text-slate-500 hover:text-sky-500 transition-colors flex items-center gap-1"
                >
                  <span>تبديل الحالة 🔄</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEditModal(tech)}
                    title="تعديل بيانات الفني"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechToDelete(tech)}
                    title="حذف الفني"
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal with Direct Image File Upload */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#072540] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#133B61] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#133B61]/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center font-bold">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#07345C] dark:text-white">
                    {editingTechId ? 'تعديل بيانات الفني' : 'إضافة فني جديد لطاقم العمل'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    أدخل بيانات الفني وارفع صورته الشخصية مباشرة من الجهاز
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setModalOpen(false);
                  handleRemoveImage();
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Image Upload Zone (Strictly NO URL text inputs) */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  صورة الفني الشخصية <span className="text-[#F0444C]">*</span>
                </label>

                {/* Hidden Real File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  /* Image Preview Card */
                  <div className="relative p-3 rounded-2xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] flex items-center gap-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-20 h-20 aspect-square rounded-2xl object-cover ring-2 ring-[#0866C6]/30 shadow-md shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#07345C] dark:text-white text-xs truncate">
                        {selectedFile ? selectedFile.name : 'الصورة المحفوظة الحالية'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedFile
                          ? `${(selectedFile.size / 1024).toFixed(1)} KB • ${selectedFile.type}`
                          : 'جاهزة للحفظ'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#0866C6]/10 text-[#0866C6] dark:text-sky-400 hover:bg-[#0866C6] hover:text-white transition-colors"
                        >
                          تغيير الصورة
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#F0444C]/10 text-[#F0444C] hover:bg-[#F0444C] hover:text-white transition-colors"
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* File Picker & Drag-and-Drop Area */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
                      isDragging
                        ? 'border-[#0866C6] bg-[#0866C6]/5 scale-[1.01]'
                        : 'border-slate-200 dark:border-[#133B61] hover:border-[#0866C6] hover:bg-slate-50 dark:hover:bg-[#0A2E50]/40'
                    )}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center mx-auto mb-2.5">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="font-black text-[#07345C] dark:text-slate-200 text-xs">
                      اضغط لاختيار صورة الفني من جهازك أو اسحبها هنا
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      صيغ مدعومة: JPG, PNG, WEBP, GIF • المقاس القياسي: 1:1 (مربع)
                    </p>
                  </div>
                )}
              </div>

              {/* Name input */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  اسم الفني بالكامل <span className="text-[#F0444C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: كابتن أحمد فؤاد"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white font-bold focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>

              {/* Phone and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    رقم الهاتف <span className="text-[#F0444C]">*</span>
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    required
                    value={phone}
                    onChange={(e) => {
                      const clean = normalizePhoneInput(e.target.value);
                      setPhone(clean);
                      if (phoneError) {
                        const val = validateEgyptianPhone(clean);
                        if (val.isValid) setPhoneError(null);
                      }
                    }}
                    placeholder="010XXXXXXXX"
                    style={{ direction: 'ltr', textAlign: 'left', unicodeBidi: 'isolate' }}
                    className={cn(
                      'w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border text-[#07345C] dark:text-white font-mono font-bold text-left [direction:ltr] [unicode-bidi:isolate] focus:outline-hidden transition-colors',
                      phoneError
                        ? 'border-rose-500 focus:border-rose-500 bg-rose-50/20'
                        : 'border-slate-200 dark:border-[#133B61] focus:border-[#0866C6]'
                    )}
                  />
                  {phoneError ? (
                    <p className="text-[11px] text-[#F0444C] font-bold mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{phoneError}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      11 رقمًا يبدأ بـ 010 أو 011 أو 012 أو 015
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                    البريد الإلكتروني (اختياري)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="technician@cleanzo.eg"
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                  />
                </div>
              </div>

              {/* Specialty input */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  التخصص والمهارة
                </label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="خبير تلميع وغسيل بخار سيارات / تنظيف سجاد ومفروشات"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>

              {/* Bio & Experience */}
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1">
                  نبذة تعريفية وملاحظات الكفاءة
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="خبرة 5 سنوات في التلميع الساطع والنانو سيراميك..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white focus:outline-hidden focus:border-[#0866C6] resize-none transition-colors"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-[#133B61]/80">
                <button
                  type="button"
                  disabled={isUploadingImage}
                  onClick={() => {
                    setModalOpen(false);
                    handleRemoveImage();
                  }}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] font-bold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isUploadingImage}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-black shadow-md disabled:opacity-60 transition-all cursor-pointer"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الرفع والحفظ...</span>
                    </>
                  ) : (
                    <span>{editingTechId ? 'حفظ التعديلات' : 'إضافة الفني'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {techToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#072540] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-[#133B61] p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F0444C]/10 text-[#F0444C] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-[#07345C] dark:text-white">
                تأكيد حذف الفني
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                هل أنت متأكد من رغبتك في حذف الكابتن{' '}
                <span className="font-bold text-[#07345C] dark:text-white">({techToDelete.name})</span> من قائمة العمل؟
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setTechToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[#F0444C] hover:bg-[#D93840] text-white shadow-md shadow-[#F0444C]/20 disabled:opacity-60 transition-all cursor-pointer"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>نعم، حذف الفني</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
