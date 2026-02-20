import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function parseMarkdown(text) {
    if (!text) return '';
    return text
        .split('\n')
        .map(line => {
            if (line.startsWith('# '))   return `<h1>${line.substring(2)}</h1>`;
            if (line.startsWith('## '))  return `<h2>${line.substring(3)}</h2>`;
            if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
            if (line.startsWith('- '))   return `<li>${line.substring(2)}</li>`;
            if (line.trim())             return `<p>${line}</p>`;
            return '';
        })
        .join('');
}

const BlogPost = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/blog/${slug}`);
                if (!res.ok) throw new Error('Article non trouvé');
                const data = await res.json();
                setPost(data);
            } catch (err) {
                setError(err.message);
            }
            setLoading(false);
        };
        load();
    }, [slug]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#64748b' }}>Chargement...</p>
        </div>
    );

    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <p style={{ color: '#f87171' }}>❌ {error}</p>
            <button onClick={() => navigate('/#blog')} style={{ padding: '0.8rem 1.5rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                ← Retour au blog
            </button>
        </div>
    );

    return (
        <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ minHeight: '100vh', padding: '6rem 1rem 4rem', background: 'var(--color-bg)' }}
        >
            <article style={{ maxWidth: '800px', margin: '0 auto' }}>

                {/* Bouton retour */}
                <button
                    onClick={() => navigate('/#blog')}
                    style={{
                        background: 'none', border: 'none', color: 'var(--color-primary)',
                        cursor: 'pointer', fontWeight: '600', fontSize: '1rem',
                        marginBottom: '2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    ← Retour au blog
                </button>

                {/* Image */}
                {post.image && (
                    <img
                        src={post.image}
                        alt={post.title}
                        style={{ width: '100%', height: '350px', objectFit: 'cover', borderRadius: '15px', marginBottom: '2rem' }}
                    />
                )}

                {/* Méta */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                    {post.author && <span>Par <strong>{post.author}</strong></span>}
                    {post.date && <span>{new Date(post.date).toLocaleDateString('fr-FR')}</span>}
                </div>

                {/* Titre */}
                <h1 style={{ fontSize: '2.2rem', color: 'var(--color-primary)', marginBottom: '1rem', lineHeight: 1.3 }}>
                    {post.title}
                </h1>

                {/* Description */}
                {post.description && (
                    <p style={{ fontSize: '1.15rem', color: '#94a3b8', marginBottom: '2rem', fontStyle: 'italic' }}>
                        {post.description}
                    </p>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }} />

                {/* Contenu Markdown */}
                <div
                    className="blog-content"
                    style={{ color: 'var(--color-text)', lineHeight: 1.8, fontSize: '1.05rem' }}
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(post.body) }}
                />

            </article>
        </motion.main>
    );
};

export default BlogPost;
