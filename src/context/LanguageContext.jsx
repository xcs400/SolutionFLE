import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Static fallbacks (used immediately while API loads)
import frStatic from '../locales/fr.json';
import enStatic from '../locales/en.json';
import esStatic from '../locales/es.json';
import arStatic from '../locales/ar.json';

const staticTranslations = { fr: frStatic, en: enStatic, es: esStatic, ar: arStatic };

const SUPPORTED_LANGUAGES = [
    { code: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français', dir: 'ltr' },
    { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English', dir: 'ltr' },
    { code: 'es', label: 'ES', flag: '🇪🇸', name: 'Español', dir: 'ltr' },
    { code: 'ar', label: 'AR', flag: '🇸🇦', name: 'العربية', dir: 'rtl' },
];

const LanguageContext = createContext();

/**
 * Get a nested value from an object using a dot-separated path.
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : path), obj);
}

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('solutionfle-lang');
        if (saved && staticTranslations[saved]) return saved;
        const browserLang = navigator.language?.split('-')[0];
        return staticTranslations[browserLang] ? browserLang : 'fr';
    });

    const [translations, setTranslations] = useState(staticTranslations);

    // Fetch live translations from server on mount
    useEffect(() => {
        const fetchTranslations = async () => {
            try {
                const langs = ['fr', 'en', 'es', 'ar'];
                const responses = await Promise.all(
                    langs.map(lang => fetch(`/api/locales/${lang}`))
                );
                if (responses.every(r => r.ok)) {
                    const data = await Promise.all(responses.map(r => r.json()));
                    const result = {};
                    langs.forEach((lang, i) => { result[lang] = data[i]; });
                    setTranslations(result);
                }
            } catch (err) {
                console.log('Using bundled translations (API unavailable)');
            }
        };
        fetchTranslations();
    }, []);

    // Apply dir and lang attributes when language changes
    useEffect(() => {
        const langInfo = SUPPORTED_LANGUAGES.find(l => l.code === language);
        document.documentElement.lang = language;
        document.documentElement.dir = langInfo?.dir || 'ltr';
    }, [language]);

    const changeLanguage = useCallback((lang) => {
        if (translations[lang]) {
            setLanguage(lang);
            localStorage.setItem('solutionfle-lang', lang);
        }
    }, [translations]);

    const t = useCallback((key) => {
        const value = getNestedValue(translations[language], key);
        return value;
    }, [language, translations]);

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
