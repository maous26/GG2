#!/bin/bash

echo "🔑 Test de connexion Premium depuis la Landing Page"
echo "=================================================="

# Utilisons le compte créé précédemment
EMAIL="premium-test-1753952639@example.com"
PASSWORD="SecurePass123!"

echo "📧 Email de test: $EMAIL"
echo "🔐 Mot de passe: $PASSWORD"

# Test de connexion Premium
echo ""
echo "1️⃣ Test connexion Premium API..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "✅ Réponse connexion API:"
echo "$LOGIN_RESPONSE" | jq

# Extraction des données de réponse
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_SUBSCRIPTION=$(echo "$LOGIN_RESPONSE" | jq -r '.user.subscription_type')
USER_EMAIL=$(echo "$LOGIN_RESPONSE" | jq -r '.user.email')

echo ""
echo "📊 Résumé du test de connexion Premium:"
echo "======================================"
echo "👤 Email: $USER_EMAIL"
echo "💳 Type d'abonnement: $USER_SUBSCRIPTION"
echo "🎫 Token reçu: ${TOKEN:0:20}..."

echo ""
if [ "$TOKEN" != "null" ] && [ "$USER_SUBSCRIPTION" = "premium" ]; then
  echo "🎉 CONNEXION PREMIUM RÉUSSIE !"
  echo "✅ Token JWT généré correctement"
  echo "✅ Type d'abonnement confirmé: Premium"
  echo "✅ API de connexion fonctionnelle"
  echo ""
  echo "🌐 Test Frontend:"
  echo "   1. Allez sur http://localhost:3000"
  echo "   2. Cliquez sur '🔑 Se connecter' (bouton vert en bas)"
  echo "   3. Entrez vos identifiants:"
  echo "      Email: $EMAIL"
  echo "      Mot de passe: $PASSWORD"
  echo "   4. Vous devriez être redirigé vers votre dashboard premium !"
  echo ""
  echo "📱 Parcours utilisateur:"
  echo "   Landing Page → Bouton Se connecter → Formulaire → Dashboard Premium"
else
  echo "❌ PROBLÈME DÉTECTÉ:"
  if [ "$TOKEN" = "null" ]; then
    echo "❌ Échec de génération du token"
  fi
  if [ "$USER_SUBSCRIPTION" != "premium" ]; then
    echo "❌ Type d'abonnement incorrect: $USER_SUBSCRIPTION"
  fi
fi

echo ""
echo "🔗 Liens utiles:"
echo "   🏠 Landing Page: http://localhost:3000"
echo "   🎛️ Console Admin: http://localhost:3000 (admin@globegenius.app / GG2024Admin!)" 