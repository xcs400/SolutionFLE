import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
    {
        id: 1,
        name: 'Maria Garcia',
        country: 'Espagne',
        level: 'Débutante -> Intermédiaire',
        text: "Aline est une professeure exceptionnelle ! Ses cours sont structurés, dynamiques et adaptés à mon rythme. En 6 mois, j'ai progressé bien plus que je ne l'aurais imaginé. Je recommande vivement Solution FLE !",
        rating: 5,
    },
    {
        id: 2,
        name: 'Yuki Tanaka',
        country: 'Japon',
        level: 'Intermédiaire',
        text: "Les ateliers d'immersion culturelle sont fantastiques ! J'ai non seulement amélioré mon français, mais j'ai aussi découvert la culture française de manière authentique. Merci Aline !",
        rating: 5,
    },
    {
        id: 3,
        name: 'Hans Mueller',
        country: 'Allemagne',
        level: 'Avancé',
        text: "Professionnelle, patiente et très engagée. Aline m'a aidé à préparer mon examen DELF avec confiance. Son approche pédagogique est vraiment efficace.",
        rating: 5,
    },
    {
        id: 4,
        name: 'Sophie Chen',
        country: 'Taïwan',
        level: 'Débutante',
        text: "J'avais peur d'apprendre le français, mais Aline a rendu cela amusant et accessible. Elle explique clairement et encourage beaucoup. Je suis très satisfaite !",
        rating: 5,
    },
    {
        id: 5,
        name: 'Carlos Silva',
        country: 'Brésil',
        level: 'Intermédiaire',
        text: "Les cours particuliers sont vraiment personnalisés. Aline écoute mes besoins et ajuste son enseignement en conséquence. Excellent rapport qualité-prix !",
        rating: 5,
    },
];

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

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
        <section id="testimonials" className="section" style={{ background: 'rgba(138, 218, 241, 0.05)' }}>
            <div className="container">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2>Témoignages de mes étudiants</h2>
                    <p style={{ maxWidth: '700px', margin: '2rem auto', fontSize: '1.2rem', color: '#64748b' }}>
                        Découvrez ce que mes étudiants pensent de leur expérience d'apprentissage avec Solution FLE.
                    </p>
                </motion.div>

                <div className="testimonial-grid">
                    {getVisibleTestimonials().map((testimonial, idx) => (
                        <motion.div
                            key={`${testimonial.id}-${idx}`}
                            className="testimonial-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <div className="star-rating">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
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
                    <button onClick={prevTestimonial} className="round-btn" aria-label="Précédent">
                        <ChevronLeft size={24} />
                    </button>
                    <button onClick={nextTestimonial} className="round-btn" aria-label="Suivant">
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
