import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const Hero = () => {
    const { t, editMode, updateTranslation } = useLanguage();

    return (
        <section id="home" className="hero" style={{ position: 'relative', overflow: 'hidden' }}>
            <div className="hero-content" style={{ position: 'relative', zIndex: 10 }}>

                <motion.h1
                    className="hero-title"
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                >
                    <EditableText tag="span" translationKey="hero.title_line1">{t('hero.title_line1')}</EditableText><br />
                    <span style={{ color: 'var(--color-secondary)' }}>
                        <EditableText tag="span" translationKey="hero.title_line2">{t('hero.title_line2')}</EditableText>
                    </span>
                </motion.h1>

                <motion.p
                    className="hero-subtitle"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    style={{ fontWeight: '400', maxWidth: '700px', margin: '2rem auto 3rem', fontSize: '1.4rem' }}
                >
                    <EditableText tag="span" translationKey="hero.subtitle_html" isHtml={true}>
                        {t('hero.subtitle_html')}
                    </EditableText>
                </motion.p>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                    style={{ position: 'relative' }}
                >
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <a href={t('hero.cta_link') || "#services"} className="btn">
                            <EditableText tag="span" translationKey="hero.cta">{t('hero.cta')}</EditableText>
                        </a>
                        {editMode && (
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    const newLink = prompt('Nouveau lien pour le bouton CTA :', t('hero.cta_link') || "#services");
                                    if (newLink !== null) updateTranslation('hero.cta_link', newLink);
                                }}
                                style={{
                                    position: 'absolute',
                                    top: '-15px',
                                    right: '-15px',
                                    background: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                    zIndex: 10
                                }}
                                title="Modifier le lien"
                            >
                                🔗
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* Animated Showcase - Cycling Images Sequential */}
                <div style={{ marginTop: '4rem', position: 'relative', height: '180px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    {[
                        { src: './Firefly1.png', delay: 0 },
                        { src: './Firefly2.png', delay: 4 },
                        { src: './tableau.png', delay: 8 }
                    ].map((img, index) => (
                        <motion.div
                            key={index}
                            initial={{ x: -250, opacity: 0 }}
                            animate={{
                                x: [-250, 0, 0, 250],
                                opacity: [0, 1, 1, 0]
                            }}
                            transition={{
                                duration: 4,
                                times: [0, 0.2, 0.8, 1],
                                repeat: Infinity,
                                repeatDelay: 8, // Total cycle 12s
                                delay: img.delay,
                                ease: "easeInOut"
                            }}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                maxWidth: '280px'
                            }}
                        >
                            <div
                                style={{
                                    borderRadius: '15px',
                                    overflow: 'hidden',
                                    boxShadow: '0 15px 35px rgba(11, 24, 109, 0.15)',
                                    border: '5px solid white',
                                    transform: index % 2 === 0 ? 'rotate(-2deg)' : 'rotate(2deg)'
                                }}
                            >
                                <img
                                    src={img.src}
                                    alt={`${t('hero.image_alt')} ${index + 1}`}
                                    style={{ width: '100%', height: 'auto', display: 'block' }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Clean Background - no more masking squares */}
        </section>
    );
};

export default Hero;
