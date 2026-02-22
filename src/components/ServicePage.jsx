import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { Pencil, Save, X } from 'lucide-react';

// Simple Markdown parser (reused and slightly improved)
function parseMarkdown(text) {
    if (!text) return '';
    const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = (s) => {
        if (!s) return '';
        s = s.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px"/>');
        s = s.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
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
            continue;
        }
        if (inList) { out += '</ul>'; inList = false; }
        out += `<p>${inline(escapeHtml(line))}</p>`;
    }
    if (inList) out += '</ul>';
    return out;
}

const ServicePage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [page, setPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [saving, setSaving] = useState(false);

    const isAdmin = () => !!Cookies.get('ident');

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/services-pages/${slug}`);
                if (!res.ok) throw new Error('Page non trouvée');
                const data = await res.json();
                setPage(data);
                setEditContent(data.body);
                setEditTitle(data.title);
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        load();
        window.scrollTo(0, 0);
    }, [slug]);

    // Handler pour accéder à l'éditeur dédié aux services
    const handleEdit = () => {
        const token = Cookies.get('ident');
        if (!token) {
            alert('Accès refusé. Veuillez vous authentifier via le menu Admin.');
            return;
        }
        // Utilisation de l'éditeur dédié
        window.location.href = `/service_editor.html?edit=${slug}`;
    };

    const handleBack = () => {
        navigate('/#services');
        // Petit délai pour laisser le temps au hash d'être pris en compte
        setTimeout(() => {
            const el = document.getElementById('services');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Chargement...</div>;
    if (!page) return <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <p>Oups, cette page n'existe pas.</p>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Retour</button>
    </div>;

    return (
        <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ minHeight: '100vh', padding: '100px 1rem 4rem', background: '#ffffff' }}
        >
            <article className="card" style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', borderTop: '8px solid var(--color-strong-blue)' }}>
                <button
                    onClick={handleBack}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '2rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    ← Retour aux prestations
                </button>

                {isAdmin() && (
                    <button
                        onClick={handleEdit}
                        style={{ position: 'absolute', top: '2rem', right: '2rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                        <Pencil size={18} />
                    </button>
                )}

                {page.published === false && isAdmin() && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '0.8rem 1.2rem',
                        borderRadius: '10px',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontWeight: '700',
                        fontSize: '0.9rem'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        CETTE PRESTATION EST ACTUELLEMENT DÉVALIDÉ (MASQUÉE POUR LES VISITEURS)
                    </div>
                )}

                <>
                    <h1 style={{ fontSize: '3rem', color: 'var(--color-primary)', marginBottom: '2rem' }}>{page.title}</h1>
                    <div
                        className="blog-content"
                        style={{ color: 'var(--color-text)', lineHeight: 1.8, fontSize: '1.1rem' }}
                        dangerouslySetInnerHTML={{ __html: parseMarkdown(page.body) }}
                    />
                    <div style={{ marginTop: '4rem', padding: '2rem', background: 'var(--color-bg)', borderRadius: '16px', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Cette formation vous intéresse ?</h3>
                        <button onClick={() => navigate('/#contact')} className="btn btn-primary">Me contacter pour en savoir plus</button>
                    </div>
                </>
            </article>
        </motion.main>
    );
};

export default ServicePage;
