import React from 'react';
import {
    GraduationCap,
    MessageCircle,
    Users,
    User,
    Clock,
    MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';

const Services = () => {
    const services = [
        {
            icon: <GraduationCap />,
            title: "Tous Niveaux",
            desc: "Accompagnement complet de débutant à avancé avec une méthode structurée.",
            color: 'var(--color-dark-blue)',
            tags: ["Débutant \u2192 Avancé", "Soutien"]
        },
        {
            icon: <MessageCircle />,
            title: "Conversation",
            desc: "Développez votre aisance orale et votre confiance à travers des échanges thématiques.",
            color: 'var(--color-strong-blue)',
            tags: ["Ateliers", "Phonétique"]
        },
        {
            icon: <Users />,
            title: "Formation Groupe",
            desc: "Une dynamique collective pour apprendre ensemble dans la convivialité.",
            color: 'var(--color-green)',
            tags: ["Etudiants", "Expatriés"]
        },
        {
            icon: <User />,
            title: "Cours Particuliers",
            desc: "Focus total sur vos besoins spécifiques pour une progression accélérée.",
            color: 'var(--color-red)',
            tags: ["Individuel", "Sur-mesure"]
        },
        {
            icon: <Clock />,
            title: "Flexibilité",
            desc: "Des séances dont la durée et le rythme s'adaptent à votre emploi du temps.",
            color: 'var(--color-yellow)',
            tags: ["À la carte", "Rapide"]
        },
        {
            icon: <MapPin />,
            title: "Immersion",
            desc: "Sorties et ateliers pratiques pour pratiquer le français en situation réelle.",
            color: 'var(--color-sand)',
            tags: ["Visites", "Quotidien"]
        }
    ];

    return (
        <section id="services" className="section bg-white">
            <div className="container">
                <motion.h2
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    Mes Prestations
                </motion.h2>

                <div className="service-grid">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            className="card"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                            style={{ borderTop: `6px solid ${service.color}` }}
                        >
                            <div className="feature-icon" style={{ background: `${service.color}15`, color: service.color }}>
                                {service.icon}
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>{service.title}</h3>
                            <p style={{ flexGrow: 1, marginBottom: '1.5rem', color: '#64748b' }}>{service.desc}</p>
                            <div className="tag-container">
                                {service.tags.map((tag, i) => (
                                    <span key={i} className="tag" style={{ borderLeft: `3px solid ${service.color}` }}>{tag}</span>
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;
