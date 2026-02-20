import React from 'react';
import { Mail, Phone, MapPin, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactForm from './ContactForm';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const Contact = () => {
    const { t, editMode, toggleEditMode } = useLanguage();

    return (
        <section id="contact" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '5rem' }}>
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{ textAlign: 'left' }}>
                            <EditableText tag="span" translationKey="contact.title">{t('contact.title')}</EditableText>
                        </h2>
                        <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: '#64748b' }}>
                            <EditableText tag="span" translationKey="contact.subtitle_html" isHtml={true}>{t('contact.subtitle_html')}</EditableText>
                        </p>

                        <div style={{ display: 'grid', gap: '2rem', marginBottom: '4rem' }}>
                            {[
                                { icon: <Phone />, title: t('contact.phone'), value: "06 49 16 35 37", link: "tel:+33649163537", color: 'var(--color-strong-blue)' },
                                { icon: <Mail />, title: t('contact.email'), value: "gamblin.aline@gmail.com", link: "mailto:gamblin.aline@gmail.com", color: 'var(--color-red)' },
                                { icon: <MapPin />, title: t('contact.location'), value: t('contact.location_value'), link: null, color: 'var(--color-green)' }
                            ].map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{
                                        width: '55px',
                                        height: '55px',
                                        borderRadius: '15px',
                                        background: 'white',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        color: item.color,
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.05)'
                                    }}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>{item.title}</h4>
                                        {item.link ? (
                                            <a href={item.link} style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary)' }}>{item.value}</a>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--color-primary)' }}>{item.value}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* LinkedIn moved here as a smaller element */}
                        <a
                            href="https://www.linkedin.com/in/aline-gamblin-68398a191"
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                textDecoration: 'none',
                                color: '#0077b5',
                                fontWeight: '700',
                                fontSize: '1.1rem'
                            }}
                        >
                            <Linkedin size={28} />
                            {t('contact.linkedin')}
                        </a>
                    </motion.div>

                    <ContactForm />
                </div>
            </div>

            <footer style={{ marginTop: '8rem', paddingBottom: '2rem' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                        <div style={{ flex: 1 }}></div>
                        <div style={{ textAlign: 'right', color: 'var(--color-primary)' }}>
                            <p style={{ fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                                &copy; {new Date().getFullYear()} <EditableText tag="span" translationKey="footer.copyright">{t('footer.copyright')}</EditableText>
                            </p>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: 0 }}>
                                <EditableText tag="span" translationKey="footer.siret">{t('footer.siret')}</EditableText>
                            </p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                const pwd = prompt('Mot de passe admin :');
                                if (pwd === 'Pascal') {
                                    window.open('/textedit.html', '_blank');
                                } else if (pwd !== null) {
                                    alert('Mot de passe incorrect');
                                }
                            }}
                            style={{
                                fontSize: '0.85rem',
                                color: 'var(--color-secondary)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                opacity: 0.4,
                                fontWeight: '600'
                            }}
                            onMouseEnter={(e) => e.target.style.opacity = '1'}
                            onMouseLeave={(e) => e.target.style.opacity = '0.4'}
                        >
                            Admin
                        </a>
                        <div style={{ marginTop: '0.5rem' }}>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleEditMode();
                                }}
                                style={{
                                    fontSize: '0.85rem',
                                    color: editMode ? 'var(--color-red)' : 'var(--color-secondary)',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    opacity: editMode ? 1 : 0.4,
                                    fontWeight: '600'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '1'}
                                onMouseLeave={(e) => e.target.style.opacity = editMode ? 1 : 0.4}
                            >
                                {editMode ? 'Quitter le mode édition' : 'Edit Inline'}
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </section>
    );
};

export default Contact;
