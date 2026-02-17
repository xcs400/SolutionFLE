import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { t } = useLanguage();

    const toggleMenu = () => setIsOpen(!isOpen);

    const links = [
        { name: t('nav.home'), href: '#home' },
        { name: t('nav.about'), href: '#about' },
        { name: t('nav.services'), href: '#services' },
        { name: t('nav.resources'), href: '#resources' },
        { name: t('nav.testimonials'), href: '#testimonials' },
        { name: t('nav.contact'), href: '#contact' },
    ];

    return (
        <header>
            <div className="container">
                <a href="#home" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                    <img
                        src="./LogoOfficiel.png"
                        alt="Solution FLE Logo"
                        style={{ height: '85px', width: 'auto' }}
                    />
                    <span className="logo-text">
                        <span style={{ color: '#000000' }}>Solution</span>
                        <span style={{ color: 'var(--color-secondary)', marginLeft: '0.6rem' }}>FLE</span>
                    </span>
                </a>

                {/* Desktop Navigation */}
                <nav className="nav-links">
                    {links.map(link => (
                        <a
                            key={link.href}
                            href={link.href}
                        >
                            {link.name}
                        </a>
                    ))}
                    <a href="#contact" className="btn">{t('nav.cta')}</a>
                    <LanguageSwitcher />
                </nav>

                {/* Mobile Menu Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="mobile-lang-switcher">
                        <LanguageSwitcher />
                    </div>
                    <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
                        {isOpen ? <X size={32} /> : <Menu size={32} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.nav
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mobile-nav"
                        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    >
                        {links.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                        <a
                            href="#contact"
                            className="btn"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('nav.cta')}
                        </a>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;
