import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const About = () => {
    const { t } = useLanguage();
    const highlights = t('about.highlights');

    return (
        <section id="about" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    style={{ position: 'relative' }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '-20px',
                        left: '-20px',
                        width: '100px',
                        height: '100px',
                        background: 'var(--color-yellow)',
                        zIndex: 0,
                        borderRadius: '20px',
                        opacity: 0.2
                    }}></div>
                    <img
                        src="./aline2.jpeg"
                        alt="Aline Gamblin"
                        style={{
                            width: '100%',
                            borderRadius: '30px',
                            boxShadow: '20px 20px 60px rgba(0,0,0,0.1)',
                            position: 'relative',
                            zIndex: 1
                        }}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                >
                    <h2 style={{ textAlign: 'left', marginBottom: '2rem' }}>
                        <EditableText tag="span" translationKey="about.title">{t('about.title')}</EditableText>
                    </h2>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                        <EditableText tag="span" translationKey="about.name">{t('about.name')}</EditableText>
                    </h3>
                    <p style={{ color: 'var(--color-secondary)', fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                        <EditableText tag="span" translationKey="about.role">{t('about.role')}</EditableText>
                    </p>
                    <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                        <EditableText tag="span" translationKey="about.bio">{t('about.bio')}</EditableText>
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        {highlights.map((text, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    background: 'var(--color-yellow)'
                                }}></div>
                                <span style={{ fontWeight: '500' }}>
                                    <EditableText tag="span" translationKey={`about.highlights.${idx}`}>
                                        {text}
                                    </EditableText>
                                </span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default About;
