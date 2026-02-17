import React from 'react';
import { useLanguage } from '../context/LanguageContext';

const LanguageSwitcher = () => {
    const { language, changeLanguage, supportedLanguages } = useLanguage();

    return (
        <div className="lang-switcher">
            {supportedLanguages.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => changeLanguage(lang.code)}
                    className={`lang-btn ${language === lang.code ? 'active' : ''}`}
                    title={lang.name}
                    aria-label={`Switch to ${lang.name}`}
                >
                    <span className="lang-flag">{lang.flag}</span>
                    <span className="lang-label">{lang.label}</span>
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
