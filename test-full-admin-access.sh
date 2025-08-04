#!/bin/bash

echo "🔧 TEST COMPLET - Accès Admin avec Configuration Corrigée"
echo "=========================================================="

echo ""
echo "1. 🔍 Vérification des serveurs..."
echo "   Backend (port 3001):"
BACKEND_STATUS=$(curl -s http://localhost:3001/health | jq -r '.status // "ERROR"')
echo "   📊 Status: $BACKEND_STATUS"

echo "   Frontend (port 3000):"
FRONTEND_STATUS=$(curl -s http://localhost:3000 | grep -q "viewport" && echo "OK" || echo "ERROR")
echo "   📊 Status: $FRONTEND_STATUS"

echo ""
echo "2. 🔗 Test du proxy frontend -> backend..."
PROXY_TEST=$(curl -s http://localhost:3000/api/health | jq -r '.status // "ERROR"')
echo "   📊 Proxy status: $PROXY_TEST"

echo ""
echo "3. 🎯 Test accès admin frontend..."
ADMIN_PAGE=$(curl -s http://localhost:3000/admin-access | grep -c "Console Admin")
if [ "$ADMIN_PAGE" -gt 0 ]; then
    echo "   ✅ Page admin accessible via frontend"
else
    echo "   ❌ Page admin non accessible via frontend"
fi

echo ""
echo "4. 🔐 Test login admin via frontend..."
LOGIN_TEST=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@globegenius.app","password":"GG2024Admin!"}' | jq -r '.user.subscription_type // "ERROR"')
echo "   📊 Login result: $LOGIN_TEST"

echo ""
echo "🎉 INSTRUCTIONS FINALES"
echo "======================="
echo ""
echo "✅ Backend: http://localhost:3001 (API + Admin backend)"
echo "✅ Frontend: http://localhost:3000 (Interface utilisateur)"
echo "🔑 Accès Admin: http://localhost:3000/admin-access"
echo ""
echo "📝 Credentials:"
echo "   Email: admin@globegenius.app"
echo "   Password: GG2024Admin!"
echo ""
if [ "$PROXY_TEST" = "ok" ] && [ "$LOGIN_TEST" = "enterprise" ]; then
    echo "🎊 TOUT FONCTIONNE ! Accès admin opérationnel."
else
    echo "⚠️  Attendre encore quelques secondes le démarrage complet..."
fi