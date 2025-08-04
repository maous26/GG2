# 🔐 ACCÈS ADMIN SIMPLE - GlobeGenius

## 🎯 COMMENT ACCÉDER À LA CONSOLE ADMIN

### ⚡ Méthode Temporaire (Debug)
1. Aller sur **http://localhost:3000**
2. Chercher le bouton rouge **"DEBUG ADMIN"** en haut à droite
3. Cliquer dessus
4. Se connecter avec : `admin@globegenius.app` / `GG2024Admin!`

### 📝 Credentials Admin
- **Email** : `admin@globegenius.app`
- **Mot de passe** : `GG2024Admin!`

## 🔍 DÉPANNAGE

Si le bouton "DEBUG ADMIN" n'apparaît pas :
1. Vérifier que le frontend est bien démarré : `docker-compose logs frontend`
2. Actualiser la page avec Ctrl+F5 (force refresh)
3. Vérifier que vous êtes bien sur `http://localhost:3000`

Si la connexion échoue :
1. Vérifier que le backend fonctionne : `docker-compose logs backend`
2. Tester l'API directement : 
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@globegenius.app","password":"GG2024Admin!"}'
   ```

## ✅ APRÈS LA CONNEXION

Vous devriez voir :
- 🎛️ Console d'Administration
- 📊 Statistiques en temps réel
- 🧠 Machine Learning Maturity Gauge
- 👥 Gestion des utilisateurs

---

**Note** : Le bouton "DEBUG ADMIN" est temporaire pour résoudre le problème d'accès. Il sera masqué une fois le problème résolu. 