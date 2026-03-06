# 🔄 Procédure de Restauration — Webstack

## Fichiers nécessaires
- `docker-compose.yml` — ton stack principal
- `docker-compose.restore.yml` — le compose de restauration
- `webstack_XXXX-XX-XX_XX-XX.tar.gz` — ton archive de backup

---

## Étapes

### 1️⃣ Préparer le fichier backup
Renommer le fichier backup :
```
webstack_2026-03-05_23-52.tar.gz  →  webstack_restore.tar.gz
```

### 2️⃣ Déployer le stack principal
Dans Portainer → Stacks → Add stack
- **Name:** `webstack` ⚠️ toujours ce nom exact
- Coller le contenu de `docker-compose.yml`
- Cliquer **Deploy**

> Cela crée les volumes et le réseau vides.

### 3️⃣ Uploader le backup via FTP
Se connecter en FTP à `192.168.1.XX:21` (FileZilla, mode Passif)

Déposer `webstack_restore.tar.gz` dans :
```
/home/vsftpd/ftpuser/www/archive/
```

### 4️⃣ ⚠️ Laisser le stack tourner (ne pas stopper !)
MariaDB doit être **actif** pour que la restauration SQL fonctionne.

### 5️⃣ Déployer le compose de restauration
Dans Portainer → Stacks → Add stack
- **Name:** `webstack-restore` (peu importe)
- Coller le contenu de `docker-compose.restore.yml`
- Cliquer **Deploy**

Suivre les logs du conteneur `webstack_restore` :
```
--- Installation des outils ---
--- Vérification du fichier backup ---
--- Extraction de l archive principale ---
--- Restauration www ---
--- Restauration nginx ---
--- Restauration node ---
--- Restauration ftp ---
--- Restauration portainer ---
--- Restauration MariaDB ---
--- Restauration terminée avec succès ! ---
```

### 6️⃣ Supprimer le stack de restauration
Dans Portainer → supprimer le stack `webstack-restore`

### 7️⃣ Redémarrer le stack principal
Dans Portainer → stack `webstack` → Restart

✅ **Restauration terminée !**

---

---

## 🐳 Commandes Docker (si restauration via ligne de commande)

> Toujours utiliser `-p webstack` pour forcer le bon préfixe de noms !

### Déployer le stack principal
```bash
docker-compose -p webstack -f docker-compose.yml up -d
```

### Déployer le restore
```bash
docker-compose -p webstack-restore -f docker-compose.restore.yml up
```
> Sans `-d` pour voir les logs directement dans le terminal.

### Suivre les logs du restore
```bash
docker logs -f webstack_restore
```

### Supprimer le stack restore après
```bash
docker-compose -p webstack-restore -f docker-compose.restore.yml down
```

### Redémarrer le stack principal
```bash
docker-compose -p webstack -f docker-compose.yml restart
```

### Stopper / Supprimer le stack principal
```bash
docker-compose -p webstack -f docker-compose.yml down
```

---

## ⚠️ Points importants

| Point | Détail |
|-------|--------|
| Nom du stack | Toujours `webstack` dans Portainer |
| Nom du backup | Toujours renommer en `webstack_restore.tar.gz` |
| MariaDB | Doit tourner pendant la restauration |
| node_modules | Non inclus dans le backup → recréé automatiquement par `npm install` |
| Fichiers bruts MariaDB | Non inclus → seul le dump SQL est restauré |

---

## 📁 Emplacement des backups automatiques
Les backups quotidiens sont accessibles via FTP dans :
```
/home/vsftpd/ftpuser/www/archive/
```
Rotation automatique après **7 jours**.
