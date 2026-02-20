import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const { t } = useLanguage();

    const testimonials = t('testimonials.items');

    const nextTestimonial = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const getVisibleTestimonials = () => {
        const visible = [];
        for (let i = 0; i < 3; i++) {
            visible.push(testimonials[(currentIndex + i) % testimonials.length]);
        }
        return visible;
    };

    return (
        <section id="testimonials" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>{t('testimonials.title')}</h2>
                    <p style={{ maxWidth: '700px', margin: '2rem auto', fontSize: '1.2rem', color: '#64748b' }}>
                        {t('testimonials.subtitle')}
                    </p>
                </motion.div>

                <div className="testimonial-grid">
                    {getVisibleTestimonials().map((testimonial, idx) => (
                        <motion.div
                            key={`${testimonial.name}-${idx}`}
                            className="testimonial-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <div className="star-rating">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} size={18} fill="currentColor" />
                                ))}
                            </div>

                            <p className="testimonial-text">
                                "{testimonial.text}"
                            </p>

                            <div className="testimonial-author">
                                <p className="author-name">{testimonial.name}</p>
                                <p className="author-meta">{testimonial.country} • {testimonial.level}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="slider-controls">
                    <button onClick={prevTestimonial} className="round-btn" aria-label={t('testimonials.prev')}>
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextTestimonial} className="round-btn" aria-label={t('testimonials.next')}>
                        <ChevronRight size={24} />
                    </button>
                </div>

                <div className="pagination-dots">
                    {testimonials.map((_, idx) => (
                        <div
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`dot ${idx === currentIndex ? 'active' : ''}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
