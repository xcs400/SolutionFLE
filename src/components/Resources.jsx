import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { ExternalLink, BookOpen, Clock, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

const Resources = () => {
    const [feeds, setFeeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { t, language } = useLanguage();

    // Authenticate before accessing admin panel
    const handleAdminAccess = (e) => {
        e.preventDefault();

        const token = Cookies.get('ident');
        if (!token) {
            alert('Accès refusé. Veuillez vous authentifier via le menu Admin.');
            return;
        }

        window.location.href = '/admin';
    };

    useEffect(() => {
        const fetchFeeds = async () => {
            try {
                const response = await fetch(`${window.location.origin}/api/rss`);
                if (!response.ok) throw new Error("Erreur de récupération");
                const data = await response.json();
                setFeeds(data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(t('resources.error'));
                setLoading(false);
            }
        };

        fetchFeeds();
    }, []);

    return (
        <section id="resources" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container">
                <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                >
                    <h2><EditableText tag="span" translationKey="resources.title">{t('resources.title')}</EditableText></h2>
                    <p style={{ maxWidth: '750px', margin: '2rem auto', fontSize: '1.2rem', color: '#64748b' }}>
                        <EditableText tag="span" translationKey="resources.subtitle">{t('resources.subtitle')}</EditableText>
                    </p>


                </motion.div>

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : error ? (
                    <div className="status-box status-error" style={{ maxWidth: '600px', margin: '3rem auto' }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                ) : (
                    <div className="resources-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '3rem', marginTop: '4rem' }}>
                        {feeds.map((feed, idx) => (
                            <motion.div
                                key={idx}
                                className="card"
                                style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column' }}
                                initial={{ opacity: 0, scale: 0.95 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                viewport={{ once: true }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem', color: 'var(--color-primary)' }}>{feed.source}</h3>
                                        <span style={{
                                            background: 'var(--color-light-blue)',
                                            color: 'var(--color-dark-blue)',
                                            padding: '0.2rem 0.8rem',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            fontWeight: '700'
                                        }}>
                                            {feed.level}
                                        </span>
                                    </div>
                                    <BookOpen size={24} style={{ color: 'var(--color-secondary)', opacity: 0.5 }} />
                                </div>

                                <div className="feed-items" style={{ flexGrow: 1 }}>
                                    {feed.error ? (
                                        <p style={{ fontSize: '0.9rem', color: '#94a3b8', fontStyle: 'italic' }}>{t('resources.feed_unavailable')}</p>
                                    ) : (
                                        feed.items.map((item, i) => (
                                            <a
                                                key={i}
                                                href={item.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="feed-item"
                                                style={{
                                                    display: 'block',
                                                    padding: '1rem 0',
                                                    textDecoration: 'none',
                                                    borderBottom: i === feed.items.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.05)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <h4 style={{ fontSize: '1rem', color: 'var(--color-text)', marginBottom: '0.3rem', lineHeight: '1.4' }}>{item.title}</h4>
                                                {item.content && (
                                                    <p style={{
                                                        fontSize: '0.85rem',
                                                        color: '#64748b',
                                                        marginBottom: '0.8rem',
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: '2',
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        lineHeight: '1.5'
                                                    }}>
                                                        {item.content.replace(/<[^>]*>/g, '')}
                                                    </p>
                                                )}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        <Clock size={12} />
                                                        {new Date(item.pubDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-secondary)' }}>
                                                        {t('resources.read_more')} <ExternalLink size={12} />
                                                    </span>
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Resources;
