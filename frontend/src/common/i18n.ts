import i18n, { type InitOptions } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend, { type HttpBackendOptions } from "i18next-http-backend";
import { initReactI18next } from "react-i18next";
import translationEN from "../assets/locales/en/translations.json";
import translationFR from "../assets/locales/fr/translations.json";
import { normalizeLanguageCode, supportedLanguages } from "./language";
import { isProduction } from "./utils";

export const defaultNS = "translations";
export const resources = {
	en: { translations: translationEN },
	fr: { translations: translationFR },
} as const;

const i18nOptions: InitOptions<HttpBackendOptions> = {
	defaultNS,
	ns: [defaultNS],
	debug: !isProduction,
	supportedLngs: [...supportedLanguages],
	nonExplicitSupportedLngs: true,
	load: "languageOnly",
	fallbackLng: (code): string[] => [normalizeLanguageCode(code)],
	detection: {
		order: ["querystring", "localStorage", "sessionStorage", "navigator", "htmlTag"],
		lookupQuerystring: "lng",
		caches: ["localStorage"],
		convertDetectedLanguage: (language: string): string => normalizeLanguageCode(language),
	},
	interpolation: {
		escapeValue: false, // not needed for react as it escapes by default
	},
	backend: {
		loadPath: isProduction
			? "locales/{{lng}}/translations.json"
			: "src/assets/locales/{{lng}}/translations.json",
	},
};

void i18n
	.use(initReactI18next)
	.use(LanguageDetector)
	.use(Backend)
	.init<HttpBackendOptions>(i18nOptions);

export default i18n;
