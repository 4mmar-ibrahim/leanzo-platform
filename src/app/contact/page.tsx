'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useCMSStore } from '@/store/useCMSStore';
import { SectionHeader } from '@/components/common/SectionHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { useZoStudioStore } from '@/store/useZoStudioStore';
import { SocialBrandIcon, resolveSocialItems } from '@/components/common/SocialBrandIcon';

export default function ContactPage() {
  const { t, locale } = useLocaleStore();
  const contact = useCMSStore((s) => s.contact);
  const social = useCMSStore((s) => s.social);
  const fetchPublishedContent = useCMSStore((s) => s.fetchPublishedContent);
  const isAr = locale === 'ar';

  React.useEffect(() => {
    fetchPublishedContent();
  }, [fetchPublishedContent]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error(isAr ? 'يرجى إكمال الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success(isAr ? 'تم استلام رسالتك بنجاح! سيتواصل معك فريق الدعم قريباً.' : 'Message received! We will be in touch shortly.');

      // Trigger Zo reaction on contact submission
      useZoStudioStore.getState().emitTrigger('action', {
        priority: 2,
        customExpression: 'happy',
        customPose: 'holding_checkmark',
        customMessage: 'رسالتك وصلت يا بطل! 💙 فريق كلينزو هيتواصل معاك في أسرع وقت.',
        customMessageEn: 'Your message has been received! 💙 The Cleanzo team will reach out shortly.',
      });
    }, 600);
  };

  return (
    <div className="py-12 bg-[#EAF8FC] dark:bg-[#041728] min-h-screen space-y-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <SectionHeader
          badge={isAr ? 'تواصل معنا' : 'Contact Us'}
          title={isAr ? 'نحن هنا لمساعدتك على مدار الساعة' : "We're Here to Help Every Day"}
          subtitle={isAr ? 'لديك استفسار أو ترغب في حجز مخصص للشركات والفلل الكبرى؟ تواصل معنا عبر القنوات التالية.' : 'Have a query or need enterprise/villa booking assistance? Reach out anytime.'}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Details Column */}
          <div className="lg:col-span-5 space-y-6 text-start">
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'قنوات التواصل المباشرة' : 'Direct Channels'}
              </h3>

              <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                {contact?.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{isAr ? 'الهاتف' : 'Phone'}</p>
                      <a href={`tel:${contact.phone}`} dir="ltr" className="font-bold text-slate-900 dark:text-white hover:text-sky-600">
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {contact?.whatsapp && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">WhatsApp</p>
                      <a
                        href={contact.whatsapp.startsWith('http') ? contact.whatsapp : `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        dir="ltr"
                        className="font-bold text-slate-900 dark:text-white hover:text-emerald-600"
                      >
                        {contact.whatsapp}
                      </a>
                    </div>
                  </div>
                )}

                {contact?.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-[#07345C]/30 text-[#0866C6] flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{isAr ? 'البريد الإلكتروني' : 'Email'}</p>
                      <a href={`mailto:${contact.email}`} className="font-bold text-slate-900 dark:text-white hover:text-[#0866C6]">
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {(contact?.workingHours || contact?.workingHoursEn) && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{isAr ? 'ساعات العمل' : 'Working Hours'}</p>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {isAr ? (contact?.workingHours || contact?.workingHoursEn) : (contact?.workingHoursEn || contact?.workingHours)}
                      </p>
                    </div>
                  </div>
                )}

                {(contact?.address || contact?.addressEn) && (
                  <div className="flex items-start gap-3 pt-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold uppercase">{isAr ? 'المقر والفروع' : 'Offices'}</p>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {isAr ? (contact?.address || contact?.addressEn) : (contact?.addressEn || contact?.address)}
                      </p>
                    </div>
                  </div>
                )}

                {!contact?.phone && !contact?.whatsapp && !contact?.email && !contact?.workingHours && !contact?.address && (
                  <p className="text-xs text-slate-400 py-3">
                    {isAr
                      ? 'لم يتم تعيين بيانات تواصل مباشرة حتى الآن. يمكنك إرسال استفسارك من خلال النموذج وسنقوم بالرد عليك.'
                      : 'No direct contact channels configured yet. Please submit your inquiry through the form.'}
                  </p>
                )}
              </div>
            </div>

            {/* Social Media Channels Card */}
            {resolveSocialItems(social).filter((item) => item.visible !== false && Boolean(item.url?.trim())).length > 0 && (
              <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'تابعنا على وسائل التواصل' : 'Follow Us On Social Media'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {resolveSocialItems(social)
                    .filter((item) => item.visible !== false && Boolean(item.url?.trim()))
                    .map((item) => {
                      const href =
                        item.platform === 'whatsapp' && !item.url.startsWith('http')
                          ? `https://wa.me/${item.url.replace(/\D/g, '')}`
                          : item.url;
                      const label = isAr ? item.name : (item.nameEn || item.name);

                      return (
                        <a
                          key={item.id}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-sky-50/60 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-[1.02] group"
                        >
                          <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-110 transition-transform">
                            <SocialBrandIcon platform={item.platform} size="sm" colored={true} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                            {label}
                          </span>
                        </a>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Inquiry Form Column */}
          <div className="lg:col-span-7">
            <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 text-start">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isAr ? 'أرسل لنا استفسارك' : 'Send an Inquiry'}
              </h3>

              {isSuccess ? (
                <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                    {isAr ? 'شكراً لتواصلك معنا!' : 'Thank you for reaching out!'}
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {isAr
                      ? 'تم تسجيل رسالتك بنجاح وسيتواصل معك أحد ممثلي خدمة العملاء خلال أقل من ساعتين.'
                      : 'We have received your message and will get back to you within 2 hours.'}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsSuccess(false);
                      setName('');
                      setPhone('');
                      setEmail('');
                      setMessage('');
                    }}
                  >
                    {isAr ? 'إرسال رسالة أخرى' : 'Send another message'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label={isAr ? 'الاسم الكامل' : 'Full Name'}
                      placeholder={isAr ? 'أحمد عبد الله' : 'Ahmed Abdallah'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />

                    <Input
                      label={isAr ? 'رقم الهاتف' : 'Phone Number'}
                      placeholder="01012345678"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <Input
                    label={isAr ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                    placeholder="name@example.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isAr ? 'نص الرسالة أو الاستفسار' : 'Message'}
                    </label>
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={isAr ? 'اكتب استفسارك بالتفصيل هنا...' : 'Write your inquiry here...'}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    className="w-full sm:w-auto shadow-md shadow-sky-500/20"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isAr ? 'إرسال الرسالة' : 'Send Message'}</span>
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
