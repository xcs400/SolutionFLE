# Solution FLE — Site vitrine

Site web de **Solution FLE**, formations personnalisées en Français Langue Étrangère par Aline Gamblin (diplômée DAEFLE).

## Stack technique

- **React** + **Vite** — Framework front-end et bundler
- **Framer Motion** — Animations et transitions
- **Lucide React** — Icônes SVG
- **Node.js / Express** — Serveur backend (API contact + flux RSS + traduction)
- **DeepL API** — Traduction automatique multilingue

## Démarrage

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build
```

## Structure du projet

```
site/
├── public/                           # Assets statiques
│   ├── admin.html                    # Interface édition inline
│   ├── textedit.html                 # Éditeur de traductions global
│   ├── service_editor.html           # Éditeur de services
│   ├── texteditor.html               # Éditeur de texte (legacy)
│   ├── uploads/                      # Images uploadées
│   └── SolutionFLE_Charte.txt        # Charte graphique
│
├── src/
│   ├── components/
│   │   ├── Header.jsx                # En-tête avec navigation + sélecteur de langue
│   │   ├── Hero.jsx                  # Section héro principale
│   │   ├── About.jsx                 # Section "Mon Parcours"
│   │   ├── Services.jsx              # Grille des prestations
│   │   ├── ServicePage.jsx           # Pages des services dynamiques
│   │   ├── Blog.jsx                  # Liste des articles
│   │   ├── BlogPost.jsx              # Vue d'un article
│   │   ├── Resources.jsx             # Flux RSS / Actualités FLE
│   │   ├── Testimonials.jsx          # Carrousel de témoignages
│   │   ├── Contact.jsx               # Coordonnées + footer
│   │   ├── ContactForm.jsx           # Formulaire de contact
│   │   ├── LanguageSwitcher.jsx      # Sélecteur de langue
│   │   ├── EditableText.jsx          # Édition inline
│   │   ├── Header.jsx.bak            # Backup Header
│   │   └── assets/                   # Images des composants
│   │
│   ├── context/
│   │   └── LanguageContext.jsx       # Contexte i18n multi-langue
│   │
│   ├── locales/                      # Fichiers de traduction
│   │   ├── fr.json                   # 🇫🇷 Français
│   │   ├── en.json                   # 🇬🇧 Anglais
│   │   ├── es.json                   # 🇪🇸 Espagnol
│   │   └── ar.json                   # 🇸🇦 Arabe (RTL)
│   │
│   ├── App.jsx                       # Composant racine
│   ├── App.css
│   ├── index.css                     # Design system global
│   └── main.jsx                      # Point d'entrée
│
├── content/                          # Contenu éditabble (TinaCMS)
│   ├── blog/                         # Articles du blog
│   │   ├── article.fr.md             # Article en français
│   │   ├── article.en.md             # Même article en anglais
│   │   ├── article.es.md
│   │   └── article.ar.md
│   └── services_pages/               # Pages de services
│       ├── A1.fr.md                  # Services A1, A2, etc. (multilingues)
│       ├── A1.en.md
│       ├── A1.es.md
│       └── A1.ar.md
│
├── tina/                             # Configuration TinaCMS
│   └── config.ts
│
├── server.js                         # Serveur Express (API + webhooks)
├── vite.config.js
├── eslint.config.js
├── index.html
├── package.json
├── BLOG_SETUP.md                     # Guide TinaCMS détaillé
└── README.md                         # Ce fichier
```

## Administration & Édition en ligne

Le site propose plusieurs modes d'édition sans modifier les fichiers manuellement.

### 1. Édition Inline (Directe)
Modification directe sur les pages du site.
- **Accès** : Lien **"Edit Inline"** en bas de page (footer)
- **Sécurité** : Mot de passe requis
- **Fonctionnement** : 
  - Les zones éditables ont une bordure pointillée bleue
  - Cliquez pour transformer en champ d'édition
  - Sauvegarde automatique en sortant du champ

### 2. Éditeur Global de Traductions (`/textedit`)
Panneau d'administration complet pour gérer toutes les langues.
- **Accès** : Lien **"Admin"** dans le footer
- **Fonctionnement** : 
  - Vue côte à côte : FR, EN, ES, AR
  - Aperçu des statistiques (clés manquantes, modifications)
  - Recherche dans toutes les traductions
  - **Traduction automatique** : Clic droit sur une cellule pour traduire depuis une autre langue

#### Traduction automatique (DeepL)
- **Langues sources supportées** : Français, English, Español
- **Langues cibles** : Français, English, Español, العربية
- **Fonctionnement** : 
  1. Clic droit sur une cellule de traduction
  2. Sélectionnez la langue source
  3. Traduction automatique → remplace le contenu
  4. Marque comme modifié (orange)
- **Limitation** : L'Arabe ne peut pas être utilisé comme langue source (limitation DeepL Free)

### 3. Éditeur TinaCMS (`/admin`)
Interface **Git-based CMS** pour les articles et pages de services.
- **Accès** : Lien **"✏️ TinaCMS"** ou `/admin`
- **Fonctionnement** : 
  - Créer/modifier articles en markdown avec interface visuelle
  - Articles stockés dans `content/blog/`
  - Pages de services dans `content/services_pages/`
  - Support du versioning Git optionnel
- **Guide complet** : [BLOG_SETUP.md](./BLOG_SETUP.md)

### 4. Sécurité du mot de passe
Mécanisme **Challenge-Response** (MD5 + nonce) :
1. Client demande un jeton unique (nonce) au serveur
2. MD5(password + nonce) calculé localement (le hash jamais exposé)
3. Seul le hash est envoyé (invalide après expiration du nonce)
4. Avantage : Mot de passe jamais en clair, hash inutile après expiration

## Sauvegarde et Restauration (Archives ZIP)

### 1. Créer une sauvegarde
Une fonction de **sauvegarde complète** exporte tous les contenus en ZIP.

**Accès :**
- Via API : `GET /api/admin/backup` (authentification requise)
- Fichier généré : contient tous les fichiers de configuration et contenu

**Contenu de la sauvegarde :**
```
backup-YYYYMMDD-HHMMSS.zip
├── locales/
│   ├── fr.json       # Traductions français
│   ├── en.json       # Traductions anglais
│   ├── es.json       # Traductions espagnol
│   └── ar.json       # Traductions arabe
└── content/
    ├── blog/         # Tous les articles
    └── services_pages/  # Toutes les pages de services
