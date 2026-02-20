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
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const serviceIcons = [
    <GraduationCap />,
    <MessageCircle />,
    <Users />,
    <User />,
    <Clock />,
    <MapPin />
];

const serviceColors = [
    'var(--color-dark-blue)',
    'var(--color-strong-blue)',
    'var(--color-green)',
    'var(--color-red)',
    'var(--color-yellow)',
    'var(--color-sand)',
];

const Services = () => {
    const { t } = useLanguage();
    const serviceItems = t('services.items');

    return (
        <section id="services" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container">
                <motion.h2
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                >
                    <EditableText tag="span" translationKey="services.title">{t('services.title')}</EditableText>
                </motion.h2>

                <div className="service-grid">
                    {serviceItems.map((service, index) => (
                        <motion.div
                            key={index}
                            className="card"
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            viewport={{ once: true }}
                            style={{ borderTop: `6px solid ${serviceColors[index]}` }}
                        >
                            <div className="feature-icon" style={{ background: `${serviceColors[index]}15`, color: serviceColors[index] }}>
                                {serviceIcons[index]}
                            </div>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--color-primary)' }}>
                                <EditableText tag="span" translationKey={`services.items.${index}.title`}>{service.title}</EditableText>
                            </h3>
                            <p style={{ flexGrow: 1, marginBottom: '1.5rem', color: '#64748b' }}>
                                <EditableText tag="span" translationKey={`services.items.${index}.desc`}>{service.desc}</EditableText>
                            </p>
                            <div className="tag-container" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {service.tags.map((tag, i) => (
                                    <span key={i} className="tag" style={{ color: 'var(--color-primary)', fontWeight: '500' }}>
                                        <EditableText tag="span" translationKey={`services.items.${index}.tags.${i}`}>{tag}</EditableText>
                                    </span>
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
