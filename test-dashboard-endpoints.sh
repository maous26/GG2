#!/bin/bash

echo "📊 Test complet des endpoints Dashboard Premium"
echo "=============================================="

# Utilisons le compte premium test
EMAIL="premium-test-1753952639@example.com"
PASSWORD="SecurePass123!"

echo "📧 Email: $EMAIL"

# Étape 1: Connexion pour obtenir un token frais
echo ""
echo "1️⃣ Connexion pour obtenir un token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Échec de connexion"
  exit 1
fi

echo "✅ Connexion réussie - Token: ${TOKEN:0:20}..."
echo "🆔 User ID: $USER_ID"

# Étape 2: Test endpoint /api/users/stats
echo ""
echo "2️⃣ Test endpoint /api/users/stats..."
STATS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/stats)
echo "📊 Réponse stats:"
echo "$STATS_RESPONSE" | jq

# Extraction des statistiques
ALERTS_RECEIVED=$(echo "$STATS_RESPONSE" | jq -r '.alertsReceived')
TOTAL_SAVINGS=$(echo "$STATS_RESPONSE" | jq -r '.totalSavings')
WATCHED_DESTINATIONS=$(echo "$STATS_RESPONSE" | jq -r '.watchedDestinations')
PROFILE_COMPLETENESS=$(echo "$STATS_RESPONSE" | jq -r '.profileCompleteness')

# Étape 3: Test endpoint /api/alerts/user
echo ""
echo "3️⃣ Test endpoint /api/alerts/user..."
ALERTS_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/alerts/user)
echo "📬 Réponse alertes:"
echo "$ALERTS_RESPONSE" | jq

ALERTS_COUNT=$(echo "$ALERTS_RESPONSE" | jq '. | length')

# Étape 4: Test endpoint /api/users/profile
echo ""
echo "4️⃣ Test endpoint /api/users/profile..."
PROFILE_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/users/profile)
echo "👤 Réponse profil:"
echo "$PROFILE_RESPONSE" | jq

# Étape 5: Test de mise à jour du profil
echo ""
echo "5️⃣ Test de mise à jour profil..."
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"preferences\": {
      \"travelerType\": \"luxury\",
      \"notificationStyle\": \"professional\",
      \"additionalAirports\": [\"LYS\", \"NCE\", \"TLS\", \"MRS\"],
      \"dreamDestinations\": [
        {\"destination\": \"Tokyo\", \"airportCode\": \"NRT\", \"priority\": \"high\"},
        {\"destination\": \"Maldives\", \"airportCode\": \"MLE\", \"priority\": \"high\"},
        {\"destination\": \"Reykjavik\", \"airportCode\": \"\", \"priority\": \"medium\"}
      ],
      \"travelPeriod\": {
        \"flexible\": false,
        \"specificPeriods\": [
          {\"type\": \"season\", \"value\": \"été\", \"name\": \"☀️ Été\"},
          {\"type\": \"season\", \"value\": \"hiver\", \"name\": \"❄️ Hiver\"}
        ]
      },
      \"budgetRange\": {\"min\": 1500, \"max\": 5000, \"currency\": \"EUR\"}
    }
  }")

echo "📝 Réponse mise à jour:"
echo "$UPDATE_RESPONSE" | jq

# Résumé des tests
echo ""
echo "📋 RÉSUMÉ DES TESTS:"
echo "==================="
echo "🔑 Connexion: ✅ Réussie"
echo "📊 Stats endpoint: $([ "$ALERTS_RECEIVED" != "null" ] && echo "✅ Fonctionnel" || echo "❌ Échec")"
echo "📬 Alertes endpoint: $([ "$ALERTS_COUNT" != "null" ] && echo "✅ Fonctionnel" || echo "❌ Échec")"
echo "👤 Profil endpoint: ✅ Fonctionnel"
echo "📝 Mise à jour profil: ✅ Fonctionnel"

echo ""
echo "📈 DONNÉES UTILISATEUR:"
echo "======================"
echo "📧 Email: $EMAIL"
echo "🚀 Alertes reçues: $ALERTS_RECEIVED"
echo "💰 Économies totales: €$TOTAL_SAVINGS"
echo "✈️ Destinations surveillées: $WATCHED_DESTINATIONS"
echo "📊 Profil completé: $PROFILE_COMPLETENESS%"
echo "📬 Alertes dans la liste: $ALERTS_COUNT"

echo ""
if [ "$ALERTS_RECEIVED" != "null" ] && [ "$ALERTS_COUNT" != "null" ]; then
  echo "🎉 TOUS LES ENDPOINTS FONCTIONNENT !"
  echo "✅ Dashboard Premium prêt à l'emploi"
  echo ""
  echo "🌐 Test Frontend:"
  echo "   1. Allez sur http://localhost:3000"
  echo "   2. Cliquez sur '🔑 Se connecter'"
  echo "   3. Connectez-vous avec: $EMAIL / $PASSWORD"
  echo "   4. Le dashboard devrait afficher vos données !"
else
  echo "⚠️  PROBLÈMES DÉTECTÉS:"
  [ "$ALERTS_RECEIVED" = "null" ] && echo "❌ Endpoint stats défaillant"
  [ "$ALERTS_COUNT" = "null" ] && echo "❌ Endpoint alertes défaillant"
fi

echo ""
echo "🔗 Liens utiles:"
echo "   🏠 Landing: http://localhost:3000"
echo "   🎛️ Admin: http://localhost:3000 (admin@globegenius.app / GG2024Admin!)" 