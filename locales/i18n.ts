import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import vi from './vi.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

const i18nInstance = i18n;

i18nInstance.use(initReactI18next).init({
  resources,
  lng: 'vi', // Ngôn ngữ mặc định
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React đã tự escape xss an toàn
  },
});

export default i18nInstance;
