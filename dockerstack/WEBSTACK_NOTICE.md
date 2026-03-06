# 📋 Notice Technique — Webstack

> Stack Docker déployé sur Home Assistant OS via Portainer
> **Nom du stack :** `webstack` ⚠️ toujours ce nom exact

---

## 🌐 Accès & Ports

| Service | Accès local | Accès réseau | Description |
|---------|-------------|--------------|-------------|
| **Nginx** (site web) | `http://localhost:8081` | `http://192.168.1.52:8081` | Serveur web principal |
| **phpMyAdmin** | `http://localhost:8082` | `http://192.168.1.52:8082` | Administration base de données |
| **Node.js** | `http://localhost:5173` | `http://192.168.1.52:5173` | Node direct (interne uniquement) |
| **Portainer** | `http://localhost:9009` | `http://192.168.1.52:9009` | Gestion Docker (HTTP) |
| **Portainer** | `https://localhost:9443` | `https://192.168.1.52:9443` | Gestion Docker (HTTPS) |
| **FTP** | `ftp://localhost:21` | `ftp://192.168.1.52:21` | Transfert de fichiers |

### ⚠️ Règle importante — Toujours utiliser le port 8081

**Ne jamais utiliser le port 5173 pour naviguer.** C'est Node.js en accès direct, Nginx n'intervient pas.

| URL | Résultat |
|-----|----------|
| `http://192.168.1.52:8081/` | ✅ App Node.js (via Nginx → proxy) |
| `http://192.168.1.52:8081/indexcry` | ✅ Site PHP |
| `http://192.168.1.52:8081/ftp` | ✅ Listing FTP |
| `http://192.168.1.52:5173/` | ⚠️ Node direct (test uniquement) |
| `http://192.168.1.52:5173/indexcry` | ❌ Erreur — Node ne connaît pas cette route |
| `http://192.168.1.52:5173/indexcry/index.html` | ❌ Retourne Node au lieu de PHP |

> Le port `5173` est exposé uniquement pour les tests internes. En production, Cloudflare passe par Nginx (port 80) uniquement.

---

## 🔐 Identifiants

### MariaDB
| Paramètre | Valeur |
|-----------|--------|
| Hôte (interne) | `mariadb` |
| Port | `3306` |
| Base de données | `app` |
| Utilisateur | `app` |
| Mot de passe | `apppass` |
| Utilisateur root | `root` |
| Mot de passe root | `rootpass` |

### phpMyAdmin
| Paramètre | Valeur |
|-----------|--------|
| URL | `http://192.168.1.52:8082` |
| Serveur | `mariadb` (pré-configuré) |
| Connexion `app` | `app` / `apppass` |
| Connexion `root` | `root` / `rootpass` |

### FTP (FileZilla)
| Paramètre | Valeur |
|-----------|--------|
| Hôte | `192.168.1.52` |
| Port | `21` |
| Utilisateur | `ftpuser` |
| Mot de passe | `ftppass` |
| Mode | **Passif** obligatoire |
| Ports passifs | `21000` → `21010` |

### Portainer
| Paramètre | Valeur |
|-----------|--------|
| URL | `http://192.168.1.52:9009` |
| Identifiants | Définis au premier lancement |

---

## 📁 Structure des fichiers (via FTP)

```
/home/vsftpd/ftpuser/
├── www/                  → Site web PHP (Nginx)
│   └── archive/          → Backups automatiques
├── node/                 → Application Node.js
├── nginx/                → Configuration Nginx
└── (racine ftp_www)      → Volume FTP dédié
```

### Chemins internes Docker
| Volume | Chemin conteneur | Accès FTP |
|--------|-----------------|-----------|
| `web_www` | `/var/www/html` | `ftpuser/www/` |
| `web_node` | `/app` | `ftpuser/node/` |
| `web_nginx` | `/etc/nginx/conf.d` | `ftpuser/nginx/` |
| `web_db` | `/var/lib/mysql` | — (non exposé) |
| `ftp_www` | `/home/vsftpd/ftpuser` | racine FTP |
| `portainer_data` | `/data` | — (non exposé) |

---

## 🐳 Services détaillés

### Nginx
- **Image :** `nginx:alpine`
- **Port :** `8081 → 80`
- Sert les fichiers PHP via PHP-FPM
- Sert le dossier FTP en lecture seule sur `/var/www/ftp`
- Config personnalisable dans `ftpuser/nginx/`

### PHP
- **Image :** `php:8.3-fpm`
- Extensions installées : `gd`, `mysqli`, `pdo`, `pdo_mysql`
- Support images : `libpng`, `libjpeg`, `libfreetype`

