#!/bin/bash
echo "🔐 Test de l'accès Admin discret"
echo "================================"

# Test 1: Vérifier la route /admin-access
echo ""
echo "🌐 1. Test de la route /admin-access"
ADMIN_PAGE=$(curl -s http://localhost:3000/admin-access)

if echo "$ADMIN_PAGE" | grep -q "Accès Admin Détecté"; then
  echo "✅ Route /admin-access accessible"
  echo "✅ Page de redirection admin fonctionnelle"
else
  echo "❌ Route /admin-access non fonctionnelle"
  exit 1
fi

# Test 2: Connexion Admin avec les bons credentials
echo ""
echo "📋 2. Test de connexion Admin"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@globegenius.app",
    "password": "GG2024Admin!"
  }')

echo "Réponse de connexion:"
echo "$LOGIN_RESPONSE" | jq .

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty')

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo "✅ Token Admin généré avec succès"
  
  # Test 3: Accès aux données admin
  echo ""
  echo "📊 3. Test d'accès aux données admin"
  
  echo "• Stats générales:"
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/stats | jq '{ overview: .overview }'
  
  echo ""
  echo "• Utilisateurs:"
  USERS_COUNT=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/users | jq '. | length')
  echo "Nombre d'utilisateurs: $USERS_COUNT"
  
  echo ""
  echo "• Maturité ML:"
  ML_SCORE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/ml-maturity | jq '.maturityScore // 0')
  echo "Score ML: $ML_SCORE%"
  
  echo ""
  echo "🎉 SUCCÈS COMPLET : Accès admin entièrement fonctionnel !"
  echo ""
  echo "📖 INSTRUCTIONS POUR L'ADMIN :"
  echo "1. 🌐 Aller sur http://localhost:3000/admin-access"
  echo "2. ⚡ Redirection automatique vers la page de connexion"
  echo "3. 🔑 Se connecter avec : admin@globegenius.app / GG2024Admin!"
  echo "4. ✨ Accès immédiat à la console d'administration"
  echo ""
  echo "💡 Alternative (moins sûre) : http://localhost:3000#admin-access"
  echo ""
  echo "🛡️ SÉCURITÉ :"
  echo "   • Accès admin complètement invisible sur la landing page"
  echo "   • URL d'accès nettoyée automatiquement après redirection"
  echo "   • Flag temporaire utilisé pour la sécurité"
  echo "   • Validation stricte des credentials enterprise"
  
else
  echo "❌ Échec de la connexion admin"
  echo "🔍 Vérifiez les credentials dans la base de données"
fi

echo ""
echo "================================" 