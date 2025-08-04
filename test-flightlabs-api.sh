#!/bin/bash

echo "🛩️ Test API FlightLabs - Données réelles vs Mock"
echo "=============================================="

# Test 1: Vérifier si l'API key est configurée
echo ""
echo "1️⃣ Vérification configuration API..."
docker-compose exec backend printenv | grep -E "(FLIGHTLABS|API)" | head -5

# Test 2: Appel direct à l'API FlightLabs
echo ""
echo "2️⃣ Test direct API FlightLabs..."
API_KEY="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI0IiwianRpIjoiZjg3NWZiNGZiMzJmYzNiNzI5OTUwZGU5MjM4NGJlNTYyYTMxZWQwM2U3ZTBjOTRiZWU0NjM3YjUyYjI2ZDNkZmE4ZTQ0YTMwZGQ3NzJiYjYiLCJpYXQiOjE3NTEwOTY2NTAsIm5iZiI6MTc1MTA5NjY1MCwiZXhwIjoxNzgyNjMyNjUwLCJzdWIiOiIyNTI2MCIsInNjb3BlcyI6W119.BRurvmgkxnm2Mo-Ew0BRE9fHOdIa1S_j7M19pDcrdAUdQvW41oPl-4mdTm19n1VaMTI5rxQBMAy-5-9HZC_pBQ"

echo "⏳ Tentative d'appel API FlightLabs direct..."
RESPONSE=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $API_KEY" \
  "https://app.goflightlabs.com/api/v1/flights/search?origin=CDG&destination=JFK&departure_date=2025-08-15&adults=1&currency=EUR&max_results=3" \
  --connect-timeout 10 --max-time 20)

HTTP_CODE="${RESPONSE: -3}"
BODY="${RESPONSE%???}"

echo "🔗 Status HTTP: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ API FlightLabs accessible !"
  echo "📄 Premiers résultats:"
  echo "$BODY" | head -200
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ Endpoint non trouvé (404)"
  echo "💡 L'API utilise probablement des données mock"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "🔐 Non autorisé (401) - API key invalide/expirée"
  echo "💡 L'API utilise probablement des données mock"
else
  echo "⚠️ Erreur inattendue: $HTTP_CODE"
  echo "📄 Réponse:"
  echo "$BODY" | head -100
fi

# Test 3: Analyser les logs backend pour type de données
echo ""
echo "3️⃣ Analyse des logs backend..."
echo "🔍 Recherche d'indicateurs de données mock..."

MOCK_INDICATORS=$(docker-compose logs backend --tail=100 | grep -E "(mock|simulation|generateMock|estimated)" -i | wc -l)
REAL_API_INDICATORS=$(docker-compose logs backend --tail=100 | grep -E "(API call|FlightLabs|response)" -i | wc -l)

echo "📊 Indicateurs trouvés:"
echo "   🎭 Mock/Simulation: $MOCK_INDICATORS mentions"
echo "   🌐 API réelle: $REAL_API_INDICATORS mentions"

# Test 4: Vérifier les données dans la base
echo ""
echo "4️⃣ Analyse des alertes en base..."
RECENT_ALERTS=$(curl -s http://localhost:3000/api/alerts | jq '.[:3]' 2>/dev/null)

if [ "$?" -eq 0 ]; then
  echo "📬 Dernières alertes créées:"
  echo "$RECENT_ALERTS" | jq -r '.[] | "   ✈️  \(.origin) → \(.destination) | \(.airline) | €\(.price) (-\(.discountPercentage)%)"' 2>/dev/null
  
  # Analyser les patterns de prix pour détecter si c'est mock
  PRICES=$(echo "$RECENT_ALERTS" | jq -r '.[].price' 2>/dev/null)
  if [ ! -z "$PRICES" ]; then
    echo ""
    echo "💰 Analyse des prix:"
    echo "   Prix trouvés: $(echo "$PRICES" | tr '\n' ' ')"
    
    # Les prix mock sont souvent très réguliers
    UNIQUE_PRICES=$(echo "$PRICES" | sort -u | wc -l)
    TOTAL_PRICES=$(echo "$PRICES" | wc -l)
    
    if [ $UNIQUE_PRICES -eq $TOTAL_PRICES ]; then
      echo "   📈 Variation de prix: Haute (probablement réelles)"
    else
      echo "   📊 Variation de prix: Patterns répétitifs (probablement mock)"
    fi
  fi
else
  echo "❌ Impossible de récupérer les alertes"
fi

# Test 5: Conclusion
echo ""
echo "📋 CONCLUSION:"
echo "=============="

if [ "$HTTP_CODE" = "200" ]; then
  echo "🎉 API FlightLabs FONCTIONNELLE !"
  echo "✅ Appels API réels en cours"
  echo "📊 Les données de vol sont authentiques"
elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "401" ]; then
  echo "🎭 MODE SIMULATION ACTIVÉ"
  echo "✅ Le système fonctionne avec des données mock"
  echo "💡 Avantages:"
  echo "   - Pas de limite d'appels API"
  echo "   - Tests illimités"
  echo "   - Données cohérentes pour développement"
  echo ""
  echo "⚠️ Pour utiliser FlightLabs réel:"
  echo "   1. Vérifier que l'API key est valide"
  echo "   2. Vérifier l'endpoint correct"
  echo "   3. Vérifier les limites de quota"
else
  echo "❓ État incertain de l'API FlightLabs"
fi

echo ""
echo "🔗 Liens:"
echo "   🏠 Dashboard: http://localhost:3000"
echo "   📊 API Status: http://localhost:3000/api/scanning/status"
echo "   🎛️ Admin: http://localhost:3000 (admin@globegenius.app / GG2024Admin!)" 