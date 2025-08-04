#!/bin/bash

echo "🧪 Test complet du processus d'onboarding Premium"
echo "================================================="

# Génération d'un email unique
TIMESTAMP=$(date +%s)
EMAIL="test-onboarding-${TIMESTAMP}@example.com"

echo "📧 Email de test: $EMAIL"

# Étape 1: Inscription Premium
echo ""
echo "1️⃣ Test inscription Premium..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"test123\",\"subscription_type\":\"premium\"}")

echo "✅ Réponse inscription:"
echo "$REGISTER_RESPONSE" | jq

# Extraction de l'userId
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id')

if [ "$USER_ID" = "null" ] || [ -z "$USER_ID" ]; then
  echo "❌ Erreur: Impossible d'extraire l'userId"
  exit 1
fi

echo "🆔 User ID: $USER_ID"

# Étape 2: Sauvegarde des préférences complètes
echo ""
echo "2️⃣ Test sauvegarde préférences complètes..."
PREFERENCES_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/auth/users/preferences \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"preferences\": {
      \"additionalAirports\": [\"LYS\", \"NCE\", \"TLS\"],
      \"dreamDestinations\": [
        {\"destination\": \"Tokyo\", \"airportCode\": \"NRT\", \"priority\": \"high\"},
        {\"destination\": \"New York\", \"airportCode\": \"JFK\", \"priority\": \"medium\"},
        {\"destination\": \"Reykjavik\", \"airportCode\": \"\", \"priority\": \"low\"}
      ],
      \"travelerType\": \"adventure\",
      \"travelPeriod\": {
        \"flexible\": false,
        \"specificPeriods\": [
          {\"type\": \"season\", \"value\": \"été\", \"name\": \"☀️ Été (Juin-Août)\"},
          {\"type\": \"month\", \"value\": \"décembre\", \"name\": \"Décembre\"},
          {\"type\": \"season\", \"value\": \"printemps\", \"name\": \"🌸 Printemps (Mars-Mai)\"}
        ]
      },
      \"notificationStyle\": \"casual\",
      \"budgetRange\": {\"min\": 600, \"max\": 2800, \"currency\": \"EUR\"}
    },
    \"onboardingCompleted\": true
  }")

echo "✅ Réponse préférences:"
echo "$PREFERENCES_RESPONSE" | jq

# Vérification du profil completeness
COMPLETENESS=$(echo "$PREFERENCES_RESPONSE" | jq -r '.user.profileCompleteness')

echo ""
echo "📊 Résumé du test:"
echo "=================="
echo "👤 Utilisateur créé: $EMAIL"
echo "🆔 User ID: $USER_ID"
echo "📈 Profile completeness: $COMPLETENESS%"
echo "✈️ Aéroports additionnels: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.additionalAirports | length') configurés"
echo "🌍 Destinations de rêve: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.dreamDestinations | length') configurées"
echo "📅 Périodes spécifiques: $(echo "$PREFERENCES_RESPONSE" | jq -r '.user.preferences.travelPeriod.specificPeriods | length') configurées"

if [ "$COMPLETENESS" = "100" ]; then
  echo ""
  echo "🎉 SUCCÈS: Processus d'onboarding complet validé !"
  echo "✅ L'utilisateur premium est prêt à recevoir des alertes personnalisées"
else
  echo ""
  echo "⚠️  ATTENTION: Profile completeness = $COMPLETENESS% (attendu: 100%)"
fi

echo ""
echo "🔗 Frontend accessible sur: http://localhost:3000"
echo "🔗 Backend accessible sur: http://localhost:3001" 