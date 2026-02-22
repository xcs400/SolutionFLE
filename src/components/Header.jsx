import React, { useState } from 'react';
import Cookies from 'js-cookie';
import { Menu, X, Phone, Mail, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

// Simple hash (copié depuis admin.html)
function simpleMD5(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + c;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// Utilitaire pour vérifier l'auth admin
function isAdmin() {
    const token = Cookies.get('ident');
    if (!token) return false;
    // Optionnel : vérifier expiration côté client
    return true;
}

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [showLogin, setShowLogin] = useState(false);
    const [loginPwd, setLoginPwd] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loadingLogin, setLoadingLogin] = useState(false);
    const { t, language: currentLang, changeLanguage, supportedLanguages, editMode, toggleEditMode } = useLanguage();

    const toggleMenu = () => setIsOpen(!isOpen);

    // Vérifier la session au chargement (ma faute, il faut refaire une session au chargement !)
    React.useEffect(() => {
        const check = async () => {
            const token = Cookies.get('ident');
            if (!token) return;
            try {
                const res = await fetch('/api/auth/check', {
                    headers: { 'x-session-id': token }
                });
                if (!res.ok) {
                    Cookies.remove('ident');
                    // Facultatif : recharger si on veut forcer la mise à jour des icônes admin
                    // window.location.reload(); 
                }
            } catch (err) {
                console.log('Session check skipped (offline?)');
            }
        };
        check();
    }, []);

    const links = [
        //  { name: t('nav.home'), href: '#home' },
        { name: t('nav.about'), href: '#about', key: 'about' },
        { name: t('nav.services'), href: '#services', key: 'services' },
        { name: t('nav.resources'), href: '#resources', key: 'resources' },
        { name: t('nav.blog'), href: '#blog', key: 'blog' },
        { name: t('nav.testimonials'), href: '#testimonials', key: 'testimonials' },
        { name: t('nav.contact'), href: '#contact', key: 'contact' },
    ];

    const currentLangData = supportedLanguages.find(l => l.code === currentLang);

    // Handler login
    const handleLogin = async () => {
        setLoadingLogin(true);
        setLoginError('');
        try {
            const { nonce } = await (await fetch('/api/auth/challenge')).json();
            const hash = simpleMD5(loginPwd + nonce);
            const res = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hash, nonce })
            });
            const data = await res.json();
            if (data.success) {
                // Stocke token en cookie session (1h)
                Cookies.set('ident', data.sessionId, { expires: 1 / 24 });
                setShowLogin(false);
                setLoginPwd('');
                window.location.reload();
            } else {
                setLoginError(data.error || 'Mot de passe incorrect');
            }
        } catch {
            setLoginError('Erreur réseau');
        }
        setLoadingLogin(false);
    };

    const handleLogout = () => {
        Cookies.remove('ident');
        window.location.reload();
    };

    const handleBackup = async (e) => {
        if (e) e.preventDefault();
        const token = Cookies.get('ident');
        if (!token) return alert("Session expirée");

        try {
            // Ouvrir dans un nouvel onglet ou déclencher le download
            const url = `/api/admin/backup?sid=${token}`;
            window.location.href = url;
        } catch (err) {
            alert("Erreur lors de la sauvegarde");
        }
    };

    return (
        <header className="main-header" style={{ width: '100%', zIndex: 1100 }}>
            {/* Top Contact Bar - FIXED on all devices */}
            <div className="top-banner">
                <div className="container" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 1rem',
                    width: '100%'
                }}>
                    <a href="#home" style={{ color: 'white', opacity: 0.9, display: 'flex', alignItems: 'center' }}>
                        <Home size={24} />
                    </a>

                    <div className="top-contact-info" style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.1rem'
                    }}>
                        <a href="tel:+33649163537" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600' }}>
                            <Phone size={12} /> <EditableText tag="span" translationKey="contact.phone_value">{t('contact.phone_value') || '06 49 16 35 37'}</EditableText>
                        </a>
                        <a href="mailto:solutionFLE@gmail.com" style={{ color: 'white', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '600', fontSize: '0.8rem' }}>
                            <Mail size={12} /> <EditableText tag="span" translationKey="contact.email_value">{t('contact.email_value') || 'solutionFLE@gmail.com'}</EditableText>
                        </a>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <button className="mobile-only" onClick={toggleMenu} aria-label="Toggle menu" style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                            {isOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Header Area - FIXED on PC, SCROLL on Mobile */}
            <div className="header-main" style={{ padding: '0.8rem 0' }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem', maxWidth: 'none', width: '100%', margin: '0' }}>
                    <div className="logo-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexShrink: 0 }}>

                        <a href="#home" className="logo" style={{ marginRight: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
                            <img
                                src="./LogoOfficiel.png"
                                alt="Solution FLE Logo"
                                className="logo-img"
                            />
                            <div className="logo-content" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginBottom: '4px' }}>
                                    <span className="logo-text" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', color: '#7f7f7f' }}>
                                        <span style={{ fontWeight: '800' }}>
                                            <EditableText tag="span" translationKey="nav.logo_part1">{t('nav.logo_part1') || 'Solution'}</EditableText>
                                        </span>
                                        <span style={{ fontWeight: '300', opacity: 0.5, fontSize: '1.8rem', paddingBottom: '2px' }}>|</span>
                                        <span style={{ fontWeight: '800' }}>
                                            <EditableText tag="span" translationKey="nav.logo_part2">{t('nav.logo_part2') || 'FLE'}</EditableText>
                                        </span>
                                    </span>
                                    <img
                                        src="./Picture2.png"
                                        alt="Ampoule"
                                        style={{ height: '52px', width: 'auto', marginBottom: '-5px' }}
                                    />
                                </div>
                            </div>
                        </a>
                    </div>

                    <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                        <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'space-evenly' }}>
                            {links.map((link) => (
                                <a key={link.href} href={link.href} style={{ textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>
                                    <EditableText tag="span" translationKey={`nav.${link.key}`}>{link.name}</EditableText>
                                </a>
                            ))}


                            {/* Language Dropdown Desktop */}
                            <div style={{ position: 'relative', display: 'inline-block' }}>
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
                                    {currentLangData?.flag} <EditableText tag="span" translationKey="nav.language">{t('nav.language')}</EditableText>
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
                        {/* Admin menu déroulant */}
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                                onClick={() => setShowLogin(!showLogin)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {isAdmin() ? 'Admin' : 'Login'} <motion.span animate={{ rotate: showLogin ? 180 : 0 }}>▾</motion.span>
                            </button>
                            <AnimatePresence>
                                {showLogin && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        style={{ position: 'absolute', top: '100%', right: 0, marginTop: '1rem', background: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', borderRadius: '12px', padding: '0.5rem', minWidth: '220px', zIndex: 1001 }}
                                    >
                                        {!isAdmin() ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                                <input type="password" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} placeholder="Mot de passe admin" style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }} />
                                                <button className="btn btn-primary" disabled={loadingLogin} onClick={handleLogin} style={{ fontWeight: 700, fontSize: '1rem' }}>Connexion</button>
                                                {loginError && <span style={{ color: '#f87171', fontSize: '0.95rem' }}>{loginError}</span>}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                                                <a href="/textedit" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>TextEdit</a>
                                                <a
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleEditMode();
                                                    }}
                                                    style={{
                                                        color: editMode ? 'var(--color-red)' : 'var(--color-primary)',
                                                        fontWeight: 700,
                                                        textDecoration: 'none',
                                                        fontSize: '1rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {editMode ? 'Quitter le mode édition' : 'InlineEdit'}
                                                </a>
                                                <a href="/admin" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>BlogEdit</a>
                                                <a
                                                    href="#"
                                                    onClick={handleBackup}
                                                    style={{ color: 'var(--color-green)', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}
                                                >
                                                    📦 Sauvegarde (ZIP)
                                                </a>
                                                <button className="btn btn-ghost" onClick={handleLogout} style={{ fontWeight: 700, fontSize: '1rem', color: '#f87171' }}>Logout</button>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
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
                            background: 'white',
                            boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                            overflowY: 'auto',
                            maxHeight: 'calc(100vh - 50px)',
                        }}
                    >
                        {links.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)}
                                style={{
                                    padding: '0.8rem 2rem',
                                    display: 'block',
                                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                                    textDecoration: 'none',
                                    color: 'var(--color-primary)',
                                    fontWeight: 700
                                }}
                            >
                                <EditableText tag="span" translationKey={`nav.${link.key}`}>{link.name}</EditableText>
                            </a>
                        ))}

                        {/* Language Accordion Mobile */}
                        <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                            <button
                                onClick={() => setIsLangOpen(!isLangOpen)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 2rem',
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
                                <span>{currentLangData?.flag} <EditableText tag="span" translationKey="nav.language">{t('nav.language')}</EditableText></span>
                                <motion.span animate={{ rotate: isLangOpen ? 180 : 0 }}>▾</motion.span>
                            </button>

                            <AnimatePresence>
                                {isLangOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ background: '#f8fafc', padding: '0.5rem 0' }}
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

                        {/* Admin/Login Accordion Mobile */}
                        <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
                            <button
                                onClick={() => setShowLogin(!showLogin)}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 2rem',
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
                                <span>{isAdmin() ? 'Admin' : 'Login'}</span>
                                <motion.span animate={{ rotate: showLogin ? 180 : 0 }}>▾</motion.span>
                            </button>

                            <AnimatePresence>
                                {showLogin && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        style={{ background: '#f8fafc', padding: '1.5rem 2rem' }}
                                    >
                                        {!isAdmin() ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <input
                                                    type="password"
                                                    value={loginPwd}
                                                    onChange={e => setLoginPwd(e.target.value)}
                                                    placeholder="Mot de passe admin"
                                                    style={{ padding: '0.8rem', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', width: '100%' }}
                                                />
                                                <button
                                                    className="btn btn-primary"
                                                    disabled={loadingLogin}
                                                    onClick={handleLogin}
                                                    style={{ fontWeight: 700, fontSize: '1rem', padding: '0.8rem' }}
                                                >
                                                    Connexion
                                                </button>
                                                {loginError && <span style={{ color: '#f87171', fontSize: '0.9rem' }}>{loginError}</span>}
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                                <a href="/textedit" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>TextEdit</a>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleEditMode();
                                                        setIsOpen(false);
                                                    }}
                                                    style={{
                                                        background: 'none', border: 'none', textAlign: 'left', padding: 0,
                                                        color: editMode ? 'var(--color-red)' : 'var(--color-primary)',
                                                        fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer'
                                                    }}
                                                >
                                                    {editMode ? 'Quitter le mode édition' : 'InlineEdit'}
                                                </button>
                                                <a href="/admin" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}>BlogEdit</a>
                                                <a
                                                    href="#"
                                                    onClick={handleBackup}
                                                    style={{ color: 'var(--color-green)', fontWeight: 700, textDecoration: 'none', fontSize: '1.1rem' }}
                                                >
                                                    📦 Sauvegarde (ZIP)
                                                </a>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={handleLogout}
                                                    style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f87171', textAlign: 'left', padding: 0 }}
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        )}
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
