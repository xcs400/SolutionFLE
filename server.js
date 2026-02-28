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
const VALID_BLOG_LANGS = ['fr', 'en', 'es', 'ar'];

// Retourne le chemin du fichier MD pour un slug+lang, avec fallback fr
function resolveFilePath(dir, baseSlug, lang) {
    const l = VALID_BLOG_LANGS.includes(lang) ? lang : 'fr';
    const langFile = path.join(dir, `${baseSlug}.${l}.md`);
    const frFile = path.join(dir, `${baseSlug}.fr.md`);
    const legacyFile = path.join(dir, `${baseSlug}.md`);
    if (fs.existsSync(langFile)) return langFile;
    if (fs.existsSync(frFile)) return frFile;   // fallback fr
    if (fs.existsSync(legacyFile)) return legacyFile; // ancien format sans langue
    return null;
}

// Extrait le slug de base (ignore l'extension de langue)
function baseSlugOf(filename) {
    // ex: mon-article.fr.md -> mon-article
    // ex: mon-article.md   -> mon-article
    const noExt = path.basename(filename, '.md');
    return noExt.replace(/\.(fr|en|es|ar)$/, '');
}

// Extrait la langue du nom de fichier (ou null si absent)
function langOf(filename) {
    const noExt = path.basename(filename, '.md');
    const m = noExt.match(/\.(fr|en|es|ar)$/);
    return m ? m[1] : 'fr'; // legacy = fr
}

