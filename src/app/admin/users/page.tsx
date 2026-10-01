'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Shield,
  Crown,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Lock,
  Search,
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  Check,
  X,
  History,
  AlertTriangle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { useTechnicianStore } from '@/store/useTechnicianStore';
import { AdminUser } from '@/types';
import {
  PERMISSION_MODULES,
  ALL_PERMISSION_TOKENS,
  TECHNICIAN_PERMISSION_GROUPS,
  ALL_TECHNICIAN_PERMISSION_TOKENS,
  hasPermission,
} from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const {
    currentAdmin,
    adminUsers,
    fetchUsers,
    updateOwnerProfile,
    changeOwnerPassword,
    changeUserPassword,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    isLoading,
  } = useAdminStore();

  const isOwner = currentAdmin?.role === 'owner' || currentAdmin?.role === 'super_admin';
  const technicians = useTechnicianStore((s) => s.technicians);
  const fetchTechnicians = useTechnicianStore((s) => s.fetchTechnicians);

  // Fetch live users and technicians on mount
  useEffect(() => {
    fetchUsers();
    fetchTechnicians();
  }, [fetchUsers, fetchTechnicians]);

  // Find single Platform Owner
  const ownerUser = useMemo(() => {
    return adminUsers.find((u) => u.role === 'owner') || currentAdmin;
  }, [adminUsers, currentAdmin]);

  // Sub-admins and staff users (all non-owner accounts)
  const staffUsers = useMemo(() => {
    return adminUsers.filter((u) => u.role !== 'owner' && u.id !== ownerUser?.id);
  }, [adminUsers, ownerUser]);

  // Search & Filter for Staff
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredStaffUsers = useMemo(() => {
    return staffUsers.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.includes(q));

      const matchStatus = statusFilter === 'all' || u.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [staffUsers, searchQuery, statusFilter]);

  // --------------------------------------------------------------------------
  // SECTION A: OWNER PROFILE & PASSWORD MODALS / FORMS
  // --------------------------------------------------------------------------
  const [editOwnerOpen, setEditOwnerOpen] = useState(false);
  const [ownerProfileForm, setOwnerProfileForm] = useState({
    name: ownerUser?.name || 'م. أحمد الشريف',
    email: ownerUser?.email || 'owner@cleanzo.app',
    phone: ownerUser?.phone || '01000000001',
  });

  useEffect(() => {
    if (ownerUser) {
      setOwnerProfileForm({
        name: ownerUser.name,
        email: ownerUser.email,
        phone: ownerUser.phone || '',
      });
    }
  }, [ownerUser]);

  const [ownerPasswordForm, setOwnerPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showOwnerPass, setShowOwnerPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [ownerPassLoading, setOwnerPassLoading] = useState(false);

  const handleUpdateOwnerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateOwnerProfile(ownerProfileForm);
    if (success) {
      toast.success('تم تحديث بيانات مالك المنصة بنجاح');
      setEditOwnerOpen(false);
      fetchUsers();
    } else {
      toast.error('فشل تحديث بيانات مالك المنصة');
    }
  };

  const handleChangeOwnerPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswordForm.newPassword !== ownerPasswordForm.confirmPassword) {
      toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    if (ownerPasswordForm.newPassword.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
      return;
    }

    setOwnerPassLoading(true);
    const result = await changeOwnerPassword(ownerPasswordForm);
    setOwnerPassLoading(false);

    if (result.success) {
      toast.success(result.message);
      setOwnerPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      toast.error(result.message);
    }
  };

  // --------------------------------------------------------------------------
  // SECTION B: USER CREATION & EDIT MODAL (WITH GRANULAR PERMISSIONS MATRIX)
  // --------------------------------------------------------------------------
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userModalLoading, setUserModalLoading] = useState(false);

  const [userFormData, setUserFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'manager',
    userType: 'admin' as 'admin' | 'technician',
    technicianId: '',
    status: 'active' as 'active' | 'inactive',
    mustChangePasswordNextLogin: false,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const openCreateUserModal = () => {
    setEditingUserId(null);
    setUserFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'manager',
      userType: 'admin',
      technicianId: '',
      status: 'active',
      mustChangePasswordNextLogin: false,
    });
    // Default initial permissions for new manager: dashboard + customers view + orders view
    setSelectedPermissions(['dashboard.view', 'customers.view', 'orders.view']);
    setUserModalOpen(true);
  };

  const openEditUserModal = (user: AdminUser) => {
    setEditingUserId(user.id);
    const isTechUser = user.userType === 'technician' || user.role === 'technician';
    setUserFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role: isTechUser ? 'technician' : user.role === 'owner' ? 'manager' : user.role,
      userType: isTechUser ? 'technician' : 'admin',
      technicianId: user.technicianId || '',
      status: user.status,
      mustChangePasswordNextLogin: user.mustChangePasswordNextLogin || false,
    });

    // Populate selected permissions from user's granularPermissions or legacy permissions
    let perms: string[] = [];
    if (Array.isArray(user.granularPermissions) && user.granularPermissions.length > 0) {
      perms = [...user.granularPermissions];
    } else if (user.permissions) {
      Object.entries(user.permissions).forEach(([mod, level]) => {
        if (level === 'view') perms.push(`${mod}.view`);
        if (level === 'edit') {
          perms.push(`${mod}.view`, `${mod}.create`, `${mod}.edit`, `${mod}.delete`, `${mod}.status`);
        }
      });
    }
    setSelectedPermissions(perms);
    setUserModalOpen(true);
  };

  const togglePermission = (token: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(token) ? prev.filter((p) => p !== token) : [...prev, token]
    );
  };

  const toggleModulePermissions = (module: typeof PERMISSION_MODULES[0]) => {
    const moduleTokens = module.actions.map((a) => a.token);
    const hasAll = moduleTokens.every((t) => selectedPermissions.includes(t));

    if (hasAll) {
      setSelectedPermissions((prev) => prev.filter((t) => !moduleTokens.includes(t)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...moduleTokens])));
    }
  };

  const selectAllPermissions = () => {
    setSelectedPermissions([...ALL_PERMISSION_TOKENS]);
  };

  const deselectAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const selectAllTechPermissions = () => {
    setSelectedPermissions([...ALL_TECHNICIAN_PERMISSION_TOKENS]);
  };

  const deselectAllTechPermissions = () => {
    setSelectedPermissions([]);
  };

  const toggleTechGroupPermissions = (group: (typeof TECHNICIAN_PERMISSION_GROUPS)[0]) => {
    const groupTokens = group.permissions.map((p) => p.token);
    const hasAll = groupTokens.every((t) => selectedPermissions.includes(t));

    if (hasAll) {
      setSelectedPermissions((prev) => prev.filter((t) => !groupTokens.includes(t)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupTokens])));
    }
  };

  const handleSelectTechnician = (techId: string) => {
    const tech = technicians.find((t) => t.id === techId);
    if (!tech) return;
    setUserFormData((prev) => ({
      ...prev,
      technicianId: techId,
      name: tech.name,
      username: prev.username || tech.name.trim().toLowerCase().replace(/\s+/g, '.'),
      phone: tech.phone || prev.phone,
      email: prev.email || `${tech.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@cleanzo.local`,
    }));
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userFormData.name || !userFormData.email) {
      toast.error('يرجى ملء جميع الحقول الإلزامية');
      return;
    }

    if (userFormData.userType === 'technician') {
      if (!userFormData.technicianId) {
        toast.error('يرجى اختيار الفني المسجل من القائمة لربط الحساب به');
        return;
      }
      // Single active account per technician check
      const existingActiveUser = adminUsers.find(
        (u) =>
          u.technicianId === userFormData.technicianId &&
          u.status === 'active' &&
          u.id !== editingUserId
      );
      if (existingActiveUser) {
        toast.error(
          `هذا الفني مرتبط بالفعل بحساب مستخدم نشط (@${existingActiveUser.username}). لا يمكن إنشاء أكثر من حساب نشط لنفس الفني.`
        );
        return;
      }
    }

    if (!editingUserId) {
      if (!userFormData.password) {
        toast.error('يرجى إدخال كلمة المرور للمستخدم الجديد');
        return;
      }
      if (userFormData.password !== userFormData.confirmPassword) {
        toast.error('كلمة المرور وتأكيدها غير متطابقين');
        return;
      }
      if (userFormData.password.length < 6) {
        toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
        return;
      }
    }

    setUserModalLoading(true);

    try {
      if (editingUserId) {
        const updates: any = {
          name: userFormData.name,
          email: userFormData.email,
          phone: userFormData.phone,
          role: userFormData.userType === 'technician' ? 'technician' : userFormData.role,
          userType: userFormData.userType,
          technicianId: userFormData.userType === 'technician' ? userFormData.technicianId : undefined,
          status: userFormData.status,
          granularPermissions: selectedPermissions,
          mustChangePasswordNextLogin: userFormData.mustChangePasswordNextLogin,
        };

        if (userFormData.password) {
          if (userFormData.password !== userFormData.confirmPassword) {
            toast.error('كلمة المرور وتأكيدها غير متطابقين');
            setUserModalLoading(false);
            return;
          }
          updates.password = userFormData.password;
        }

        const success = await updateAdminUser(editingUserId, updates);
        setUserModalLoading(false);
        if (success) {
          toast.success('تم تحديث بيانات وصلاحيات المستخدم بنجاح');
          setUserModalOpen(false);
          fetchUsers();
        } else {
          toast.error('فشل تحديث بيانات المستخدم');
        }
      } else {
        const created = await createAdminUser({
          name: userFormData.name,
          username: userFormData.username || userFormData.email.split('@')[0],
          email: userFormData.email,
          phone: userFormData.phone,
          password: userFormData.password,
          role: userFormData.userType === 'technician' ? 'technician' : userFormData.role,
          userType: userFormData.userType,
          technicianId: userFormData.userType === 'technician' ? userFormData.technicianId : undefined,
          granularPermissions: selectedPermissions,
          mustChangePasswordNextLogin: userFormData.mustChangePasswordNextLogin,
        });

        setUserModalLoading(false);
        if (created) {
          toast.success(`تم إنشاء حساب المستخدم (${created.name}) بنجاح`);
          setUserModalOpen(false);
          fetchUsers();
        } else {
          toast.error('فشل إنشاء حساب المستخدم (تأكد من عدم تكرار اسم المستخدم أو البريد)');
        }
      }
    } catch (err: any) {
      setUserModalLoading(false);
      toast.error(err?.message || 'حدث خطأ أثناء حفظ بيانات المستخدم');
    }
  };

  // --------------------------------------------------------------------------
  // SECTION B: CHANGE USER PASSWORD MODAL
  // --------------------------------------------------------------------------
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [targetUserForPass, setTargetUserForPass] = useState<AdminUser | null>(null);
  const [userPasswordForm, setUserPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
    mustChangePasswordNextLogin: false,
  });
  const [showUserPass, setShowUserPass] = useState(false);
  const [changeUserPassLoading, setChangeUserPassLoading] = useState(false);

  const openChangePasswordModal = (user: AdminUser) => {
    setTargetUserForPass(user);
    setUserPasswordForm({
      newPassword: '',
      confirmPassword: '',
      mustChangePasswordNextLogin: true,
    });
    setPassModalOpen(true);
  };

  const handleChangeUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserForPass) return;

    if (userPasswordForm.newPassword !== userPasswordForm.confirmPassword) {
      toast.error('كلمة المرور وتأكيدها غير متطابقين');
      return;
    }
    if (userPasswordForm.newPassword.length < 6) {
      toast.error('كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام');
      return;
    }

    setChangeUserPassLoading(true);
    const result = await changeUserPassword(targetUserForPass.id, userPasswordForm);
    setChangeUserPassLoading(false);

    if (result.success) {
      toast.success(result.message);
      setPassModalOpen(false);
      fetchUsers();
    } else {
      toast.error(result.message);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const success = await updateAdminUser(user.id, { status: nextStatus });
    if (success) {
      toast.success(`تم ${nextStatus === 'active' ? 'تفعيل' : 'تعطيل'} حساب (${user.name}) بنجاح`);
      fetchUsers();
    }
  };

  // Delete user
  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`هل أنت متأكد من حذف حساب المسؤول (${user.name}) نهائياً؟`)) return;
    const success = await deleteAdminUser(user.id);
    if (success) {
      toast.success(`تم حذف حساب (${user.name}) بنجاح`);
      fetchUsers();
    } else {
      toast.error('فشل حذف حساب المستخدم');
    }
  };

  return (
    <div className="space-y-8 pb-16 text-slate-900 dark:text-slate-100" dir="rtl">
      {/* ========================================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <span>المسؤولون والمستخدمون</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة بيانات مالك المنصة والمستخدمين والصلاحيات الدقيقة (RBAC / PBAC)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title="تحديث البيانات"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
          {isOwner && (
            <button
              onClick={openCreateUserModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] text-xs font-black shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* A) بيانات المسؤول الرئيسي (PLATFORM OWNER DATA) */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              أ) بيانات المسؤول الرئيسي (مالك المنصة)
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-black border border-amber-500/20">
              حساب المالك الوحيد (Super Admin)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Owner Profile Card */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white dark:bg-[#082845] border-2 border-[#0866C6]/30 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={ownerUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'}
                      alt={ownerUser?.name || 'Owner'}
                      className="w-16 h-16 rounded-2xl object-cover ring-4 ring-[#0866C6]/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        {ownerUser?.name || 'م. أحمد الشريف'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                        نشط دائم (Active)
                      </span>
                    </div>
                    <p className="text-xs text-[#0866C6] font-bold mt-0.5">
                      @{ownerUser?.username || 'ahmed.owner'} — مالك المنصة ومسؤول النظام
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => setEditOwnerOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#0866C6] text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>تعديل البيانات</span>
                  </button>
                )}
              </div>

              {/* Owner Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Mail className="w-3.5 h-3.5 text-[#0866C6]" />
                    <span>البريد الإلكتروني:</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {ownerUser?.email || 'owner@cleanzo.app'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Phone className="w-3.5 h-3.5 text-[#0866C6]" />
                    <span>رقم الهاتف:</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {ownerUser?.phone || '01000000001'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0866C6]" />
                    <span>تاريخ إنشاء الحساب:</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {ownerUser?.createdAt ? new Date(ownerUser.createdAt).toLocaleDateString('ar-EG') : 'حساب مؤسس'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-xl bg-sky-50 dark:bg-slate-900/80 border border-sky-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                صلاحيات المالك: <strong className="text-[#0866C6] font-black">كاملة وغير مقيدة (Full Access)</strong> لجميع الأقسام الحالية والمستقبلية.
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                آخر دخول: {ownerUser?.lastLogin ? new Date(ownerUser.lastLogin).toLocaleDateString('ar-EG') : 'اليوم'}
              </span>
            </div>
          </div>

          {/* Change Platform Owner Password Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#082845] border-2 border-slate-200/80 dark:border-slate-800 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تغيير كلمة مرور مالك المنصة
                  </h3>
                  <p className="text-[11px] text-slate-400">تحقق كامل وتشفير bcrypt فوري</p>
                </div>
              </div>

              {isOwner ? (
                <form onSubmit={handleChangeOwnerPassword} className="space-y-3 mt-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      كلمة المرور الحالية:
                    </label>
                    <div className="relative">
                      <input
                        type={showOwnerPass.current ? 'text' : 'password'}
                        required
                        value={ownerPasswordForm.currentPassword}
                        onChange={(e) =>
                          setOwnerPasswordForm({ ...ownerPasswordForm, currentPassword: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowOwnerPass((p) => ({ ...p, current: !p.current }))
                        }
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showOwnerPass.current ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      كلمة المرور الجديدة:
                    </label>
                    <div className="relative">
                      <input
                        type={showOwnerPass.new ? 'text' : 'password'}
                        required
                        value={ownerPasswordForm.newPassword}
                        onChange={(e) =>
                          setOwnerPasswordForm({ ...ownerPasswordForm, newPassword: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowOwnerPass((p) => ({ ...p, new: !p.new }))
                        }
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showOwnerPass.new ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      تأكيد كلمة المرور الجديدة:
                    </label>
                    <div className="relative">
                      <input
                        type={showOwnerPass.confirm ? 'text' : 'password'}
                        required
                        value={ownerPasswordForm.confirmPassword}
                        onChange={(e) =>
                          setOwnerPasswordForm({ ...ownerPasswordForm, confirmPassword: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowOwnerPass((p) => ({ ...p, confirm: !p.confirm }))
                        }
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showOwnerPass.confirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={ownerPassLoading}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {ownerPassLoading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>تحديث كلمة مرور المالك</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-slate-400 mt-6 leading-relaxed">
                  هذا النموذج مخصص لمالك المنصة فقط لتغيير كلمة مروره الشخصية.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* B) المستخدمون والصلاحيات (USERS & PERMISSIONS) */}
      {/* ========================================================================= */}
      <section className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#0866C6]" />
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              ب) المستخدمون والصلاحيات (Staff & Sub-Admins)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-[#0866C6] text-[11px] font-black border border-[#0866C6]/20">
              {filteredStaffUsers.length} مستخدم
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-56">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المستخدمين..."
                className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="all">كل الحالات</option>
              <option value="active">النشط فقط</option>
              <option value="inactive">المعطل فقط</option>
            </select>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="rounded-3xl bg-white dark:bg-[#082845] border-2 border-slate-200/80 dark:border-slate-800 shadow-md overflow-hidden">
          {filteredStaffUsers.length === 0 ? (
            <div className="py-14 text-center">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                لا يوجد مستخدمون مطابقون
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك الضغط على زر &quot;إضافة مستخدم جديد&quot; لإنشاء حساب وتعيين الصلاحيات.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                    <th className="p-4">المستخدم</th>
                    <th className="p-4">اسم الدخول / البريد</th>
                    <th className="p-4">الهاتف</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">الصلاحيات المفعلة</th>
                    <th className="p-4">آخر دخول</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredStaffUsers.map((user) => {
                    const activePermCount = Array.isArray(user.granularPermissions)
                      ? user.granularPermissions.length
                      : Object.values(user.permissions || {}).filter((p) => p !== 'hidden').length;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-sky-50/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={user.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80'}
                              alt={user.name}
                              className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {user.name}
                                </span>
                                {user.userType === 'technician' || user.role === 'technician' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/20">
                                    <Wrench className="w-2.5 h-2.5" />
                                    <span>مستخدم فني</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-[#0866C6] text-[10px] font-bold border border-[#0866C6]/20">
                                    <Shield className="w-2.5 h-2.5" />
                                    <span>مشرف نظام</span>
                                  </span>
                                )}
                              </div>
                              {user.userType === 'technician' || user.role === 'technician' ? (
                                <span className="text-[11px] text-[#0866C6] font-semibold block mt-0.5">
                                  الفني المسند: {user.technicianName || user.name}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  دور: {user.role}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-mono text-xs text-[#0866C6] block font-bold">
                            @{user.username}
                          </span>
                          <span className="text-[11px] text-slate-400">{user.email}</span>
                        </td>

                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono">
                          {user.phone || '—'}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={cn(
                              'px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer',
                              user.status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-rose-500/10 hover:text-rose-500'
                                : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-emerald-500/10 hover:text-emerald-500'
                            )}
                            title="انقر لتغيير حالة الحساب"
                          >
                            {user.status === 'active' ? '● نشط' : '○ معطل'}
                          </button>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-slate-800 text-[#0866C6] dark:text-[#3894ec] font-bold text-[11px] hover:bg-sky-100 transition-colors"
                          >
                            <Shield className="w-3 h-3" />
                            <span>{activePermCount} صلاحية</span>
                          </button>
                        </td>

                        <td className="p-4 text-slate-400 text-[11px]">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-EG') : 'لم يدخل بعد'}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Change Password */}
                            <button
                              onClick={() => openChangePasswordModal(user)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="تغيير كلمة المرور"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit User & Permissions */}
                            <button
                              onClick={() => openEditUserModal(user)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[#0866C6] hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="تعديل المستخدم والصلاحيات"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Activity Logs */}
                            <Link
                              href={`/admin/activity-log?search=${encodeURIComponent(user.username)}`}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="سجل نشاطات المستخدم"
                            >
                              <History className="w-3.5 h-3.5" />
                            </Link>

                            {/* Delete User */}
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="حذف المستخدم"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT OWNER PROFILE MODAL */}
      {/* ========================================================================= */}
      {editOwnerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>تعديل بيانات مالك المنصة</span>
              </h3>
              <button
                onClick={() => setEditOwnerOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateOwnerProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل:
                </label>
                <input
                  type="text"
                  required
                  value={ownerProfileForm.name}
                  onChange={(e) => setOwnerProfileForm({ ...ownerProfileForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  البريد الإلكتروني:
                </label>
                <input
                  type="email"
                  required
                  value={ownerProfileForm.email}
                  onChange={(e) => setOwnerProfileForm({ ...ownerProfileForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهاتف:
                </label>
                <input
                  type="text"
                  value={ownerProfileForm.phone}
                  onChange={(e) => setOwnerProfileForm({ ...ownerProfileForm, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOwnerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0866C6] hover:bg-[#0866C6]/90 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: USER CREATION & EDIT WITH FULL PERMISSIONS MATRIX */}
      {/* ========================================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* STICKY HEADER - ALWAYS PINNED AT TOP */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border',
                    userFormData.userType === 'technician'
                      ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border-amber-200 dark:border-amber-900/60'
                      : 'bg-sky-50 dark:bg-sky-950/50 text-[#0866C6] border-sky-100 dark:border-sky-900/60'
                  )}
                >
                  {userFormData.userType === 'technician' ? (
                    <Wrench className="w-4.5 h-4.5" />
                  ) : (
                    <UserCheck className="w-4.5 h-4.5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                    {editingUserId
                      ? userFormData.userType === 'technician'
                        ? 'تعديل بيانات وصلاحيات المستخدم الفني'
                        : 'تعديل بيانات وصلاحيات مشرف النظام'
                      : userFormData.userType === 'technician'
                      ? 'إضافة مستخدم فني جديد'
                      : 'إضافة مستخدم إداري جديد'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {userFormData.userType === 'technician'
                      ? 'ربط الحساب بفني مسجل مسبقاً ومصفوفة صلاحيات الطلبات المسندة فقط'
                      : 'بيانات الحساب ومصفوفة الصلاحيات المخصصة للنظام'}
                  </p>
                </div>
              </div>

              {/* PROMINENT CLOSE / EXIT BUTTON */}
              <button
                type="button"
                onClick={() => setUserModalOpen(false)}
                aria-label="إغلاق النافذة"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 transition-all font-bold text-xs cursor-pointer shadow-xs"
              >
                <span>خروج</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* FORM BODY - SCROLLABLE CONTENT */}
            <form onSubmit={handleSaveUser} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-4">
                {/* 0. Creation Type Switcher (Only when creating new user) */}
                {!editingUserId && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => {
                        setUserFormData((prev) => ({
                          ...prev,
                          userType: 'admin',
                          role: 'manager',
                          technicianId: '',
                        }));
                        setSelectedPermissions(['dashboard.view', 'customers.view', 'orders.view']);
                      }}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer text-right border',
                        userFormData.userType === 'admin'
                          ? 'bg-white dark:bg-slate-900 text-[#0866C6] border-[#0866C6]/30 shadow-xs'
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">الخيار (أ): مستخدم بالنظام الحالي</span>
                        <span className="text-[10px] text-slate-400 font-normal">مشرف نظام أو موظف إداري بصلاحيات كاملة أو مخصصة</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserFormData((prev) => ({
                          ...prev,
                          userType: 'technician',
                          role: 'technician',
                        }));
                        setSelectedPermissions([
                          'orders.view_assigned',
                          'orders.view_details',
                          'orders.view_customer',
                          'orders.view_customer_phone',
                          'orders.view_address',
                          'orders.view_service',
                          'orders.view_notes',
                          'orders.receive',
                          'orders.start_execution',
                          'orders.mark_finished',
                        ]);
                      }}
                      className={cn(
                        'py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 cursor-pointer text-right border',
                        userFormData.userType === 'technician'
                          ? 'bg-[#0866C6] text-white border-[#0866C6] shadow-xs'
                          : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          userFormData.userType === 'technician'
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
                        )}
                      >
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold">الخيار (ب): مستخدم فني</span>
                        <span
                          className={cn(
                            'text-[10px] font-normal',
                            userFormData.userType === 'technician' ? 'text-white/80' : 'text-slate-400'
                          )}
                        >
                          ربط بفني مسجل لإدارة الطلبات المسندة إليه فقط
                        </span>
                      </div>
                    </button>
                  </div>
                )}

                {/* 1. Technician Selector (Option B) */}
                {userFormData.userType === 'technician' && (
                  <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black text-amber-950 dark:text-amber-200">
                        اختيار الفني المعتمد: <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                        يتم الربط بالمعرف الثابت (ID) في قاعدة البيانات
                      </span>
                    </div>

                    <select
                      required
                      value={userFormData.technicianId}
                      onChange={(e) => handleSelectTechnician(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] font-semibold"
                    >
                      <option value="">-- اختر الفني المسجل مسبقاً --</option>
                      {technicians.map((t) => {
                        const isLinkedActive = adminUsers.some(
                          (u) => u.technicianId === t.id && u.status === 'active' && u.id !== editingUserId
                        );
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} {t.active === false ? '(غير مفعّل)' : '(نشط)'}{' '}
                            {isLinkedActive ? '⚠️ [مرتبط بحساب نشط]' : ''}
                          </option>
                        );
                      })}
                    </select>

                    {/* Notice & Warning Box */}
                    {userFormData.technicianId &&
                      (() => {
                        const activeAccount = adminUsers.find(
                          (u) =>
                            u.technicianId === userFormData.technicianId &&
                            u.status === 'active' &&
                            u.id !== editingUserId
                        );
                        const selectedTechObj = technicians.find((t) => t.id === userFormData.technicianId);
                        return (
                          <div className="space-y-1.5 pt-1">
                            {activeAccount && (
                              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  <strong>تحذير:</strong> الفني مرتبط بالفعل بحساب مستخدم نشط (@
                                  {activeAccount.username}). يمنع النظام إنشاء أكثر من حساب نشط لنفس الفني.
                                </span>
                              </div>
                            )}
                            {selectedTechObj && selectedTechObj.active === false && (
                              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-[11px] flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  <strong>ملاحظة:</strong> سجل هذا الفني معطل حالياً. لن يتمكن حسابه من الدخول أو
                                  إدارة الطلبات حتى يتم تفعيل سجله في قسم الفنيين.
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                  </div>
                )}

                {/* 2. Basic Account Info (Compact Grid) */}
                <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        الاسم الكامل: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={userFormData.name}
                        onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                        placeholder="مثال: عمار فني صيانة"
                        className="w-full h-8.5 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        اسم المستخدم (Username): <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        disabled={Boolean(editingUserId)}
                        value={userFormData.username}
                        onChange={(e) =>
                          setUserFormData({
                            ...userFormData,
                            username: e.target.value.toLowerCase().replace(/\s+/g, '.'),
                          })
                        }
                        placeholder="cleanzo.admin"
                        className="w-full h-8.5 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] disabled:opacity-60 font-mono transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        البريد الإلكتروني: <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        placeholder="tech@cleanzo.app"
                        className="w-full h-8.5 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        رقم الهاتف:
                      </label>
                      <input
                        type="text"
                        value={userFormData.phone}
                        onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                        placeholder="010xxxxxxxx"
                        className="w-full h-8.5 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        حالة الحساب:
                      </label>
                      <select
                        value={userFormData.status}
                        onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value as any })}
                        className="w-full h-8.5 px-2.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                      >
                        <option value="active">نشط (Active)</option>
                        <option value="inactive">معطل (Inactive)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-2 sm:pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 select-none">
                        <input
                          type="checkbox"
                          checked={userFormData.mustChangePasswordNextLogin}
                          onChange={(e) =>
                            setUserFormData({ ...userFormData, mustChangePasswordNextLogin: e.target.checked })
                          }
                          className="w-4 h-4 rounded-sm text-[#0866C6] border-slate-300 dark:border-slate-600 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-[11px]">إجبار تغيير كلمة المرور عند أول دخول</span>
                      </label>
                    </div>

                    {!editingUserId && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            كلمة المرور الأولية: <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            value={userFormData.password}
                            onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full h-8.5 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            تأكيد كلمة المرور: <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="password"
                            required
                            value={userFormData.confirmPassword}
                            onChange={(e) => setUserFormData({ ...userFormData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            className="w-full h-8.5 px-3 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-colors"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. PERMISSIONS MATRIX SECTION */}
                {userFormData.userType === 'technician' ? (
                  /* TECHNICIAN GRANULAR ORDERS PERMISSION MATRIX */
                  <div className="pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-500" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          مصفوفة صلاحيات الفني الدقيقة (Technician Order Permissions)
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 border border-amber-200 dark:border-amber-800">
                          {selectedPermissions.filter((p) => ALL_TECHNICIAN_PERMISSION_TOKENS.includes(p)).length} /{' '}
                          {ALL_TECHNICIAN_PERMISSION_TOKENS.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllTechPermissions}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer"
                        >
                          تحديد كل صلاحيات الفني
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllTechPermissions}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          إلغاء التحديد
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-[11px] text-sky-800 dark:text-sky-300 mb-3">
                      ℹ️ <strong>ملاحظة أمان:</strong> مستخدم الفني معزول حصرياً على مستوى قاعدة البيانات ولا يستطيع
                      الوصول إلا للطلبات المسندة إليه فقط. اختر الإجراءات المسموحة له أدناه بدقة.
                    </div>

                    {/* Technician Permission Groups */}
                    <div className="space-y-3">
                      {TECHNICIAN_PERMISSION_GROUPS.map((group) => {
                        const groupTokens = group.permissions.map((p) => p.token);
                        const selectedInGroup = groupTokens.filter((t) => selectedPermissions.includes(t));
                        const isAllGroupSelected = selectedInGroup.length === groupTokens.length;

                        return (
                          <div
                            key={group.id}
                            className={cn(
                              'p-3 rounded-xl border transition-all',
                              selectedInGroup.length > 0
                                ? 'bg-amber-50/20 dark:bg-slate-800/50 border-amber-300/40 dark:border-amber-900/50 shadow-xs'
                                : 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    isAllGroupSelected
                                      ? 'bg-emerald-500'
                                      : selectedInGroup.length > 0
                                      ? 'bg-amber-500'
                                      : 'bg-slate-300 dark:bg-slate-700'
                                  )}
                                />
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {group.titleAr}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({selectedInGroup.length}/{groupTokens.length})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleTechGroupPermissions(group)}
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer',
                                  isAllGroupSelected
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-500 hover:text-white'
                                )}
                              >
                                {isAllGroupSelected ? 'إلغاء القسم' : 'تحديد القسم'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                              {group.permissions.map((perm) => {
                                const isChecked = selectedPermissions.includes(perm.token);
                                return (
                                  <label
                                    key={perm.token}
                                    title={perm.token}
                                    className={cn(
                                      'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-all',
                                      isChecked
                                        ? 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 font-bold shadow-2xs'
                                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(perm.token)}
                                      className="w-3.5 h-3.5 rounded-xs text-amber-500 border-slate-300 dark:border-slate-600 focus:ring-0 cursor-pointer shrink-0"
                                    />
                                    <span className="truncate">{perm.labelAr}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* SYSTEM ADMIN GRANULAR PERMISSION MATRIX (Option A) */
                  <div className="pt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[#0866C6]" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                          مصفوفة الصلاحيات الدقيقة (Granular Permissions)
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-[#0866C6] border border-sky-200 dark:border-sky-800">
                          {selectedPermissions.length} / {ALL_PERMISSION_TOKENS.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={selectAllPermissions}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-slate-800 text-[#0866C6] font-bold text-[11px] hover:bg-sky-100 dark:hover:bg-slate-700 transition-colors border border-sky-100 dark:border-slate-700 cursor-pointer"
                        >
                          تحديد الكل
                        </button>
                        <button
                          type="button"
                          onClick={deselectAllPermissions}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                        >
                          إلغاء تحديد الكل
                        </button>
                      </div>
                    </div>

                    {/* Modules Grid - Compact 2-column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {PERMISSION_MODULES.map((module) => {
                        const moduleTokens = module.actions.map((a) => a.token);
                        const selectedInModule = moduleTokens.filter((t) => selectedPermissions.includes(t));
                        const isAllModuleSelected = selectedInModule.length === moduleTokens.length;

                        return (
                          <div
                            key={module.id}
                            className={cn(
                              'p-2.5 sm:p-3 rounded-xl border transition-all',
                              selectedInModule.length > 0
                                ? 'bg-sky-50/20 dark:bg-slate-800/50 border-[#0866C6]/30 shadow-xs'
                                : 'bg-slate-50/40 dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800'
                            )}
                          >
                            {/* Module Header */}
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'w-2 h-2 rounded-full',
                                    isAllModuleSelected
                                      ? 'bg-emerald-500'
                                      : selectedInModule.length > 0
                                      ? 'bg-[#0866C6]'
                                      : 'bg-slate-300 dark:bg-slate-700'
                                  )}
                                />
                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                  {module.nameAr}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({selectedInModule.length}/{moduleTokens.length})
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleModulePermissions(module)}
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer',
                                  isAllModuleSelected
                                    ? 'bg-[#0866C6] text-white'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#0866C6] hover:text-white'
                                )}
                              >
                                {isAllModuleSelected ? 'إلغاء القسم' : 'تحديد القسم'}
                              </button>
                            </div>

                            {/* Module Actions: 2-column internal grid for compactness */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {module.actions.map((action) => {
                                const isChecked = selectedPermissions.includes(action.token);
                                return (
                                  <label
                                    key={action.token}
                                    title={action.token}
                                    className={cn(
                                      'flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] cursor-pointer select-none transition-all',
                                      isChecked
                                        ? 'bg-white dark:bg-slate-800 border-sky-300 dark:border-sky-800 text-sky-950 dark:text-sky-200 font-semibold shadow-2xs'
                                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(action.token)}
                                      className="w-3.5 h-3.5 rounded-xs text-[#0866C6] border-slate-300 dark:border-slate-600 focus:ring-0 cursor-pointer shrink-0"
                                    />
                                    <span className="truncate">{action.nameAr}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* STICKY FOOTER - ALWAYS PINNED AT BOTTOM */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between shrink-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {userFormData.userType === 'technician' ? (
                    <Wrench className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-[#0866C6]" />
                  )}
                  <span>
                    الصلاحيات المحددة:{' '}
                    <strong className="text-slate-900 dark:text-white font-mono">
                      {userFormData.userType === 'technician'
                        ? selectedPermissions.filter((p) => ALL_TECHNICIAN_PERMISSION_TOKENS.includes(p)).length
                        : selectedPermissions.length}
                    </strong>{' '}
                    /{' '}
                    {userFormData.userType === 'technician'
                      ? ALL_TECHNICIAN_PERMISSION_TOKENS.length
                      : ALL_PERMISSION_TOKENS.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserModalOpen(false)}
                    className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    إلغاء وخروج
                  </button>
                  <button
                    type="submit"
                    disabled={userModalLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {userModalLoading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingUserId ? 'حفظ التعديلات' : 'إنشاء المستخدم'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CHANGE USER PASSWORD MODAL */}
      {/* ========================================================================= */}
      {passModalOpen && targetUserForPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>تغيير كلمة مرور: {targetUserForPass.name}</span>
              </h3>
              <button
                onClick={() => setPassModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangeUserPassword} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-300 text-xs">
                أنت تقوم الآن بتعيين كلمة مرور جديدة لحساب المستخدم (<strong>@{targetUserForPass.username}</strong>). لا تظهر كلمة المرور القديمة لأسباب أمنية.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  كلمة المرور الجديدة: <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showUserPass ? 'text' : 'password'}
                    required
                    value={userPasswordForm.newPassword}
                    onChange={(e) =>
                      setUserPasswordForm({ ...userPasswordForm, newPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowUserPass(!showUserPass)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showUserPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تأكيد كلمة المرور: <span className="text-rose-500">*</span>
                </label>
                <input
                  type={showUserPass ? 'text' : 'password'}
                  required
                  value={userPasswordForm.confirmPassword}
                  onChange={(e) =>
                    setUserPasswordForm({ ...userPasswordForm, confirmPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0866C6]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={userPasswordForm.mustChangePasswordNextLogin}
                    onChange={(e) =>
                      setUserPasswordForm({ ...userPasswordForm, mustChangePasswordNextLogin: e.target.checked })
                    }
                    className="w-4 h-4 rounded-sm text-[#0866C6] border-slate-300 focus:ring-0"
                  />
                  <span>إجبار المستخدم على تغيير كلمة المرور عند تسجيل دخوله القادم</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPassModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={changeUserPassLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                >
                  {changeUserPassLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                  ) : (
                    <span>تحديث كلمة المرور</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
