import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

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
                    <h2><EditableText tag="span" translationKey="testimonials.title">{t('testimonials.title')}</EditableText></h2>
                    <p style={{ maxWidth: '700px', margin: '2rem auto', fontSize: '1.2rem', color: '#64748b' }}>
                        <EditableText tag="span" translationKey="testimonials.subtitle">{t('testimonials.subtitle')}</EditableText>
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
                                "<EditableText tag="span" translationKey={`testimonials.items.${(currentIndex + idx) % testimonials.length}.text`}>{testimonial.text}</EditableText>"
                            </p>

                            <div className="testimonial-author">
                                <p className="author-name">
                                    <EditableText tag="span" translationKey={`testimonials.items.${(currentIndex + idx) % testimonials.length}.name`}>{testimonial.name}</EditableText>
                                </p>
                                <p className="author-meta">
                                    <EditableText tag="span" translationKey={`testimonials.items.${(currentIndex + idx) % testimonials.length}.country`}>{testimonial.country}</EditableText> • <EditableText tag="span" translationKey={`testimonials.items.${(currentIndex + idx) % testimonials.length}.level`}>{testimonial.level}</EditableText>
                                </p>
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
