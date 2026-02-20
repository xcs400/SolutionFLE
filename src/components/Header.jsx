import React, { useState } from 'react';
import { Menu, X, Phone, Mail, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const { t, language: currentLang, changeLanguage, supportedLanguages } = useLanguage();

    const toggleMenu = () => setIsOpen(!isOpen);

    const links = [
        //  { name: t('nav.home'), href: '#home' },
        { name: t('nav.about'), href: '#about' },
        { name: t('nav.services'), href: '#services' },
        { name: t('nav.resources'), href: '#resources' },
        { name: t('nav.testimonials'), href: '#testimonials' },
        { name: t('nav.contact'), href: '#contact' },
    ];

    const currentLangData = supportedLanguages.find(l => l.code === currentLang);

    return (
        <header>
            {/* Top Contact Bar - FIXED */}
            <div className="top-banner" style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                padding: '0.4rem 0',
                fontSize: '0.85rem',
                zIndex: 1100,
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <div className="container" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 1rem'
                }}>
                    <a href="#home" style={{ color: 'white', opacity: 0.9 }}>
                        <Home size={24} />
                    </a>

                    <div className="top-contact-info" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.1rem'
                    }}>
                        <a href="tel:+33649163537" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                            <Phone size={12} /> 06 49 16 35 37
                        </a>
                        <a href="mailto:solutionFLE@gmail.com" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                            <Mail size={12} /> solutionFLE@gmail.com
                        </a>
                    </div>

                    <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu" style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
                        {isOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* Main Header Area */}
            <div className="header-main" style={{ marginTop: '55px', padding: '0.8rem 0', background: 'white' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
                    <a href="#home" className="logo" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
                        <img
                            src="./LogoOfficiel.png"
                            alt="Solution FLE Logo"
                            className="logo-img"
                        />
                        <div className="logo-content" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '4px' }}>
                                <span className="logo-text" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', color: '#7f7f7f' }}>
                                    <span style={{ fontWeight: '800' }}>Solution</span>
                                    <span style={{ fontWeight: '300', opacity: 0.5, fontSize: '1.8rem', paddingBottom: '2px' }}>|</span>
                                    <span style={{ fontWeight: '800' }}>FLE</span>
                                </span>
                                <img
                                    src="./Picture2.png"
                                    alt="Ampoule"
                                    style={{ height: '52px', width: 'auto', marginBottom: '-5px' }}
                                />
                            </div>
                        </div>
                    </a>

                    {/* Desktop Navigation */}
                    <nav className="nav-links">
                        {links.map(link => (
                            <a key={link.href} href={link.href} style={{ textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 700, marginLeft: '1.5rem' }}>{link.name}</a>
                        ))}

                        {/* Language Dropdown Desktop */}
                        <div style={{ position: 'relative', display: 'inline-block', marginLeft: '1.5rem' }}>
                            <button
                                onClick={() => setIsLangOpen(!isLangOpen)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                {currentLangData?.flag} {t('nav.language')}
                                <motion.span animate={{ rotate: isLangOpen ? 180 : 0 }}>▾</motion.span>
                            </button>

                            <AnimatePresence>
                                {isLangOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '1rem',
                                            background: 'white',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                            borderRadius: '12px',
                                            padding: '0.5rem',
                                            minWidth: '150px',
                                            zIndex: 1001
                                        }}
                                    >
                                        {supportedLanguages.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    changeLanguage(lang.code);
                                                    setIsLangOpen(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    width: '100%',
                                                    padding: '0.75rem 1rem',
                                                    border: 'none',
                                                    background: currentLang === lang.code ? 'rgba(11, 24, 109, 0.05)' : 'none',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    color: 'var(--color-primary)',
                                                    fontWeight: currentLang === lang.code ? 700 : 500
                                                }}
                                            >
                                                <span>{lang.flag}</span>
                                                <span>{lang.name}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </nav>
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
                        style={{
                            position: 'fixed',
                            top: '55px',
                            left: 0,
                            width: '100%',
                            zIndex: 1050,
                            background: 'white',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            overflow: 'hidden'
                        }}
                    >
                        {links.map(link => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    padding: '1.2rem 2rem',
                                    display: 'block',
                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                    textDecoration: 'none',
                                    color: 'var(--color-primary)',
                                    fontWeight: 700
                                }}
                            >
                                {link.name}
                            </a>
                        ))}

                        {/* Language Accordion Mobile */}
                        <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                            <button
                                onClick={() => setIsLangOpen(!isLangOpen)}
                                style={{
                                    width: '100%',
                                    padding: '1.2rem 2rem',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary)',
                                    fontWeight: 700,
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <span>{currentLangData?.flag} {t('nav.language')}</span>
                                <motion.span animate={{ rotate: isLangOpen ? 180 : 0 }}>▾</motion.span>
                            </button>

                            <AnimatePresence>
                                {isLangOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ background: 'rgba(11, 24, 109, 0.02)', overflow: 'hidden' }}
                                    >
                                        {supportedLanguages.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => {
                                                    changeLanguage(lang.code);
                                                    setIsLangOpen(false);
                                                    setIsOpen(false);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem 3rem',
                                                    textAlign: 'left',
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--color-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '1rem',
                                                    fontWeight: currentLang === lang.code ? 700 : 500
                                                }}
                                            >
                                                <span>{lang.flag}</span>
                                                <span>{lang.name}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;
