import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import Cookies from 'js-cookie';

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
 * Simple MD5 hash function - codé en dur, sans dépendance externe
 */
function simpleMD5(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

/**
 * Hash a password with a nonce - utilise simple MD5
 */
function hashPassword(password, nonce) {
    return simpleMD5(password + nonce);
}

/**
 * Get a nested value from an object using a dot-separated path.
 */
function getNestedValue(obj, path) {
    if (!obj || !path) return path;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current[part] === undefined) return path;
        current = current[part];
    }
    return current;
}

/**
 * Set a nested value in an object using a dot-separated path.
 */
function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('solutionfle-lang');
        if (saved && staticTranslations[saved]) return saved;
        const browserLang = navigator.language?.split('-')[0];
        return staticTranslations[browserLang] ? browserLang : 'fr';
    });

    const [translations, setTranslations] = useState(staticTranslations);
    const [editMode, setEditMode] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    // Load sessionId from localStorage on mount
    useEffect(() => {
        const savedSessionId = localStorage.getItem('solutionfle-sessionId');
        if (savedSessionId) {
            setSessionId(savedSessionId);
        }
    }, []);

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

    const updateTranslation = useCallback(async (key, newValue) => {
        setTranslations(prev => {
            const next = { ...prev };
            const langData = { ...next[language] };
            setNestedValue(langData, key, newValue);
            next[language] = langData;
            return next;
        });

        // Save to server
        try {
            const currentLangData = { ...translations[language] };
            setNestedValue(currentLangData, key, newValue);

            const token = Cookies.get('ident');
            const response = await fetch(`/api/locales/${language}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': token
                },
                body: JSON.stringify(currentLangData)
            });

            if (!response.ok) throw new Error('Save failed');
        } catch (err) {
            console.error('Failed to save translation:', err);
            alert('Erreur lors de la sauvegarde : ' + err.message);
        }
    }, [language, translations]);

    const t = useCallback((key) => {
        const value = getNestedValue(translations[language], key);

        // If it's a string and we are in edit mode, we could wrap it, 
        // but it's cleaner to handle it in a separate component or return the key.
        return value;
    }, [language, translations]);

    const toggleEditMode = useCallback(() => {
        if (editMode) {
            setEditMode(false);
            return;
        }

        // Verifie le cookie admin au lieu de demander un mot de passe
        const token = Cookies.get('ident');
        if (!token) {
            alert('Acces refuse. Veuillez vous authentifier via le menu Admin.');
            return;
        }

        setEditMode(true);
    }, [editMode]);

    return (
        <LanguageContext.Provider value={{
            language,
            changeLanguage,
            t,
            supportedLanguages: SUPPORTED_LANGUAGES,
            editMode,
            toggleEditMode,
            updateTranslation,
            sessionId
        }}>
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
