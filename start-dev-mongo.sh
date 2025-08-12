#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Démarrage de GlobeGenius avec MongoDB...${NC}"

# Check .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Fichier .env manquant !${NC}"
    exit 1
fi

# Start Docker services
echo -e "${BLUE}🐳 Démarrage de MongoDB et Redis...${NC}"
docker-compose up -d mongodb redis

# Wait for MongoDB
echo -e "${BLUE}⏳ Attente de MongoDB...${NC}"
until docker exec globegenius-mongodb-1 mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "${GREEN} OK${NC}"

# Seed database if needed
echo -e "${BLUE}🌱 Initialisation de la base de données...${NC}"
cd backend
npm run seed
cd ..

# Start services
echo -e "${BLUE}🔧 Démarrage du Backend...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

echo -e "${BLUE}🤖 Démarrage du ML Service...${NC}"
cd ml-service
source venv/bin/activate
uvicorn main:app --reload --port 8000 &
ML_PID=$!
cd ..

echo -e "${BLUE}🎨 Démarrage du Frontend...${NC}"
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

sleep 5

echo -e "${GREEN}🎉 GlobeGenius est démarré !${NC}"
echo ""
echo "📱 Frontend : http://localhost:3000"
echo "🔧 Backend API : http://localhost:3001"
echo "🤖 ML Service : http://localhost:8000"
echo "👨‍💼 Admin : http://localhost:3000/admin"
echo "📊 MongoDB : mongodb://localhost:27017"

trap "kill $BACKEND_PID $ML_PID $FRONTEND_PID 2>/dev/null; docker-compose stop" EXIT
wait
