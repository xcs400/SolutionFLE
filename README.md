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

## Internationalisation (i18n)

Le site est **multilingue** (français / anglais). Tous les textes visibles sont externalisés dans des fichiers JSON situés dans `src/locales/`.

### Comment ça marche

1. Les traductions sont stockées dans `src/locales/fr.json` et `src/locales/en.json`
2. Le `LanguageContext` fournit une fonction `t('clé.imbriquée')` à tous les composants
3. La langue du navigateur est détectée automatiquement au premier chargement
4. Le choix de l'utilisateur est sauvegardé dans `localStorage`

### Utilisation dans un composant

```jsx
import { useLanguage } from '../context/LanguageContext';

const MonComposant = () => {
    const { t, language } = useLanguage();
    return <h1>{t('hero.title_line1')}</h1>;
};
```

### Ajouter une nouvelle langue

1. Créer `src/locales/xx.json` en copiant `fr.json` et en traduisant les valeurs
2. Importer le fichier dans `src/context/LanguageContext.jsx` :
   ```js
   import xx from '../locales/xx.json';
   const translations = { fr, en, xx };
   ```
3. Ajouter l'entrée dans le tableau `SUPPORTED_LANGUAGES` :
   ```js
   { code: 'xx', label: 'XX', flag: '🇪🇸', name: 'Español' }
   ```

### Structure d'un fichier de traduction

Les clés sont organisées par section/composant :

| Clé racine       | Contenu                                         |
|-------------------|------------------------------------------------|
| `nav`             | Liens de navigation + CTA                       |
| `hero`            | Titre, sous-titre, bouton d'action              |
| `about`           | Parcours, biographie, points forts               |
| `services`        | Titre + tableau des 6 prestations               |
| `resources`       | Titre, sous-titre, messages d'état               |
| `testimonials`    | Titre + tableau des témoignages                  |
| `contact`         | Labels, placeholders, messages du formulaire     |
| `footer`          | Copyright, mentions légales                      |
| `app`             | Textes globaux (ex: bouton d'appel flottant)     |

## Variables d'environnement

Créer un fichier `.env` à la racine :

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password
CONTACT_TO=destination@email.com
```

## Licence

Projet privé — © Aline Gamblin, Solution FLE.
