import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Parser from 'rss-parser';
import crypto from 'crypto';
import multer from 'multer';
import AdmZip from 'adm-zip';

dotenv.config();

const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
    timeout: 10000
});

const RSS_SOURCES = [
    //   { name: 'RFI - Journal en Français Facile', level: 'A2-B1', url: 'https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast' },
    { name: 'TV5MONDE - Apprendre le Français', level: 'A1-B2', url: 'https://apprendre.tv5monde.com/fr/rss' }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nonces = new Set();
const authenticatedSessions = new Map();

function simpleMD5(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}

// ─── Parse un fichier .md → { metadata, body } ──────────────────────────────
// Robuste : gère \n (Unix) et \r\n (Windows)
function parseMDFile(filepath) {
    const raw = fs.readFileSync(filepath, 'utf-8');
    // Normalise les fins de ligne Windows en Unix
    const content = raw.replace(/\r\n/g, '\n');

    const metadata = {
        slug: path.basename(filepath, '.md'),
        title: 'Untitled',
        author: 'Unknown',
        date: new Date().toISOString(),
        description: '',
        image: '/logo_Solution.jpg',
        published: true,
        body: ''
    };

    const fm = content.match(/^---\n([\s\S]*?)\n---/);
    if (fm) {
        fm[1].split('\n').forEach(line => {
            const [key, ...vals] = line.split(':');
            if (key && vals.length) {
                const k = key.trim();
                const v = vals.join(':').trim().replace(/^["']|["']$/g, '');
                if (k === 'published') {
                    metadata.published = v === 'true';
                } else {
                    metadata[k] = v;
                }
            }
        });
        // Tout ce qui est après le bloc ---...---
        metadata.body = content.slice(fm[0].length).trim();
    } else {
        // Pas de frontmatter : tout le fichier est le body
        metadata.body = content.trim();
    }

    return metadata;
}

const app = express();
const PORT = process.env.PORT;
app.use(cors());
app.use(express.json());
app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'public', 'Logo_Solution.jpg')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// Helper pour lire un cookie
function getCookie(req, name) {
    const rc = req.headers.cookie;
    if (!rc) return null;
    const list = {};
    rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
    return list[name];
}

// ─── Auth middleware ─────────────────────────────────────────────────────────
const authMiddleware = (req, res, next) => {
    const sessionId = req.headers['x-session-id'] || req.query.sid || getCookie(req, 'ident');
    if (!sessionId || !authenticatedSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Unauthorized: Please authenticate first' });
    }
    const session = authenticatedSessions.get(sessionId);
    if (Date.now() > session.expiresAt) {
        authenticatedSessions.delete(sessionId);
        return res.status(401).json({ error: 'Unauthorized: Session expired' });
    }
    next();
};

// ─── RSS ─────────────────────────────────────────────────────────────────────
app.get('/api/rss', async (req, res) => {
    try {
        const results = await Promise.all(RSS_SOURCES.map(async source => {
            try {
                const feed = await parser.parseURL(source.url);
                return {
                    source: source.name,
                    level: source.level,
                    items: feed.items.slice(0, 5).map(item => ({
                        title: item.title,
                        link: item.link || item.guid,
                        pubDate: item.pubDate,
                        content: item.contentSnippet || item.content || item.description
                    }))
                };
            } catch {
                return { source: source.name, level: source.level, items: [], error: true };
            }
        }));
        res.json(results);
    } catch {
        res.status(500).json({ error: "Impossible de récupérer les flux RSS." });
    }
});

// ─── Locales ─────────────────────────────────────────────────────────────────
const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const VALID_LANGS = ['fr', 'en', 'es', 'ar'];

app.get('/api/locales/:lang', (req, res) => {
    const { lang } = req.params;
    if (!VALID_LANGS.includes(lang)) return res.status(400).json({ error: 'Langue non supportée' });
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
        res.json(JSON.parse(fs.readFileSync(filePath, 'utf-8')));
    } catch {
        res.status(500).json({ error: 'Impossible de lire le fichier de traduction' });
    }
});

app.put('/api/locales/:lang', authMiddleware, (req, res) => {
    const { lang } = req.params;
    if (!VALID_LANGS.includes(lang)) return res.status(400).json({ error: 'Langue non supportée' });
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
        fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), 'utf-8');
        res.json({ success: true, message: `${lang}.json sauvegardé` });
    } catch {
        res.status(500).json({ error: 'Impossible de sauvegarder le fichier de traduction' });
    }
});

// ─── Auth ─────────────────────────────────────────────────────────────────────
app.get('/api/auth/challenge', (req, res) => {
    const nonce = crypto.randomBytes(16).toString('hex');
    nonces.add(nonce);
    setTimeout(() => nonces.delete(nonce), 120000);
    res.json({ nonce });
});

