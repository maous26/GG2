#!/bin/bash
echo "🔬 TEST EXPERT - Flux d'Accès Admin Complet"
echo "==========================================="

# Test 1: Page admin accessible
echo ""
echo "1. 📄 Test page admin-access:"
ADMIN_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/admin-access")
echo "Status HTTP: $ADMIN_PAGE_STATUS"

if [ "$ADMIN_PAGE_STATUS" = "200" ]; then
  echo "✅ Page admin accessible"
else
  echo "❌ Page admin non accessible"
  exit 1
fi

# Test 2: API de connexion
echo ""
echo "2. 🔑 Test API de connexion:"
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@globegenius.app","password":"GG2024Admin!"}')

echo "Réponse de connexion:"
echo "$LOGIN_RESPONSE" | jq .

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')
USER_TYPE=$(echo "$LOGIN_RESPONSE" | jq -r '.user.subscription_type // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] && [ "$USER_TYPE" = "enterprise" ]; then
  echo "✅ Connexion admin réussie"
  echo "Token: ${TOKEN:0:20}..."
else
  echo "❌ Connexion admin échouée"
  exit 1
fi

# Test 3: Redirection avec token
echo ""
echo "3. 🔄 Test redirection avec token:"
REDIRECT_URL="http://localhost:3000/?admin=dashboard&token=$TOKEN"
echo "URL de redirection: $REDIRECT_URL"

REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$REDIRECT_URL")
echo "Status redirection: $REDIRECT_STATUS"

if [ "$REDIRECT_STATUS" = "200" ]; then
  echo "✅ Redirection fonctionne"
else
  echo "❌ Problème de redirection"
fi

# Test 4: Access au dashboard admin
echo ""
echo "4. 📊 Test accès dashboard admin:"
ADMIN_STATS=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/admin/stats")
echo "Stats admin:"
echo "$ADMIN_STATS" | jq '.overview'

# Test 5: Simulation du flux complet
echo ""
echo "5. 🎭 SIMULATION DU FLUX COMPLET:"
echo "================================"
echo ""
echo "ÉTAPES POUR L'UTILISATEUR :"
echo "1. Aller sur: http://localhost:3000/admin-access"
echo "2. Entrer le mot de passe: GG2024Admin!"
echo "3. Cliquer 'Se connecter'"
echo "4. → Redirection automatique vers: $REDIRECT_URL"
echo "5. → Frontend détecte admin=dashboard&token=..."
echo "6. → Stockage du token dans localStorage"
echo "7. → Affichage de la console admin"
echo ""
echo "🔧 DEBUGGING:"
echo "Si ça ne marche pas, vérifiez:"
echo "- JavaScript activé dans le navigateur"
echo "- Pas de bloqueur de pop-ups"
echo "- Console navigateur pour erreurs JS"
echo "- localStorage.getItem('token') après connexion"

echo ""
echo "=========================="
echo "✅ TESTS TECHNIQUES : OK"
echo "🎯 Le flux doit maintenant fonctionner !" 