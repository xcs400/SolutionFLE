import React from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const Pronunciation = () => {
    const { t } = useLanguage();

    const openSpellTool = () => {
        window.open('spell.html', 'spell');
    };

    return (
        <section id="pronunciation" className="section" style={{ background: '#ffffff' }}>
            <div className="container">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <h2 style={{
                        fontSize: '2.5rem',
                        color: 'var(--color-primary)',
                        marginBottom: '1.5rem',
                        fontWeight: 800
                    }}>
                        <Volume2 style={{ display: 'inline-block', marginRight: '0.8rem', verticalAlign: 'top' }} />
                        <EditableText tag="span" translationKey="pronunciation.title">
                            🌐 Outil de prononciation
                        </EditableText>
                    </h2>

                    <p style={{
                        fontSize: '1.1rem',
                        color: 'var(--color-text)',
                        marginBottom: '2rem',
                        lineHeight: 1.8,
                        maxWidth: '700px',
                        margin: '0 auto 2rem'
                    }}>
                        <EditableText tag="span" translationKey="pronunciation.description">
                            Améliorez votre prononciation français avec notre outil interactif. Testez votre prononciation et recevez des retours instantanés.
                        </EditableText>
                    </p>

                    <button
                        onClick={openSpellTool}
                        className="btn"
                        style={{
                            background: '#ffffff',
                            backgroundImage: 'linear-gradient(#fff, #fff), linear-gradient(to right, #002395 33%, #ffffff 33.33%, #ffffff 66.66%, #ed2939 66.66%)',
                            backgroundOrigin: 'border-box',
                            backgroundClip: 'padding-box, border-box',
                            border: '5px solid transparent',
                            color: 'var(--color-primary)',
                            padding: '1.4rem 5rem',
                            fontSize: '1.15rem',
                            fontWeight: 'bold',
                            borderRadius: '100px',
                            cursor: 'pointer',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            boxShadow: '0 10px 30px rgba(0, 35, 149, 0.12)'
                        }}
                    >
                        <EditableText tag="span" translationKey="pronunciation.cta">
                            🎤 Accéder à l'outil
                        </EditableText>
                    </button>
                </motion.div>
            </div>
        </section>
    );
};

export default Pronunciation;
