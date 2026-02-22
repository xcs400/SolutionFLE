import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAutoPlay, setIsAutoPlay] = useState(true);
    const { t } = useLanguage();

    const testimonials = t('testimonials.items');

    useEffect(() => {
        let interval;
        if (isAutoPlay) {
            interval = setInterval(() => {
                nextTestimonial();
            }, 3500);
        }
        return () => clearInterval(interval);
    }, [isAutoPlay, currentIndex]);

    const nextTestimonial = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const current = testimonials[currentIndex];

    return (
        <section id="testimonials" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2><EditableText tag="span" translationKey="testimonials.title">{t('testimonials.title')}</EditableText></h2>
                    <p style={{ maxWidth: '700px', margin: '2rem auto', fontSize: '1.2rem', color: '#64748b' }}>
                        <EditableText tag="span" translationKey="testimonials.subtitle">{t('testimonials.subtitle')}</EditableText>
                    </p>
                </motion.div>

                <div style={{ position: 'relative', maxWidth: '800px', margin: '4rem auto 2rem' }}>
                    <AnimatePresence mode='wait'>
                        <motion.div
                            key={currentIndex}
                            className="testimonial-card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            style={{ margin: '0 auto', width: '100%' }}
                        >
                            <div className="star-rating" style={{ justifyContent: 'center' }}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={20} fill="currentColor" />
                                ))}
                            </div>

                            <p className="testimonial-text" style={{ textAlign: 'center', fontSize: '1.2rem' }}>
                                "<EditableText tag="span" translationKey={`testimonials.items.${currentIndex}.text`}>{current.text}</EditableText>"
                            </p>

                            <div className="testimonial-author" style={{ textAlign: 'center' }}>
                                <p className="author-name">
                                    <EditableText tag="span" translationKey={`testimonials.items.${currentIndex}.name`}>{current.name}</EditableText>
                                </p>
                                <p className="author-meta">
                                    <EditableText tag="span" translationKey={`testimonials.items.${currentIndex}.country`}>{current.country}</EditableText> • <EditableText tag="span" translationKey={`testimonials.items.${currentIndex}.level`}>{current.level}</EditableText>
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Navigation Arrows */}
                    <button
                        onClick={prevTestimonial}
                        className="round-btn"
                        style={{ position: 'absolute', left: '-60px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={nextTestimonial}
                        className="round-btn"
                        style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', display: 'flex' }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="pagination-dots" style={{ marginBottom: '3rem' }}>
                    {testimonials.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`dot ${idx === currentIndex ? 'active' : ''}`}
                        />
                    ))}
                </div>

                <div className="text-center" style={{ marginTop: '2rem' }}>
                    <button
                        onClick={() => setIsAutoPlay(!isAutoPlay)}
                        style={{
                            background: isAutoPlay ? 'rgba(11, 24, 109, 0.05)' : 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '30px',
                            color: isAutoPlay ? 'var(--color-primary)' : '#ef4444',
                            fontWeight: '700',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isAutoPlay ? (
                            <><Pause size={16} /> <EditableText tag="span" translationKey="testimonials.pause_auto">{t('testimonials.pause_auto') || 'Désactiver la rotation automatique'}</EditableText></>
                        ) : (
                            <><Play size={16} /> <EditableText tag="span" translationKey="testimonials.play_auto">{t('testimonials.play_auto') || 'Activer la rotation automatique'}</EditableText></>
                        )}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
