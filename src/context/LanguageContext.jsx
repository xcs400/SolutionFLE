import React, { createContext, useContext, useState, useCallback } from 'react';
import fr from '../locales/fr.json';
import en from '../locales/en.json';

const translations = { fr, en };

const SUPPORTED_LANGUAGES = [
    { code: 'fr', label: 'FR', flag: '🇫🇷', name: 'Français' },
    { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English' },
];

const LanguageContext = createContext();

/**
 * Get a nested value from an object using a dot-separated path.
 * e.g. getNestedValue(obj, "nav.home") => obj.nav.home
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : path), obj);
}

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Try to read saved preference from localStorage
        const saved = localStorage.getItem('solutionfle-lang');
        if (saved && translations[saved]) return saved;
        // Auto-detect from browser
        const browserLang = navigator.language?.split('-')[0];
        return translations[browserLang] ? browserLang : 'fr';
    });

    const changeLanguage = useCallback((lang) => {
        if (translations[lang]) {
            setLanguage(lang);
            localStorage.setItem('solutionfle-lang', lang);
            document.documentElement.lang = lang;
        }
    }, []);

    /**
     * Translation function.
     * Usage: t('nav.home') => "Accueil" (fr) or "Home" (en)
     */
    const t = useCallback((key) => {
        const value = getNestedValue(translations[language], key);
        return value;
    }, [language]);

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
