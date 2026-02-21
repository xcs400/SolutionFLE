import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function parseMarkdown(text) {
    if (!text) return '';

    const escapeHtml = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const inline = (s) => {
        if (!s) return '';
        // images
        s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px"/>');
        // links
        s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
        // bold
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // italic
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        return s;
    };

    const lines = text.split('\n');
    let out = '';
    let inList = false;

    for (let raw of lines) {
        const line = raw.replace('\r', '');
        if (line.startsWith('# ')) {
            if (inList) { out += '</ul>'; inList = false; }
            out += `<h1>${inline(escapeHtml(line.substring(2)))}</h1>`;
            continue;
        }
        if (line.startsWith('## ')) {
            if (inList) { out += '</ul>'; inList = false; }
            out += `<h2>${inline(escapeHtml(line.substring(3)))}</h2>`;
            continue;
        }
        if (line.startsWith('### ')) {
            if (inList) { out += '</ul>'; inList = false; }
            out += `<h3>${inline(escapeHtml(line.substring(4)))}</h3>`;
            continue;
        }
        if (line.startsWith('- ')) {
            if (!inList) { out += '<ul>'; inList = true; }
            out += `<li>${inline(escapeHtml(line.substring(2)))}</li>`;
            continue;
        }
        if (!line.trim()) {
            if (inList) { out += '</ul>'; inList = false; }
            out += '';
            continue;
        }
        // paragraph
        if (inList) { out += '</ul>'; inList = false; }
        out += `<p>${inline(escapeHtml(line))}</p>`;
    }

    if (inList) out += '</ul>';
    return out;
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

    // Handler pour accéder à l'éditeur (vérifie juste le cookie admin)
    const handleEdit = () => {
        const token = Cookies.get('admin-token');
        if (!token) {
            alert('Accès refusé. Veuillez vous authentifier via le menu Admin.');
            return;
        }
        
        window.location.href = `/admin?edit=${slug}`;
    };

    // Scroll vers la section blog après retour
    const handleBackToBlog = () => {
        // Sauvegarde la position de scroll
        localStorage.setItem('blog-scroll', window.scrollY);
        navigate('/#blog');
    };

    useEffect(() => {
        // Si on revient sur la page blog, restaure la position
        const scroll = localStorage.getItem('blog-scroll');
        if (scroll && window.location.hash === '#blog') {
            setTimeout(() => {
                window.scrollTo(0, parseInt(scroll, 10));
                localStorage.removeItem('blog-scroll');
            }, 150);
        }
    }, []);

    return (
        <motion.main
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ minHeight: '100vh', padding: '6rem 1rem 4rem', background: 'var(--color-bg)' }}
        >
            <article style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
                {/* Bouton retour */}
                <button
                    onClick={handleBackToBlog}
                    style={{
                        background: 'none', border: 'none', color: 'var(--color-primary)',
                        cursor: 'pointer', fontWeight: '600', fontSize: '1rem',
                        marginBottom: '2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                >
                    ← Retour au blog
                </button>

                {/* Bouton éditeur (toujours visible, coin haut droit) */}
                <button
                    onClick={handleEdit}
                    title="Accéder à l'éditeur CMS"
                    style={{
                        position: 'absolute', top: 0, right: 0, margin: '1.5rem 0 0 0', background: 'var(--color-primary)',
                        color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(91,141,239,0.08)', zIndex: 2
                    }}
                >
                    <span role="img" aria-label="éditer">✏️</span>
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