app.post('/api/auth/verify', (req, res) => {
    const { hash, nonce } = req.body;
    if (!nonce || !hash) return res.status(400).json({ error: 'Paramètres manquants' });
    if (!nonces.has(nonce)) return res.status(401).json({ error: 'Défi expiré ou invalide' });
    nonces.delete(nonce);

    const expectedHash = simpleMD5((process.env.ADMIN_PASSWORD || 'Pascal') + nonce);
    if (hash === expectedHash) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
        authenticatedSessions.set(sessionId, { createdAt: Date.now(), expiresAt });
        setTimeout(() => authenticatedSessions.delete(sessionId), 24 * 60 * 60 * 1000);
        res.json({ success: true, sessionId });
    } else {
        res.status(401).json({ error: 'Mot de passe incorrect' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const sessionId = req.headers['x-session-id'] || getCookie(req, 'ident');
    if (sessionId) authenticatedSessions.delete(sessionId);
    res.json({ success: true });
});

app.get('/api/auth/check', authMiddleware, (req, res) => {
    res.json({ success: true });
});

// ─── Contact ──────────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Tous les champs sont requis.' });

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_TO || 'gamblin.aline@gmail.com',
            subject: `[Solution FLE] Nouveau message de ${name}`,
            text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            replyTo: email
        });
        res.json({ message: 'Email envoyé avec succès !' });
    } catch (err) {
        res.status(500).json({ error: "Erreur technique lors de l'envoi", details: err.message });
    }
});

// ─── Blog CRUD ────────────────────────────────────────────────────────────────
const BLOG_DIR = path.join(__dirname, 'content', 'blog');
const SERVICES_PAGES_DIR = path.join(__dirname, 'content', 'services_pages');

// Ensure directories exist
if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
if (!fs.existsSync(SERVICES_PAGES_DIR)) fs.mkdirSync(SERVICES_PAGES_DIR, { recursive: true });


const IMAGES_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, IMAGES_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const name = file.originalname.replace(/\.[^/.]+$/, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const unique = `${name}-${Date.now()}${ext}`;
        cb(null, unique);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        cb(null, allowed.includes(file.mimetype));
    }
});




