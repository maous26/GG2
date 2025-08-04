// ===== Installation Script Updated for MongoDB =====
// install-mongodb.sh
#!/bin/bash

echo "🚀 Installation de GlobeGenius avec MongoDB..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}Vérification des prérequis...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js requis mais non installé.${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm requis mais non installé.${NC}" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo -e "${RED}Python 3 requis mais non installé.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker requis mais non installé.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ Prérequis OK${NC}"

# Create project structure
echo -e "${BLUE}Création de la structure du projet...${NC}"

mkdir -p backend/src/{config,models,routes,services,middleware,utils,cron}
mkdir -p frontend/src/{components,pages,services,hooks,utils}
mkdir -p ml-service

# Install Backend
echo -e "${BLUE}Installation du Backend avec MongoDB...${NC}"
cd backend
npm init -y
npm install express mongoose cors helmet compression express-rate-limit dotenv joi winston
npm install redis ioredis bcrypt jsonwebtoken axios node-cron
npm install stripe @sendinblue/client openai @google/generative-ai
npm install --save-dev typescript @types/node @types/express @types/mongoose
npm install --save-dev ts-node nodemon

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF

cd ..

# Setup Environment
echo -e "${BLUE}Configuration de l'environnement...${NC}"
cat > .env.example << 'EOF'
# Database
MONGO_PASSWORD=your_secure_password_here
MONGODB_LOCAL_URI=mongodb://admin:your_secure_password_here@localhost:27017/globegenius?authSource=admin
MONGODB_ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/globegenius?retryWrites=true&w=majority

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# API Keys
FLIGHTLABS_API_KEY=your_flightlabs_api_key_here
BREVO_API_KEY=your_brevo_api_key_here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AI Services
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRES_IN=30d

# Email
EMAIL_FROM=alerts@globegenius.com
BREVO_SENDER_NAME=GlobeGenius

# App Configuration
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Admin
ADMIN_EMAIL=admin@globegenius.com
ADMIN_PASSWORD=change_this_admin_password
EOF

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Fichier .env créé${NC}"
    echo -e "${RED}⚠️  N'oubliez pas de configurer vos clés API dans .env${NC}"
fi

# Start script for MongoDB
cat > start-dev-mongo.sh << 'EOF'
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
EOF

chmod +x start-dev-mongo.sh

echo -e "${GREEN}✅ Installation terminée !${NC}"
echo ""
echo "Prochaines étapes :"
echo "1. Configurer les clés API dans .env"
echo "2. Configurer MongoDB Atlas URI si nécessaire"
echo "3. Lancer l'application : ./start-dev-mongo.sh"