### MariaDB
- **Image :** `mariadb:10.11`
- Non exposé à l'extérieur (réseau interne `webnet` uniquement)
- Données persistées dans le volume `web_db`

### Node.js
- **Image :** `node:20-alpine`
- **Port :** `5173`
- **Mode :** `production`
- Build automatique au démarrage : `npm install --include=dev && npm run build && node server.js`
- `node_modules` non inclus dans les backups (recréé automatiquement)

### FTP (vsftpd)
- **Image :** `fauria/vsftpd`
- Mode passif configuré sur `192.168.1.52`
- Permissions auto-corrigées toutes les 30s par `permissions-fixer`

### Nginx — Configuration & Routage

La configuration est dans le volume `web_nginx` → accessible via FTP dans `ftpuser/nginx/`.

#### Serveur principal (localhost / domaine racine)

| URL | Destination | Type |
|-----|-------------|------|
| `http://192.168.1.52:8081/` | `node:5173` | Proxy Node.js (WebSocket supporté) |
| `http://192.168.1.52:8081/indexcry` | `/var/www/html/indexcry` | Statique + PHP |
| `http://192.168.1.52:8081/ftp` | `/var/www/ftp` | Listing FTP (autoindex) |

#### Domaines externes (via Cloudflare Tunnel)

| Domaine | Destination | Type |
|---------|-------------|------|
| `solutionfle.fr` | `node:5173` | Application Node.js |
| `indexcry.solutionfle.fr` | `/var/www/html/indexcry` | Site statique + PHP |
| `atelier.solutionfle.fr` | Redirect → `solutionfle.fr/spell.html` | 301 permanent |

#### Détails importants
- **Client max body :** `64M` (upload PHP limité à 64 Mo)
- **IP réelle :** récupérée depuis l'en-tête `CF-Connecting-IP` (Cloudflare)
- **HTTPS :** signalé à PHP via `fastcgi_param HTTPS on` et `HTTP_X_FORWARDED_PROTO https`
- **WebSocket Node :** supporté via `Upgrade` / `Connection: upgrade`

#### Fichiers PHP
PHP-FPM écoute sur `php:9000`. Les fichiers `.php` sont traités uniquement dans :
- `/indexcry` (serveur principal)
- `indexcry.solutionfle.fr` (serveur de domaine)

---

### Node.js — Chemins & Déploiement

| Élément | Valeur |
|---------|--------|
| Répertoire de travail | `/app` (dans le conteneur) |
| Accès FTP | `ftpuser/node/` |
| Port | `5173` |
| Commande démarrage | `npm install --include=dev && npm run build && node server.js` |

#### Deux points d'accès à l'app Node
- **Local réseau :** `http://192.168.1.52:5173` (direct Node)
- **Via Nginx :** `http://192.168.1.52:8081/` → proxy vers Node
- **Externe :** `https://solutionfle.fr` → Cloudflare → Nginx → Node

#### Fichiers à déployer via FTP dans `ftpuser/node/`
```
/app (ftpuser/node/)
├── server.js         → point d'entrée Node
├── package.json      → dépendances
├── vite.config.js    → config build Vite (si applicable)
├── src/              → sources
└── dist/             → généré automatiquement au démarrage
```
> `node_modules/` est recréé automatiquement au démarrage — ne pas l'uploader via FTP.

---

### Cloudflared
- Tunnel Cloudflare vers `http://nginx:80`
- Accès externe sécurisé sans ouvrir de ports sur le routeur

### Portainer
- **Image :** `portainer/portainer-ce:latest`
- Accès au socket Docker en lecture seule
- Ports : `9009` (HTTP) et `9443` (HTTPS)

---

## 💾 Backup & Restauration

### Backup automatique
- Fichier : `docker-compose.backup.yml`
- Archive créée dans : `ftpuser/www/archive/`
- Format : `webstack_YYYY-MM-DD_HH-MM.tar.gz`
- Rotation automatique : **7 jours**
- Contenu : dump SQL + volumes www, nginx, node, ftp, portainer

### Restauration
Voir le fichier `RESTORE_INSTRUCTIONS.md` et `docker-compose.restore.yml`

---

## ⚠️ Notes importantes

- Le nom du stack dans Portainer doit **toujours** être `webstack`
- En CLI Docker : toujours utiliser `-p webstack`
- L'IP `192.168.1.52` doit être mise à jour dans `PASV_ADDRESS` si la machine change d'IP
- MariaDB doit **tourner** pendant une restauration
- PHP-FPM se recompile à chaque démarrage du conteneur (normal, ~1-2 min)