```

**Mode opératoire :**
```bash
curl -H "x-session-id: YOUR_SESSION_ID" \
  http://localhost:5000/api/admin/backup > backup.zip
```

### 2. Restaurer une sauvegarde
Import des fichiers depuis une archive ZIP existante.

**Accès :**
- Via API : `POST /api/admin/restore` (authentification requise)
- Téléchargez le fichier ZIP
- Tous les fichiers seront remplacés

**Attention ⚠️ :**
- Cette opération remplace TOUS les fichiers
- Faites une sauvegarde avant de restaurer
- Vérifiez le contenu du ZIP avant import

**Mode opératoire :**
```bash
curl -X POST -H "x-session-id: YOUR_SESSION_ID" \
  -F "backup=@backup.zip" \
  http://localhost:5000/api/admin/restore
```

### 3. Gestion des fichiers
Les archives ZIP permettent :
- ✅ Sauvegarde complète (daily backup recommandé)
- ✅ Migration entre serveurs
- ✅ Restauration en cas de problème
- ✅ Versioning manuel (garder plusieurs sauvegardesen horodaté)
- ✅ Collaboration (partager des contenus)

**Bonnes pratiques :**
1. Sauvegardez régulièrement (quotidiennement idéal)
2. Testez les restaurations avant d'en avoir besoin
3. Nommez les archives avec la date et l'heure
4. Stockez les archives importantes en lieu sûr

## Internationalisation (i18n)

Le site gère **4 langues** de base :
- 🇫🇷 **Français** (FR-fr) — Langue de référence
- 🇬🇧 **English** (EN-US)
- 🇪🇸 **Español** (ES)
- 🇸🇦 **العربية** (AR-sa) — RTL automatique

**Fonctionnement :**
- Fichiers JSON dans `src/locales/`
- Support RTL (Arabe) automatique
- Traduction assistée par DeepL
- Éditeur global pour synchroniser toutes les langues

## Variables d'environnement

Créez un fichier `.env` à la racine :

```env
# ─── Messagerie Gmail ───────────────────────
# Utilisez un "Mot de passe d'application" (pas votre vrai mot de passe)
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application

# Adresse de destination pour les messages du formulaire
EMAIL_TO=destination@gmail.com

# ─── Sécurité Admin ─────────────────────────
# Mot de passe pour l'administration et édition
ADMIN_PASSWORD=VotreMotDePasseSecurisé

# ─── Serveur ────────────────────────────────
# Port d'écoute (défaut: 5000)
PORT=5000

# ─── Traduction (DeepL) ─────────────────────
# Obtenez une clé gratuite : https://www.deepl.com/fr/pro-api
DEEPL_API_KEY=votre-deepl-api-key
```

## API utilité publique

### Traductions
- `POST /api/translate` — Traduire un texte (FR/EN/ES → FR/EN/ES/AR)

### Sauvegardes
- `GET /api/admin/backup` — Exporter toutes les traductions en ZIP
- `POST /api/admin/restore` — Importer une sauvegarde ZIP

### Contenu
- `GET /api/locales/:lang` — Récupérer les traductions d'une langue
- `PUT /api/locales/:lang` — Mettre à jour les traductions
- `GET /api/blog` — Liste des articles du blog
- `GET /api/blog/:slug` — Détails article
- `POST /api/blog` — Créer un article
- `PUT /api/blog/:slug` — Mettre à jour un article
- `DELETE /api/blog/:slug` — Supprimer un article (admin)

### Authentification
- `GET /api/auth/challenge` — Demander un défi (nonce)
- `POST /api/auth/verify` — Vérifier le mot de passe
- `POST /api/auth/logout` — Se déconnecter
- `GET /api/auth/check` — Vérifier la session active

## Licence

Projet privé — © Aline Gamblin, Solution FLE.
