import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Parser from 'rss-parser';
import crypto from 'crypto';

dotenv.config();

const parser = new Parser({
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
    timeout: 10000
});

const RSS_SOURCES = [
    { name: 'RFI - Journal en Français Facile', level: 'A2-B1', url: 'https://www.rfi.fr/fr/podcasts/journal-fran%C3%A7ais-facile/podcast' },
    { name: 'TV5MONDE - Apprendre le Français', level: 'A1-B2', url: 'https://apprendre.tv5monde.com/fr/rss' },
    { name: 'La Clé des Langues', level: 'Tous niveaux-Toutes Langues', url: 'https://cle.ens-lyon.fr/rss.xml' }
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nonces = new Set();

/**
 * Simple MD5 hash function - codé en dur, utilisé pour vérifier le password
 */
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

const app = express();
const PORT = process.env.PORT || 5173;

// Middleware
app.use(cors());
app.use(express.json());

// API Route for RSS Feeds
app.get('/api/rss', async (req, res) => {
    console.log('--- REQUÊTE RSS REÇUE ---');
    try {
        const feedPromises = RSS_SOURCES.map(async (source) => {
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
            } catch (err) {
                console.error(`Erreur pour le flux ${source.name}:`, err.message);
                return { source: source.name, level: source.level, items: [], error: true };
            }
        });

        const results = await Promise.all(feedPromises);
        res.status(200).json(results);
    } catch (error) {
        console.error('Erreur globale RSS:', error);
        res.status(500).json({ error: "Impossible de récupérer les flux RSS." });
    }
});

// ─── Locales API (for textedit.html) ────────────────────
const LOCALES_DIR = path.join(__dirname, 'src', 'locales');
const VALID_LANGS = ['fr', 'en', 'es', 'ar'];

app.get('/api/locales/:lang', (req, res) => {
    const { lang } = req.params;
    if (!VALID_LANGS.includes(lang)) {
        return res.status(400).json({ error: 'Langue non supportée' });
    }
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        res.json(JSON.parse(content));
    } catch (err) {
        console.error(`Erreur lecture ${filePath}:`, err.message);
        res.status(500).json({ error: 'Impossible de lire le fichier de traduction' });
    }
});

app.put('/api/locales/:lang', (req, res) => {
    const { lang } = req.params;
    if (!VALID_LANGS.includes(lang)) {
        return res.status(400).json({ error: 'Langue non supportée' });
    }
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    try {
        const content = JSON.stringify(req.body, null, 2);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Traduction ${lang}.json sauvegardée`);
        res.json({ success: true, message: `${lang}.json sauvegardé` });
    } catch (err) {
        console.error(`Erreur écriture ${filePath}:`, err.message);
        res.status(500).json({ error: 'Impossible de sauvegarder le fichier de traduction' });
    }
});

// Route for the translation editor (accessible via /textedit)
app.get('/textedit', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'textedit.html'));
});

// Serve static files from the Vite build directory (after API routes)
app.use(express.static(path.join(__dirname, 'dist')));

// ─── Authentication API (moved before static to ensure API reachability) ────────────────────────────────
app.get('/api/auth/challenge', (req, res) => {
    console.log('--- AUTH CHALLENGE REQUEST ---', { ip: req.ip });
    const nonce = crypto.randomBytes(16).toString('hex');
    nonces.add(nonce);
    // Expire le nonce après 2 minutes
    setTimeout(() => nonces.delete(nonce), 120000);
    console.log('Generated nonce for', req.ip);
    res.json({ nonce });
});

app.post('/api/auth/verify', (req, res) => {
    console.log('--- AUTH VERIFY REQUEST ---', { ip: req.ip, body: req.body });
    const { hash, nonce } = req.body;

    if (!nonce || !hash) {
        console.log('Missing params in verify from', req.ip);
        return res.status(400).json({ error: 'Paramètres manquants' });
    }

    if (!nonces.has(nonce)) {
        console.log('Invalid/expired nonce', nonce, 'from', req.ip);
        return res.status(401).json({ error: 'Défi expiré ou invalide' });
    }

    nonces.delete(nonce);

    const adminPassword = process.env.ADMIN_PASSWORD || 'Pascal';
    const expectedHash = simpleMD5(adminPassword + nonce);

    if (hash === expectedHash) {
        console.log('Auth success for', req.ip);
        res.json({ success: true });
    } else {
        console.log('Auth failed (wrong hash) for', req.ip);
        res.status(401).json({ error: 'Mot de passe incorrect' });
    }
});

// API Route for Contact Form
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    // validation
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER, // Gmail requires the authenticated email here
        to: process.env.EMAIL_TO || 'gamblin.aline@gmail.com',
        subject: `[Solution FLE] Nouveau message de ${name}`,
        text: `Nom: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        replyTo: email // This allows you to click 'Reply' in your email client
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Email envoyé avec succès !' });
    } catch (error) {
        console.error('Erreur détaillée Nodemailer:', error);
        res.status(500).json({
            error: "Erreur technique lors de l'envoi.",
            details: error.code === 'EAUTH' ? "Identifiants invalides (vérifiez le mot de passe d'application)." : error.message
        });
    }
});

// For any other request, send the index.html from dist (SPA support)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