function parseMDFile(filepath) {
    const raw = fs.readFileSync(filepath, 'utf-8');
    const content = raw.replace(/\r\n/g, '\n');

    const filename = path.basename(filepath);
    const metadata = {
        slug: baseSlugOf(filename),
        lang: langOf(filename),
        title: 'Untitled',
        author: 'Unknown',
        date: new Date().toISOString(),
        description: '',
        image: '/Logo_Solution.jpg',
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
        metadata.body = content.slice(fm[0].length).trim();
    } else {
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

// ─── Translate (DeepL) ────────────────────────────────────────────────────────
app.post('/api/translate', authMiddleware, async (req, res) => {
    const { text, sourceLang, targetLang } = req.body;

    if (!text || !targetLang || !sourceLang) {
        return res.status(400).json({ error: 'Text, sourceLang and targetLang are required' });
    }

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'DeepL API key not configured' });
    }

    // DeepL Free: Arabe est supporté EN CIBLE mais PAS en SOURCE
    const supportedSourceLangs = ['fr', 'en', 'es'];
    const langMapSource = {
        "fr": "FR",
        "en": "EN-US",
        "es": "ES"
    };

    const langMapTarget = {
        "fr": "FR",
        "en": "EN-US",
        "es": "ES",
        "ar": "AR"
    };

    // Check if source language is supported
    if (!supportedSourceLangs.includes(sourceLang)) {
        return res.status(400).json({
            error: `Language '${sourceLang}' not supported as source. Supported: ${supportedSourceLangs.join(', ')}`
        });
    }

    // Check if target language is supported
    if (!Object.keys(langMapTarget).includes(targetLang)) {
        return res.status(400).json({
            error: `Language '${targetLang}' not supported as target.`
        });
    }

    if (sourceLang === targetLang) {
        return res.status(400).json({
            error: 'Source and target languages must be different'
        });
    }

    const source = langMapSource[sourceLang];
    const target = langMapTarget[targetLang];

    try {
        const response = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${apiKey}`,
                'Content-Type': 'application/json',
                'User-Agent': 'Solution-FLE-Translator/1.0'
            },
            body: JSON.stringify({
                text: [text],
                source_lang: source,
                target_lang: target
            }),
            timeout: 30000
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('DeepL API error:', error);
            return res.status(response.status).json({ error: 'Translation service error: ' + error });
        }

        const data = await response.json();
        if (data.translations && data.translations[0]) {
            const translated = data.translations[0].text;
            console.log(`[TRANSLATE] ${sourceLang.toUpperCase()} → ${targetLang.toUpperCase()} (${text.length} chars)`);
            res.json({ success: true, translated });
        } else {
            res.status(500).json({ error: 'Invalid response from translation service' });
        }
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({ error: error.message });
    }
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
const PRONUNCIATION_DIR = path.join(__dirname, 'content', 'pronunciation');
const PRONUNCIATION_DB = path.join(PRONUNCIATION_DIR, 'history.json');
const PRONUNCIATION_LESSONS = path.join(PRONUNCIATION_DIR, 'lessons.json');

// Ensure directories exist
if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });
if (!fs.existsSync(SERVICES_PAGES_DIR)) fs.mkdirSync(SERVICES_PAGES_DIR, { recursive: true });
if (!fs.existsSync(PRONUNCIATION_DIR)) fs.mkdirSync(PRONUNCIATION_DIR, { recursive: true });


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




// Liste tous les articles — dédupliqués par slug de base, dans la langue demandée
app.get('/api/blog', (req, res) => {
    try {
        const isAdmin = authenticatedSessions.has(req.headers['x-session-id'] || getCookie(req, 'ident'));
        const lang = VALID_BLOG_LANGS.includes(req.query.lang) ? req.query.lang : 'fr';

        const files = fs.existsSync(BLOG_DIR)
            ? fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'))
            : [];

        // Déduplique : pour chaque slug de base, on garde la version dans la langue demandée (ou fr en fallback)
        const slugMap = {}; // baseSlug -> { fr: filepath, en: filepath, ... }
        for (const f of files) {
            const base = baseSlugOf(f);
            const l = langOf(f);
            if (!slugMap[base]) slugMap[base] = {};
            slugMap[base][l] = path.join(BLOG_DIR, f);
        }

        let posts = Object.entries(slugMap).map(([, versions]) => {
            const filepath = versions[lang] || versions['fr'] || Object.values(versions)[0];
            return parseMDFile(filepath);
        });

        if (!isAdmin) posts = posts.filter(p => p.published);

        res.json(posts.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (e) {
        res.status(500).json({ error: 'Impossible de récupérer les articles du blog' });
    }
});

// Récupère un article par slug (avec body), dans la langue demandée
app.get('/api/blog/:slug', (req, res) => {
    const lang = VALID_BLOG_LANGS.includes(req.query.lang) ? req.query.lang : 'fr';
    const filepath = resolveFilePath(BLOG_DIR, req.params.slug, lang);
    if (!filepath) return res.status(404).json({ error: 'Article non trouvé' });
    try {
        res.json(parseMDFile(filepath));
    } catch {
        res.status(500).json({ error: 'Impossible de lire cet article' });
    }
});

// Crée un article (dans la langue spécifiée)
app.post('/api/blog', authMiddleware, (req, res) => {
    const { title, author, date, description, image, body, published, lang } = req.body;
    const language = VALID_BLOG_LANGS.includes(lang) ? lang : 'fr';

    if (!title || !body || body === 'undefined') {
        return res.status(400).json({ error: 'Titre et contenu requis' });
    }

    if (!fs.existsSync(BLOG_DIR)) fs.mkdirSync(BLOG_DIR, { recursive: true });

    const slug = title.toLowerCase()
        .replace(/[àáâ]/g, 'a').replace(/[éèêë]/g, 'e')
        .replace(/[ïî]/g, 'i').replace(/[ôó]/g, 'o').replace(/[ùûü]/g, 'u')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const filepath = path.join(BLOG_DIR, `${slug}.${language}.md`);
    if (fs.existsSync(filepath)) return res.status(409).json({ error: 'Un article avec ce titre existe déjà dans cette langue' });

    const content = `---
title: "${title}"
author: "${author || 'Aline Gamblin'}"
date: "${date || new Date().toISOString().split('T')[0]}"
description: "${description || ''}"
image: "${image || '/Logo_Solution.jpg'}"
lang: "${language}"
published: ${published !== undefined ? published : true}
---

${body}`;

    try {
        fs.writeFileSync(filepath, content, 'utf-8');
        res.status(201).json({ success: true, slug, lang: language, message: `Article "${title}" créé (${language})` });
    } catch {
        res.status(500).json({ error: "Impossible de créer l'article" });
    }
});

// Modifie un article (dans la langue spécifiée)
app.put('/api/blog/:slug', authMiddleware, (req, res) => {
    const { slug } = req.params;
    const { title, author, date, description, image, body, published, lang } = req.body;
    const language = VALID_BLOG_LANGS.includes(lang) ? lang : 'fr';

    if (!title || !body || body === 'undefined') {
        return res.status(400).json({ error: 'Titre et contenu requis' });
    }

    const filepath = resolveFilePath(BLOG_DIR, slug, language);
    if (!filepath) return res.status(404).json({ error: 'Article non trouvé' });

    // Chemin cible (toujours avec suffixe de langue)
    const targetPath = path.join(BLOG_DIR, `${slug}.${language}.md`);

    const content = `---
title: "${title}"
author: "${author || 'Aline Gamblin'}"
date: "${date || new Date().toISOString().split('T')[0]}"
description: "${description || ''}"
image: "${image || '/Logo_Solution.jpg'}"
lang: "${language}"
published: ${published !== undefined ? published : true}
---

${body}`;

    try {
        // Si l'ancien fichier est sans suffixe lang, on le renomme
        if (filepath !== targetPath && fs.existsSync(filepath)) {
            fs.renameSync(filepath, targetPath);
        }
        fs.writeFileSync(targetPath, content, 'utf-8');
        res.json({ success: true, slug, lang: language, message: `Article "${title}" modifié (${language})` });
    } catch {
        res.status(500).json({ error: "Impossible de modifier l'article" });
    }
});

// ─── Services Pages CRUD (Articles A1-A6) ───────────────────────────────────

app.get('/api/services-pages', (req, res) => {
    try {
        const isAdmin = authenticatedSessions.has(req.headers['x-session-id'] || getCookie(req, 'ident'));
        const lang = VALID_BLOG_LANGS.includes(req.query.lang) ? req.query.lang : 'fr';

        const files = fs.existsSync(SERVICES_PAGES_DIR)
            ? fs.readdirSync(SERVICES_PAGES_DIR).filter(f => f.endsWith('.md'))
            : [];

        // Déduplique par slug de base
        const slugMap = {};
        for (const f of files) {
            const base = baseSlugOf(f);
            const l = langOf(f);
            if (!slugMap[base]) slugMap[base] = {};
            slugMap[base][l] = path.join(SERVICES_PAGES_DIR, f);
        }

        let posts = Object.entries(slugMap).map(([, versions]) => {
            const filepath = versions[lang] || versions['fr'] || Object.values(versions)[0];
            return parseMDFile(filepath);
        });

        if (!isAdmin) posts = posts.filter(p => p.published);

        res.json(posts);
    } catch {
        res.status(500).json({ error: 'Impossible de récupérer les pages de services' });
    }
});

app.get('/api/services-pages/:slug', (req, res) => {
    const lang = VALID_BLOG_LANGS.includes(req.query.lang) ? req.query.lang : 'fr';
    const filepath = resolveFilePath(SERVICES_PAGES_DIR, req.params.slug, lang);
    if (!filepath) return res.status(404).json({ error: 'Page non trouvée' });
    try {
        res.json(parseMDFile(filepath));
    } catch {
        res.status(500).json({ error: 'Impossible de lire cette page' });
    }
});

app.put('/api/services-pages/:slug', authMiddleware, (req, res) => {
    const { slug } = req.params;
    const { title, body, published, lang } = req.body;
    const language = VALID_BLOG_LANGS.includes(lang) ? lang : 'fr';

    if (!title || !body) return res.status(400).json({ error: 'Titre et contenu requis' });

    const targetPath = path.join(SERVICES_PAGES_DIR, `${slug}.${language}.md`);
    const legacyPath = path.join(SERVICES_PAGES_DIR, `${slug}.md`);

    const content = `---\ntitle: "${title}"\nlang: "${language}"\npublished: ${published !== undefined ? published : true}\n---\n\n${body}`;
    try {
        // Migration: si l'ancien fichier existe sans suffixe, on le renomme
        if (!fs.existsSync(targetPath) && fs.existsSync(legacyPath) && language === 'fr') {
            fs.renameSync(legacyPath, targetPath);
        }
        fs.writeFileSync(targetPath, content, 'utf-8');
        res.json({ success: true, message: 'Page mise à jour' });
    } catch {
        res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
    }
});

// Supprime un article (une langue, ou toutes les versions si ?lang=all)
app.delete('/api/blog/:slug', authMiddleware, (req, res) => {
    const { slug } = req.params;
    const lang = req.query.lang;

    try {
        if (lang === 'all') {
            // Supprime toutes les versions linguistiques
            for (const l of [...VALID_BLOG_LANGS, '']) {
                const fp = l ? path.join(BLOG_DIR, `${slug}.${l}.md`) : path.join(BLOG_DIR, `${slug}.md`);
                if (fs.existsSync(fp)) fs.unlinkSync(fp);
            }
        } else {
            const filepath = resolveFilePath(BLOG_DIR, slug, lang || 'fr');
            if (!filepath) return res.status(404).json({ error: 'Article non trouvé' });
            fs.unlinkSync(filepath);
        }
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

// ─── Restore from ZIP ─────────────────────────────────────────────────────────
const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

// ─── Historique de Prononciation ──────────────────────────────────────────────
app.post('/api/pronunciation/lesson', uploadMemory.single('profAudio'), (req, res) => {
    try {
        const { lessonName, id: editId } = req.body;
        if (!lessonName) return res.status(400).json({ error: 'Nom de leçon requis.' });

        const dbExt = fs.existsSync(PRONUNCIATION_LESSONS) ? JSON.parse(fs.readFileSync(PRONUNCIATION_LESSONS, 'utf-8')) : [];
        let entry;

        if (editId) {
            const index = dbExt.findIndex(e => e.id === editId);
            if (index === -1) return res.status(404).json({ error: 'Leçon non trouvée.' });
            entry = dbExt[index];
            entry.lessonName = lessonName.trim();

            if (req.file) {
                const fileName = path.basename(entry.audioUrl);
                fs.writeFileSync(path.join(PRONUNCIATION_DIR, fileName), req.file.buffer);
            }
        } else {
            if (!req.file) return res.status(400).json({ error: 'Audio requis pour une nouvelle leçon.' });

            const safeName = lessonName.trim().replace(/\W+/g, '-');
            const timestamp = Date.now();
            const newId = `lesson_${safeName}_${timestamp}`;
            const fileName = `${newId}.wav`;

            fs.writeFileSync(path.join(PRONUNCIATION_DIR, fileName), req.file.buffer);

            entry = {
                id: newId,
                timestamp: new Date().toISOString(),
                lessonName: lessonName.trim(),
                audioUrl: `/api/pronunciation/audio/${fileName}`
            };
            dbExt.push(entry);
        }

        fs.writeFileSync(PRONUNCIATION_LESSONS, JSON.stringify(dbExt, null, 2));
        res.json({ success: true, entry });
    } catch (e) {
        console.error('Erreur creation/edition leçon:', e);
        res.status(500).json({ error: 'Erreur serveur.' });
    }
});

app.delete('/api/pronunciation/lesson/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        let dbExt = fs.existsSync(PRONUNCIATION_LESSONS) ? JSON.parse(fs.readFileSync(PRONUNCIATION_LESSONS, 'utf-8')) : [];
        const entryIndex = dbExt.findIndex(e => e.id === id);

        if (entryIndex !== -1) {
            const entry = dbExt[entryIndex];
            if (entry.audioUrl) {
                const aFile = path.join(PRONUNCIATION_DIR, path.basename(entry.audioUrl));
                if (fs.existsSync(aFile)) fs.unlinkSync(aFile);
            }
            dbExt.splice(entryIndex, 1);
            fs.writeFileSync(PRONUNCIATION_LESSONS, JSON.stringify(dbExt, null, 2));
            res.json({ success: true, message: 'Leçon effacée' });
        } else {
            res.status(404).json({ error: 'Leçon introuvable' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Erreur suppression.' });
    }
});

app.get('/api/pronunciation/lessons', (req, res) => {
    try {
        const dbExt = fs.existsSync(PRONUNCIATION_LESSONS) ? JSON.parse(fs.readFileSync(PRONUNCIATION_LESSONS, 'utf-8')) : [];
        dbExt.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(dbExt);
    } catch (e) {
        res.status(500).json({ error: 'Erreur lecture leçons.' });
    }
});

app.post('/api/pronunciation/save', uploadMemory.fields([{ name: 'profAudio' }, { name: 'eleveAudio' }]), (req, res) => {
    try {
        const { lessonName, studentName, scores } = req.body;
        if (!lessonName || !studentName) return res.status(400).json({ error: 'Noms de la leçon et de l\'élève requis.' });

        const profFile = req.files && req.files['profAudio'] ? req.files['profAudio'][0] : null;
        const eleveFile = req.files && req.files['eleveAudio'] ? req.files['eleveAudio'][0] : null;

        const timestampNow = Date.now();
        const safeStudent = studentName.trim().replace(/\W+/g, '-');
        const safeLesson = lessonName.trim().replace(/\W+/g, '-');
        // Identifiant fix pour un étudiant et un leçon ! Permettant l'écrasement (overwrite)
        const id = `${safeStudent}_${safeLesson}`;

        const dbExt = fs.existsSync(PRONUNCIATION_DB) ? JSON.parse(fs.readFileSync(PRONUNCIATION_DB, 'utf-8')) : [];
        const existingIdx = dbExt.findIndex(e => e.id === id);

        let profPath = '';
        let elevePath = '';

        if (profFile) {
            profPath = `${id}_prof_${timestampNow}.wav`;
            fs.writeFileSync(path.join(PRONUNCIATION_DIR, profPath), profFile.buffer);
        }
        if (eleveFile) {
            elevePath = `${id}_eleve_${timestampNow}.wav`;
            fs.writeFileSync(path.join(PRONUNCIATION_DIR, elevePath), eleveFile.buffer);
        }

        const entry = {
            id,
            timestamp: new Date().toISOString(),
            lessonName: lessonName.trim(),
            studentName: studentName.trim(),
            scores: scores ? JSON.parse(scores) : {},
            profAudio: profPath ? `/api/pronunciation/audio/${profPath}` : (existingIdx !== -1 ? dbExt[existingIdx].profAudio : null),
            eleveAudio: elevePath ? `/api/pronunciation/audio/${elevePath}` : (existingIdx !== -1 ? dbExt[existingIdx].eleveAudio : null)
        };

        if (existingIdx !== -1) {
            // Nettoyer les anciens fichiers pour éviter de remplir le disque
            const oldEntry = dbExt[existingIdx];
            if (profFile && oldEntry.profAudio) {
                const oFile = path.join(PRONUNCIATION_DIR, path.basename(oldEntry.profAudio));
                if (fs.existsSync(oFile)) fs.unlinkSync(oFile);
            }
            if (eleveFile && oldEntry.eleveAudio) {
                const oFile = path.join(PRONUNCIATION_DIR, path.basename(oldEntry.eleveAudio));
                if (fs.existsSync(oFile)) fs.unlinkSync(oFile);
            }
            dbExt[existingIdx] = entry; // overwrite
        } else {
            dbExt.push(entry);
        }

        fs.writeFileSync(PRONUNCIATION_DB, JSON.stringify(dbExt, null, 2));

        res.json({ success: true, entry });
    } catch (e) {
        console.error('Erreur sauvegarde prononciation:', e);
        res.status(500).json({ error: 'Erreur lors de la sauvegarde.' });
    }
});

app.get('/api/pronunciation/history', (req, res) => {
    try {
        const dbExt = fs.existsSync(PRONUNCIATION_DB) ? JSON.parse(fs.readFileSync(PRONUNCIATION_DB, 'utf-8')) : [];
        // Tri décroissant
        dbExt.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(dbExt);
    } catch (e) {
        res.status(500).json({ error: 'Erreur lecture historique.' });
    }
});

app.get('/api/pronunciation/audio/:filename', (req, res) => {
    const file = path.join(PRONUNCIATION_DIR, req.params.filename);
    if (fs.existsSync(file)) res.sendFile(file);
    else res.status(404).json({ error: 'Fichier non trouvé' });
});

app.delete('/api/pronunciation/history/:id', authMiddleware, (req, res) => {
    try {
        const { id } = req.params;
        let dbExt = fs.existsSync(PRONUNCIATION_DB) ? JSON.parse(fs.readFileSync(PRONUNCIATION_DB, 'utf-8')) : [];
        const entryIndex = dbExt.findIndex(e => e.id === id);

        if (entryIndex !== -1) {
            const entry = dbExt[entryIndex];
            // Delete audio files
            if (entry.profAudio) {
                const pFile = path.join(PRONUNCIATION_DIR, path.basename(entry.profAudio));
                if (fs.existsSync(pFile)) fs.unlinkSync(pFile);
            }
            if (entry.eleveAudio) {
                const eFile = path.join(PRONUNCIATION_DIR, path.basename(entry.eleveAudio));
                if (fs.existsSync(eFile)) fs.unlinkSync(eFile);
            }

            dbExt.splice(entryIndex, 1);
            fs.writeFileSync(PRONUNCIATION_DB, JSON.stringify(dbExt, null, 2));
            res.json({ success: true, message: 'Effacé' });
        } else {
            res.status(404).json({ error: 'Introuvable' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Erreur suppression.' });
    }
});


app.post('/api/admin/restore', authMiddleware, uploadMemory.single('backup'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier ZIP fourni' });

    const mode = req.body.mode === 'replace' ? 'replace' : 'merge'; // default: merge

    try {
        const zip = new AdmZip(req.file.buffer);
        const entries = zip.getEntries();

        // Mapping: dossier ZIP → dossier système
        const dirMap = {
            'blog': BLOG_DIR,
            'services_pages': SERVICES_PAGES_DIR,
            'locales': LOCALES_DIR,
            'uploads': IMAGES_DIR,
        };

        let restored = 0;
        let skipped = 0;

        for (const entry of entries) {
            if (entry.isDirectory) continue;

            const parts = entry.entryName.split('/');
            const folder = parts[0];
            const relPath = parts.slice(1).join('/');

            const targetDir = dirMap[folder];
            if (!targetDir || !relPath) { skipped++; continue; }

            const targetPath = path.join(targetDir, relPath);
            const targetParent = path.dirname(targetPath);

            // Sécurité : empêcher path traversal
            if (!targetPath.startsWith(targetDir)) { skipped++; continue; }

            // Mode merge : ne pas écraser les fichiers existants
            if (mode === 'merge' && fs.existsSync(targetPath)) { skipped++; continue; }

            fs.mkdirSync(targetParent, { recursive: true });
            fs.writeFileSync(targetPath, entry.getData());
            restored++;
        }

        res.json({
            success: true,
            mode,
            restored,
            skipped,
            message: `Restauration (${mode}) : ${restored} fichier(s) importé(s), ${skipped} ignoré(s).`
        });
    } catch (e) {
        console.error('Restore error:', e);
        res.status(500).json({ error: 'Erreur lors de la restauration du ZIP' });
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
// Serve index.html for all non-API navigation routes (enables client-side routing)
app.use((req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) return next();
    // Skip files with extensions (js, css, images, etc.) - let them 404 naturally if not found
    if (req.path.match(/\.[a-z0-9]+$/i)) {
        // Don't call next() - just let it 404 if the file doesn't exist
        return res.status(404).json({ error: 'Not Found' });
    }
    // Serve index.html for all other routes (SPA navigation)
    res.sendFile(path.join(__dirname, 'dist', 'index.html'), (err) => {
        if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).json({ error: 'Server Error' });
        }
    });
});


app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));