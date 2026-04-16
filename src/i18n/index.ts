import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import hu from './hu.json';
import en from './en.json';

export const supportedLanguages = ['hu', 'en'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      hu: { translation: hu },
      en: { translation: en },
    },
    fallbackLng: 'hu',
    supportedLngs: supportedLanguages as unknown as string[],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'kalozok.lang',
      caches: ['localStorage'],
    },
  });

export default i18n;
