import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
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
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

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

    // Restore scroll position after returning from a post
    useEffect(() => {
        const savedScroll = localStorage.getItem('blog-home-scroll');
        if (savedScroll && !loading && posts.length > 0) {
            // Wait slightly for components to re-render
            setTimeout(() => {
                window.scrollTo({
                    top: parseInt(savedScroll, 10),
                    behavior: 'instant'
                });
                localStorage.removeItem('blog-home-scroll');
            }, 100);
        }
    }, [loading, posts]);

    const saveScroll = (e, slug) => {
        if (e) e.preventDefault();
        localStorage.setItem('blog-home-scroll', window.scrollY.toString());
        navigate(`/blog/${slug}`);
    };

    const blogColors = [
        'var(--color-secondary)',
        'var(--color-green)',
        'var(--color-red)',
        'var(--color-yellow)',
        'var(--color-strong-blue)'
    ];

    return (
        <section id="blog" className="section" style={{ background: '#ffffff' }}>
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '4rem' }}
                >
                    <h2>
                        <EditableText tag="span" translationKey="blog.title">
                            {t('blog.title')}
                        </EditableText>
                    </h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', marginTop: '1rem' }}>
                        <EditableText tag="span" translationKey="blog.subtitle">
                            {t('blog.subtitle')}
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
                                className="card"
                                style={{
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    padding: 0,
                                    borderTop: `6px solid ${blogColors[idx % blogColors.length]}`
                                }}
                                onClick={() => saveScroll(null, post.slug)}
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
                                        onClick={(e) => saveScroll(e, post.slug)}
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

                {Cookies.get('ident') && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        style={{ textAlign: 'center', marginTop: '3rem' }}
                    >
                        <a
                            href="#"
                            onClick={handleAdminAccess}
                            title="Accéder à l'éditeur"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.1)',
                                color: 'var(--color-primary)',
                                borderRadius: '50%',
                                textDecoration: 'none',
                                transition: 'all 0.3s',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--color-primary)';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                                e.currentTarget.style.color = 'var(--color-primary)';
                            }}
                        >
                            <Pencil size={18} />
                        </a>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default Blog;
