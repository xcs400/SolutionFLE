import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    const links = [
        { name: 'Accueil', href: '#home' },
        { name: 'A propos', href: '#about' },
        { name: 'Services', href: '#services' },
        { name: 'Contenu', href: '#resources' },
        { name: 'Témoignages', href: '#testimonials' },
        { name: 'Contact', href: '#contact' },
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
                            key={link.name}
                            href={link.href}
                        >
                            {link.name}
                        </a>
                    ))}
                    <a href="#contact" className="btn">Contactez-moi</a>
                </nav>

                {/* Mobile Menu Toggle */}
                <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
                    {isOpen ? <X size={32} /> : <Menu size={32} />}
                </button>
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
                                key={link.name}
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
                            Contactez-moi
                        </a>
                    </motion.nav>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Header;