// Liste tous les articles (avec body)
app.get('/api/blog', (req, res) => {
    try {
        const isAdmin = authenticatedSessions.has(req.headers['x-session-id'] || getCookie(req, 'ident'));
        const files = fs.existsSync(BLOG_DIR)
            ? fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
            : [];
        let posts = files.map(file => parseMDFile(path.join(BLOG_DIR, file)));

        // Filter out unpublished posts if not admin
        if (!isAdmin) {
            posts = posts.filter(p => p.published);
        }

        res.json(posts.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch {
        res.status(500).json({ error: 'Impossible de récupérer les articles du blog' });
    }
});

// Récupère un article par slug (avec body)
app.get('/api/blog/:slug', (req, res) => {
    const filepath = path.join(BLOG_DIR, `${req.params.slug}.md`);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Article non trouvé' });
    try {
        res.json(parseMDFile(filepath));
    } catch {
        res.status(500).json({ error: 'Impossible de lire cet article' });
    }
});

// Crée un article
app.post('/api/blog', authMiddleware, (req, res) => {
    const { title, author, date, description, image, body, published } = req.body;

    // ← Rejette aussi la chaîne "undefined" envoyée par le client
    if (!title || !body || body === 'undefined') {
        return res.status(400).json({ error: 'Titre et contenu requis' });
    }

    if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

    const slug = title.toLowerCase()
        .replace(/[àá]/g, 'a')
        .replace(/[éèê]/g, 'e')
        .replace(/[ïî]/g, 'i')
        .replace(/[ôó]/g, 'o')
        .replace(/[ùû]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const filepath = path.join(BLOG_DIR, `${slug}.md`);
    if (fs.existsSync(filepath)) return res.status(409).json({ error: 'Un article avec ce titre existe déjà' });

    const content = `---
title: "${title}"
author: "${author || 'Aline Gamblin'}"
date: "${date || new Date().toISOString().split('T')[0]}"
description: "${description || ''}"
image: "${image || '/logo_Solution.jpg'}"
published: ${published !== undefined ? published : true}
---

${body}`;

    try {
        fs.writeFileSync(filepath, content, 'utf-8');
        res.status(201).json({ success: true, slug, message: `Article "${title}" créé avec succès` });
    } catch {
        res.status(500).json({ error: "Impossible de créer l'article" });
    }
});

// Modifie un article
app.put('/api/blog/:slug', authMiddleware, (req, res) => {
    const { slug } = req.params;
    const { title, author, date, description, image, body, published } = req.body;

    // ← Rejette aussi la chaîne "undefined"
    if (!title || !body || body === 'undefined') {
        return res.status(400).json({ error: 'Titre et contenu requis' });
    }

    const filepath = path.join(BLOG_DIR, `${slug}.md`);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Article non trouvé' });

    const content = `---
title: "${title}"
author: "${author || 'Aline Gamblin'}"
date: "${date || new Date().toISOString().split('T')[0]}"
description: "${description || ''}"
image: "${image || '/logo_Solution.jpg'}"
published: ${published !== undefined ? published : true}
---

${body}`;

    try {
        fs.writeFileSync(filepath, content, 'utf-8');
        res.json({ success: true, slug, message: `Article "${title}" modifié avec succès` });
    } catch {
        res.status(500).json({ error: "Impossible de modifier l'article" });
    }
});

// ─── Services Pages CRUD (Articles A1-A6) ───────────────────────────────────

app.get('/api/services-pages', (req, res) => {
    try {
        const isAdmin = authenticatedSessions.has(req.headers['x-session-id'] || getCookie(req, 'ident'));
        const files = fs.existsSync(SERVICES_PAGES_DIR)
            ? fs.readdirSync(SERVICES_PAGES_DIR).filter(f => f.endsWith('.md'))
            : [];
        let posts = files.map(file => parseMDFile(path.join(SERVICES_PAGES_DIR, file)));

        if (!isAdmin) {
            posts = posts.filter(p => p.published);
        }

        res.json(posts);
    } catch {
        res.status(500).json({ error: 'Impossible de récupérer les pages de services' });
    }
});

app.get('/api/services-pages/:slug', (req, res) => {
    const filepath = path.join(SERVICES_PAGES_DIR, `${req.params.slug}.md`);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Page non trouvée' });
    try {
        res.json(parseMDFile(filepath));
    } catch {
        res.status(500).json({ error: 'Impossible de lire cette page' });
    }
});

app.put('/api/services-pages/:slug', authMiddleware, (req, res) => {
    const { slug } = req.params;
    const { title, body, published } = req.body;

    if (!title || !body) return res.status(400).json({ error: 'Titre et contenu requis' });
    const filepath = path.join(SERVICES_PAGES_DIR, `${slug}.md`);

    // Simple markdown content storage
    const content = `---\ntitle: "${title}"\npublished: ${published !== undefined ? published : true}\n---\n\n${body}`;
    try {
        fs.writeFileSync(filepath, content, 'utf-8');
        res.json({ success: true, message: 'Page mise à jour' });
    } catch {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Supprime un article
app.delete('/api/blog/:slug', authMiddleware, (req, res) => {
    const { slug } = req.params;
    const filepath = path.join(BLOG_DIR, `${slug}.md`);
    if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Article non trouvé' });

    try {
        fs.unlinkSync(filepath);
        res.json({ success: true, message: 'Article supprimé avec succès' });
    } catch {
        res.status(500).json({ error: "Impossible de supprimer l'article" });
    }
});


// Liste les images uploadées
app.get('/api/images', authMiddleware, (req, res) => {
    try {
        const files = fs.readdirSync(IMAGES_DIR)
            .filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f))
            .map(f => ({ name: f, url: `/uploads/${f}` }))
            .reverse(); // plus récentes en premier
        res.json(files);
    } catch {
        res.status(500).json({ error: 'Impossible de lister les images' });
    }
});

// Upload une image
app.post('/api/images/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier valide' });
    res.json({ success: true, url: `/uploads/${req.file.filename}`, name: req.file.filename });
});

// ─── Backup ──────────────────────────────────────────────────────────────────
app.get('/api/admin/backup', authMiddleware, (req, res) => {
    try {
        const zip = new AdmZip();

        // Add content
        if (fs.existsSync(BLOG_DIR)) zip.addLocalFolder(BLOG_DIR, 'blog');
        if (fs.existsSync(SERVICES_PAGES_DIR)) zip.addLocalFolder(SERVICES_PAGES_DIR, 'services_pages');
        if (fs.existsSync(LOCALES_DIR)) zip.addLocalFolder(LOCALES_DIR, 'locales');
        if (fs.existsSync(IMAGES_DIR)) zip.addLocalFolder(IMAGES_DIR, 'uploads');

        const zipBuffer = zip.toBuffer();
        const date = new Date().toISOString().split('T')[0];
        const filename = `backup-solution-fle-${date}.zip`;

        res.set('Content-Type', 'application/zip');
        res.set('Content-Disposition', `attachment; filename=${filename}`);
        res.set('Content-Length', zipBuffer.length);
        res.send(zipBuffer);
    } catch (e) {
        console.error('Backup error:', e);
        res.status(500).json({ error: 'Erreur lors de la génération de la sauvegarde' });
    }
});


// ─── Admin panel ──────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/textedit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'textedit.html'));
});

app.get('/service_editor.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'service_editor.html'));
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
    if (req.path.match(/\.[a-z0-9]+$/i)) return next();
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));