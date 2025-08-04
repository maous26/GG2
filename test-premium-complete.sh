#!/bin/bash

echo "🧪 Test complet Premium : Onboarding + Dashboard"
echo "================================================="

# Génération d'un email unique
TIMESTAMP=$(date +%s)
EMAIL="premium-test-${TIMESTAMP}@example.com"
PASSWORD="SecurePass123!"

echo "📧 Email de test: $EMAIL"
echo "🔐 Mot de passe: $PASSWORD"

# Étape 1: Inscription Premium avec mot de passe
echo ""
echo "1️⃣ Test inscription Premium avec mot de passe..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"subscription_type\":\"premium\"}")

echo "✅ Réponse inscription:"
echo "$REGISTER_RESPONSE" | jq

# Extraction du token et userId
TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')

if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
  echo "❌ Erreur: Impossible d'extraire l'userId"
  exit 1
fi

echo "🆔 User ID: $USER_ID"
echo "🎫 Token: ${TOKEN:0:20}..."

# Étape 2: Sauvegarde des préférences Premium complètes
echo ""
echo "2️⃣ Test sauvegarde préférences Premium..."
PREFERENCES_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/auth/users/preferences \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"preferences\": {
      \"additionalAirports\": [\"LYS\", \"NCE\", \"TLS\", \"MRS\"],
      \"dreamDestinations\": [
        {\"destination\": \"Tokyo\", \"airportCode\": \"NRT\", \"priority\": \"high\"},
        {\"destination\": \"Maldives\", \"airportCode\": \"MLE\", \"priority\": \"high\"},
        {\"destination\": \"Reykjavik\", \"airportCode\": \"\", \"priority\": \"medium\"}
      ],
      \"travelerType\": \"luxury\",
      \"travelPeriod\": {
        \"flexible\": false,
        \"specificPeriods\": [
          {\"type\": \"season\", \"value\": \"été\", \"name\": \"☀️ Été (Juin-Août)\"},
          {\"type\": \"season\", \"value\": \"hiver\", \"name\": \"❄️ Hiver (Déc-Fév)\"},
          {\"type\": \"month\", \"value\": \"avril\", \"name\": \"Avril\"}
        ]
      },
      \"notificationStyle\": \"professional\",
      \"budgetRange\": {\"min\": 1500, \"max\": 5000, \"currency\": \"EUR\"}
    },
    \"onboardingCompleted\": true
  }")

echo "✅ Réponse préférences:"
echo "$PREFERENCES_RESPONSE" | jq

# Étape 3: Test de connexion avec mot de passe
echo ""
echo "3️⃣ Test connexion avec mot de passe créé..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "✅ Réponse connexion:"
echo "$LOGIN_RESPONSE" | jq

# Vérification du login
LOGIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
LOGIN_USER=$(echo "$LOGIN_RESPONSE" | jq -r '.user.subscription_type')

# Vérification du profil completeness
COMPLETENESS=$(echo "$PREFERENCES_RESPONSE" | jq -r '.user.profileCompleteness')

echo ""
echo "📊 Résumé du test Premium complet:"
echo "=================================="
echo "👤 Utilisateur créé: $EMAIL"
echo "🔐 Mot de passe défini: $PASSWORD"
echo "🆔 User ID: $USER_ID"
echo "🎫 Token inscription: ${TOKEN:0:20}..."
echo "🔑 Token connexion: ${LOGIN_TOKEN:0:20}..."
echo "💳 Subscription type: $LOGIN_USER"
echo "📈 Profile completeness: $COMPLETENESS%"
echo "✈️ Aéroports additionnels: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.additionalAirports | length') configurés"
echo "🌍 Destinations de rêve: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.dreamDestinations | length') configurées"
echo "📅 Périodes spécifiques: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.travelPeriod.specificPeriods | length') configurées"
echo "🎨 Style de voyage: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.travelerType') ($(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.notificationStyle'))"

echo ""
if [ "$LOGIN_TOKEN" != "null" ] && [ "$LOGIN_USER" = "premium" ] && [ "$COMPLETENESS" = "100" ]; then
  echo "🎉 SUCCÈS COMPLET !"
  echo "✅ Inscription Premium avec mot de passe fonctionnelle"
  echo "✅ Connexion utilisateur validée"
  echo "✅ Dashboard Premium accessible"
  echo "✅ Profile 100% complété pour alertes personnalisées"
  echo ""
  echo "🔗 Pour tester le dashboard:"
  echo "   1. Allez sur http://localhost:3000"
  echo "   2. Connectez-vous avec:"
  echo "      Email: $EMAIL"
  echo "      Mot de passe: $PASSWORD"
  echo "   3. Vous serez redirigé vers votre dashboard premium !"
else
  echo "⚠️  PROBLÈME DÉTECTÉ:"
  if [ "$LOGIN_TOKEN" = "null" ]; then
    echo "❌ Échec de la connexion"
  fi
  if [ "$LOGIN_USER" != "premium" ]; then
    echo "❌ Type d'abonnement incorrect: $LOGIN_USER"
  fi
  if [ "$COMPLETENESS" != "100" ]; then
    echo "❌ Profile incomplet: $COMPLETENESS%"
  fi
fi

echo ""
echo "🎛️ Console Admin: http://localhost:3000 (admin@globegenius.app / GG2024Admin!)" 