import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';
import EditableText from './EditableText';

/**
 * Simple Markdown parser for blog posts
 */
function parseMarkdown(text) {
    return text
        .split('\n')
        .map((line, i) => {
            if (line.startsWith('# ')) {
                return `<h1>${line.substring(2)}</h1>`;
            } else if (line.startsWith('## ')) {
                return `<h2>${line.substring(3)}</h2>`;
            } else if (line.startsWith('### ')) {
                return `<h3>${line.substring(4)}</h3>`;
            } else if (line.startsWith('- ')) {
                return `<li>${line.substring(2)}</li>`;
            } else if (line.trim()) {
                return `<p>${line}</p>`;
            }
            return '';
        })
        .join('');
}

const Blog = () => {
    const { t } = useLanguage();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Authenticate before accessing admin panel
    const handleAdminAccess = (e) => {
        e.preventDefault();
        
        const token = Cookies.get('admin-token');
        if (!token) {
            alert('Accès refusé. Veuillez vous authentifier via le menu Admin.');
            return;
        }
        
        window.location.href = '/admin';
    };

    useEffect(() => {
        // Load blog posts from /api/blog
        const loadPosts = async () => {
            try {
                const response = await fetch('/api/blog');
                if (response.ok) {
                    const data = await response.json();
                    setPosts(data);
                }
            } catch (err) {
                console.log('Blog posts not available yet');
            }
            setLoading(false);
        };
        loadPosts();
    }, []);

    return (
        <section id="blog" className="section" style={{ background: 'var(--color-bg)' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '4rem' }}
                >
                    <h2>
                        <EditableText tag="span" translationKey="blog.title">
                            Blog & Actualités
                        </EditableText>
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', marginTop: '1rem' }}>
                        <EditableText tag="span" translationKey="blog.subtitle">
                            Conseils, ressources et actualités FLE
                        </EditableText>
                    </p>
                </motion.div>

                {loading ? (
                    <p style={{ textAlign: 'center', color: '#64748b' }}>Chargement des articles...</p>
                ) : posts.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        style={{
                            textAlign: 'center',
                            padding: '3rem 2rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '15px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                            Le blog sera bientôt rempli d'articles intéressants ! 📝
                        </p>
                        <a
                            href="#"
                            onClick={handleAdminAccess}
                            style={{
                                display: 'inline-block',
                                marginTop: '1.5rem',
                                padding: '0.8rem 1.5rem',
                                background: 'var(--color-primary)',
                                color: 'white',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                        >
                            Ajouter un article
                        </a>
                    </motion.div>
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                            gap: '2rem'
                        }}
                    >
                        {posts.map((post, idx) => (
                            <motion.article
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: '15px',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-5px)';
                                    e.currentTarget.style.boxShadow = '0 10px 30px rgba(91, 141, 239, 0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {post.image && (
                                    <img
                                        src={post.image}
                                        alt={post.title}
                                        style={{
                                            width: '100%',
                                            height: '200px',
                                            objectFit: 'cover'
                                        }}
                                    />
                                )}
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        {post.author && (
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                Par <strong>{post.author}</strong>
                                            </span>
                                        )}
                                        {post.date && (
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                {new Date(post.date).toLocaleDateString('fr-FR')}
                                            </span>
                                        )}
                                    </div>
                                    <h3 style={{ margin: '0.5rem 0', color: 'var(--color-primary)' }}>
                                        {post.title}
                                    </h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.5rem' }}>
                                        {post.description}
                                    </p>
                                    <a
                                        href={`/blog/${post.slug}`}
                                        style={{
                                            marginTop: '1rem',
                                            display: 'inline-block',
                                            color: 'var(--color-primary)',
                                            textDecoration: 'none',
                                            fontWeight: '600',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        Lire la suite →
                                    </a>
                                </div>
                            </motion.article>
                        ))}
                    </div>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginTop: '3rem' }}
                >
                    <a
                        href="#"
                        onClick={handleAdminAccess}
                        style={{
                            display: 'inline-block',
                            padding: '1rem 2rem',
                            background: 'var(--color-secondary)',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        Accéder à l'éditeur TinaCMS
                    </a>
                </motion.div>
            </div>
        </section>
    );
};

export default Blog;
