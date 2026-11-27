import { useSettingsStore } from '@/store/useSettingsStore';

export function useSupportWhatsApp() {
  return useSettingsStore(state => {
    const number = state.settings.contact?.whatsapp;
    return state.version !== null && typeof number === 'string' && /^[1-9]\d{7,14}$/.test(number)
      && number !== '201012345678' ? `https://wa.me/${number}` : undefined;
  });
}
