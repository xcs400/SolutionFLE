# Solution FLE — Site vitrine

Site web de **Solution FLE**, formations personnalisées en Français Langue Étrangère par Aline Gamblin (diplômée DAEFLE).

## Stack technique

- **React** + **Vite** — Framework front-end et bundler
- **Framer Motion** — Animations et transitions
- **Lucide React** — Icônes SVG
- **Node.js / Express** — Serveur backend (API contact + flux RSS)

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
├── public/                  # Assets statiques (images, logo, favicon)
├── src/
│   ├── components/          # Composants React
│   │   ├── Header.jsx       # En-tête avec navigation + sélecteur de langue
│   │   ├── Hero.jsx         # Section héro principale
│   │   ├── About.jsx        # Section "Mon Parcours"
│   │   ├── Services.jsx     # Grille des prestations
│   │   ├── Resources.jsx    # Flux RSS / Actualités FLE
│   │   ├── Testimonials.jsx # Carrousel de témoignages
│   │   ├── Contact.jsx      # Coordonnées + footer
│   │   ├── ContactForm.jsx  # Formulaire de contact
│   │   └── LanguageSwitcher.jsx  # Bouton de changement de langue
│   ├── context/
│   │   └── LanguageContext.jsx   # Contexte React pour l'internationalisation
│   ├── locales/             # Fichiers de traduction (i18n)
│   │   ├── fr.json          # 🇫🇷 Français (langue par défaut)
│   │   └── en.json          # 🇬🇧 Anglais
│   ├── App.jsx              # Composant racine
│   ├── App.css
│   ├── index.css            # Styles globaux + design system
│   └── main.jsx             # Point d'entrée (avec LanguageProvider)
├── server.js                # Serveur Express (API contact + RSS proxy)
├── index.html
├── vite.config.js
└── package.json
```

## Administration & Édition en ligne

Le site propose deux modes d'édition des contenus sans avoir à modifier manuellement les fichiers JSON.

### 1. Édition Inline (Directe)
Ce mode permet de modifier les textes directement sur les pages du site.
- **Accès** : Cliquez sur le lien **"Edit Inline"** tout en bas de la page (footer).
- **Sécurité** : Un mot de passe est requis.
- **Fonctionnement** : 
  - Les zones éditables apparaissent avec une bordure pointillée bleue.
  - Cliquez sur un texte pour le transformer en champ d'édition.
  - La modification est sauvegardée automatiquement sur le serveur dès que vous cliquez en dehors du champ.

### 2. Éditeur Global (`/textedit`)
Un panneau d'administration complet est disponible pour gérer toutes les langues sur une seule interface.
- **Accès** : Cliquez sur le lien **"Admin"** dans le footer.
- **Fonctionnement** : Permet de voir et modifier les traductions FR, EN, ES et AR côte à côte.
- **Sauvegarde** : Les modifications sont groupées. Un mot de passe est demandé lors du clic sur "Sauvegarder".

### 3. Sécurité du mot de passe
Le système utilise un mécanisme de **Défi-Réponse (Challenge-Response)** :
1. Le client demande un jeton unique (nonce) au serveur.
2. Le mot de passe est haché localement avec ce jeton (SHA-256).
3. Seul le résultat (hash) est envoyé au serveur.
*Avantage : Le mot de passe ne transite jamais en clair et le hash intercepté est inutile une fois le jeton expiré.*

## Internationalisation (i18n)

Le site est nativement multilingue (**FR, EN, ES, AR**).
- Les fichiers sont dans `src/locales/`.
- Le support de l'Arabe (RTL) est géré automatiquement.
- Le composant `<EditableText />` gère l'affichage et l'interface d'édition.

## Variables d'environnement

Le serveur utilise un fichier `.env` à la racine pour les fonctions sensibles :

```env
# Identifiants Gmail (Utilisez un "Mot de passe d'application")
EMAIL_USER=votre-email@gmail.com
EMAIL_PASS=votre-mot-de-passe-application

# Réception des messages du formulaire
EMAIL_TO=destination@gmail.com

# Mot de passe d'administration (Édition en ligne)
ADMIN_PASSWORD=VotreMotDePasseSecret

# Port du serveur
PORT=5000
```

## Licence

Projet privé — © Aline Gamblin, Solution FLE.
