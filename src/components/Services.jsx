import React from 'react';
import {
    GraduationCap,
    MessageCircle,
    Users,
    User,
    Clock,
    MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    const { t, currentLang } = useLanguage();
    const navigate = useNavigate();
    const serviceItems = t('services.items');
    const [publishedData, setPublishedData] = React.useState(null);

    React.useEffect(() => {
        fetch(`/api/services-pages?lang=${currentLang || 'fr'}`)
            .then(res => res.json())
            .then(data => {
                setPublishedData(data);
            })
            .catch(err => {
                console.error("Error fetching services status", err);
                setPublishedData([]);
            });
    }, [currentLang]);

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
                    {publishedData === null ? (
                        <p style={{ gridColumn: '1/-1', textAlign: 'center', opacity: 0.5 }}>Chargement...</p>
                    ) : serviceItems.map((service, index) => {
                        const slug = `A${index + 1}`;
                        const apiData = publishedData.find(p => p.slug === slug);

                        // Skip if not in API (visitor mode)
                        if (!apiData) return null;

                        return (
                            <motion.div
                                key={index}
                                className="card"
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                viewport={{ once: true }}
                                style={{
                                    borderTop: `6px solid ${serviceColors[index]}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease',
                                    position: 'relative'
                                }}
                                onClick={() => navigate(`/service/${slug}`)}
                                whileHover={{ y: -10, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                            >
                                {apiData.published === false && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        background: 'rgba(239, 68, 68, 0.9)',
                                        color: 'white',
                                        padding: '0.3rem 0.8rem',
                                        borderRadius: '20px',
                                        fontSize: '0.75rem',
                                        fontWeight: '800',
                                        zIndex: 10,
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                    }}>
                                        DÉVALIDÉ
                                    </div>
                                )}
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
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Services;
