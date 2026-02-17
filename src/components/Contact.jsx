import React from 'react';
import { Mail, Phone, MapPin, Linkedin } from 'lucide-react';
import { motion } from 'framer-motion';
import ContactForm from './ContactForm';
import { useLanguage } from '../context/LanguageContext';

const Contact = () => {
    const { t } = useLanguage();

    return (
        <section id="contact" className="section" style={{ background: 'rgba(11, 24, 109, 0.02)' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '5rem' }}>
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <h2 style={{ textAlign: 'left' }}>{t('contact.title')}</h2>
                        <p
                            style={{ fontSize: '1.2rem', marginBottom: '3rem', color: '#64748b' }}
                            dangerouslySetInnerHTML={{ __html: t('contact.subtitle_html') }}
                        />

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

            <footer style={{ marginTop: '8rem' }}>
                <div className="container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
                        <div>
                            <img src="./LogoOfficiel.png" alt="Logo" style={{ height: '50px', filter: 'brightness(0) invert(1)' }} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p>&copy; {new Date().getFullYear()} {t('footer.copyright')}</p>
                            <p style={{ fontSize: '0.8rem' }}>{t('footer.siret')}</p>
                        </div>
                    </div>
                </div>
            </footer>
        </section>
    );
};

export default Contact;
