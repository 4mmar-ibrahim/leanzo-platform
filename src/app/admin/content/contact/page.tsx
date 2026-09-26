'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Save,
  Send,
  Phone,
  Eye,
  MessageCircle,
  Mail,
  MapPin,
  Clock,
  Globe,
  Share2,
  Loader2,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

export default function AdminContentContactPage() {
  const contact = useCMSStore((s) => s.contact);
  const social = useCMSStore((s) => s.social);
  const isLoading = useCMSStore((s) => s.isLoading);
  const isSaving = useCMSStore((s) => s.isSaving);
  const lastPublishedAt = useCMSStore((s) => s.lastPublishedAt);
  const updateContact = useCMSStore((s) => s.updateContact);
  const updateSocial = useCMSStore((s) => s.updateSocial);
  const fetchDraftContent = useCMSStore((s) => s.fetchDraftContent);
  const saveDraftToDatabase = useCMSStore((s) => s.saveDraftToDatabase);
  const publishToDatabase = useCMSStore((s) => s.publishToDatabase);
  const setHasUnsavedChanges = useCMSStore((s) => s.setHasUnsavedChanges);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Contact Form State
  const [phone, setPhone] = useState(contact.phone);
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp);
  const [email, setEmail] = useState(contact.email);
  const [address, setAddress] = useState(contact.address);
  const [workingHours, setWorkingHours] = useState(contact.workingHours);
  const [mapsUrl, setMapsUrl] = useState(contact.mapsUrl);
  const [supportNote, setSupportNote] = useState(contact.supportNote);

  // Social Links Form State
  const [facebook, setFacebook] = useState(social?.facebook || '');
  const [instagram, setInstagram] = useState(social?.instagram || '');
  const [tiktok, setTiktok] = useState(social?.tiktok || '');
  const [youtube, setYoutube] = useState(social?.youtube || '');
  const [twitter, setTwitter] = useState(social?.twitter || '');
  const [linkedin, setLinkedin] = useState(social?.linkedin || '');

  useEffect(() => {
    fetchDraftContent();
  }, [fetchDraftContent]);

  useEffect(() => {
    if (contact) {
      setPhone(contact.phone || '');
      setWhatsapp(contact.whatsapp || '');
      setEmail(contact.email || '');
      setAddress(contact.address || '');
      setWorkingHours(contact.workingHours || '');
      setMapsUrl(contact.mapsUrl || '');
      setSupportNote(contact.supportNote || '');
    }
    if (social) {
      setFacebook(social.facebook || '');
      setInstagram(social.instagram || '');
      setTiktok(social.tiktok || '');
      setYoutube(social.youtube || '');
      setTwitter(social.twitter || '');
      setLinkedin(social.linkedin || '');
    }
  }, [contact, social]);

  const applyLocalChanges = () => {
    updateContact({
      phone,
      whatsapp,
      email,
      address,
      workingHours,
      mapsUrl,
      supportNote,
    });

    const updatedItems = (social.items || []).map((item) => {
      if (item.platform === 'facebook' && facebook) return { ...item, url: facebook };
      if (item.platform === 'instagram' && instagram) return { ...item, url: instagram };
      if (item.platform === 'tiktok' && tiktok) return { ...item, url: tiktok };
      if (item.platform === 'youtube' && youtube) return { ...item, url: youtube };
      if (item.platform === 'twitter' && twitter) return { ...item, url: twitter };
      if (item.platform === 'linkedin' && linkedin) return { ...item, url: linkedin };
      if (item.platform === 'whatsapp' && whatsapp) return { ...item, url: whatsapp };
      return item;
    });

    updateSocial({
      facebook,
      instagram,
      tiktok,
      youtube,
      twitter,
      linkedin,
      whatsapp: whatsapp || contact.whatsapp,
      ...(updatedItems.length > 0 ? { items: updatedItems } : {}),
    });
  };

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    applyLocalChanges();
    const success = await saveDraftToDatabase();
    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حفظ مسودة بيانات التواصل وروابط السوشيال',
        module: 'content',
        target: 'بيانات التواصل',
      });
      toast.success('تم حفظ مسودة بيانات التواصل في قاعدة البيانات بنجاح!');
    } else {
      toast.error('حدث خطأ أثناء حفظ المسودة.');
    }
  };

  const handlePublish = async () => {
    applyLocalChanges();
    const success = await publishToDatabase();
    if (success) {
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'نشر بيانات التواصل وروابط السوشيال للعملاء',
        module: 'content',
        target: 'بيانات التواصل',
      });
      toast.success('تم نشر بيانات التواصل وروابط التواصل الاجتماعي لجميع العملاء في الموقع الحي بنجاح!');
    } else {
      toast.error('فشل نشر المحتوى. تأكد من اتصال الخادم.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/admin/content"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500"
        >
          <ArrowRight className="w-4 h-4" />
          العودة لمركز المحتوى CMS
        </Link>
        <div className="flex items-center gap-3">
          {lastPublishedAt && (
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
              <Clock className="w-3 h-3" />
              <span>آخر نشر: {new Date(lastPublishedAt).toLocaleString('ar-EG')}</span>
            </span>
          )}
          <Link
            href="/contact"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-500 hover:underline px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة صفحة اتصل بنا</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إدارة بيانات التواصل والدعم وروابط التواصل
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            الأرقام والروابط المدخلة هنا تنعكس فوراً في الهيدر، الفوتر، وصفحة اتصل بنا بعد النشر
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={() => handleSaveDraft()}
            className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>حفظ كمسودة</span>
          </button>
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handlePublish}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/30 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>نشر مباشر للعملاء</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveDraft} className="space-y-6 max-w-4xl">
        {/* Contact info card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Phone className="w-4 h-4 text-sky-500" />
            <span>بيانات الاتصال المباشرة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-sky-500" />
                <span>رقم الهاتف المباشر</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>رقم / رابط واتساب المباشر</span>
              </label>
              <input
                type="text"
                required
                value={whatsapp}
                onChange={(e) => {
                  setWhatsapp(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>البريد الإلكتروني الرسمي</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>مواعيد وساعات العمل</span>
              </label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => {
                  setWorkingHours(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>العنوان الإداري للمقر</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">رابط خرائط جوجل (Google Maps URL)</label>
            <input
              type="url"
              value={mapsUrl}
              onChange={(e) => {
                setMapsUrl(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">تنويه سرعة الرد والدعم</label>
            <input
              type="text"
              value={supportNote}
              onChange={(e) => {
                setSupportNote(e.target.value);
                setHasUnsavedChanges(true);
              }}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Social media links card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-500" />
              <span>روابط منصات التواصل الاجتماعي (Social Media)</span>
            </h3>
            <Link
              href="/admin/settings/social"
              className="text-xs font-bold text-sky-600 hover:text-sky-500 flex items-center gap-1"
            >
              <span>إدارة المنصات والشعارات الرسمية وإخفائها &larr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Facebook URL</label>
              <input
                type="url"
                value={facebook}
                onChange={(e) => {
                  setFacebook(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://facebook.com/cleanzo"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Instagram URL</label>
              <input
                type="url"
                value={instagram}
                onChange={(e) => {
                  setInstagram(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://instagram.com/cleanzo"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">TikTok URL</label>
              <input
                type="url"
                value={tiktok}
                onChange={(e) => {
                  setTiktok(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://tiktok.com/@cleanzo"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">YouTube URL</label>
              <input
                type="url"
                value={youtube}
                onChange={(e) => {
                  setYoutube(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://youtube.com/@cleanzo"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Twitter / X URL</label>
              <input
                type="url"
                value={twitter}
                onChange={(e) => {
                  setTwitter(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://x.com/cleanzo"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">LinkedIn URL</label>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => {
                  setLinkedin(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://linkedin.com/company/cleanzo"
                className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving || isLoading}
            onClick={handlePublish}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>نشر التعديلات للعملاء</span>
          </button>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ كمسودة</span>
          </button>
        </div>
      </form>
    </div>
  );
}
