import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import cron from 'node-cron';
import winston from 'winston';
import mongoose from 'mongoose';
import { connectDB } from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import alertRoutes from './routes/alert.routes';
import adminRoutes from './routes/admin.routes';
import subscriptionRoutes from './routes/ubscription.routes';
import scanningRoutes from './routes/scanning.routes';
import userRoutes from './routes/user.routes';
import statsRoutes from './routes/stats.routes';
// import { AIAgent } from './services/aiAgentService'; // Disabled - not available
// import logger from 'winston'; // Using console instead to avoid conflict
import { createTestAlerts, cleanupOldAlerts } from './utils/createTestAlerts';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
app.set('trust proxy', true); // Enable trust proxy for all proxies
const PORT = process.env.PORT || 3001;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Connect to MongoDB
connectDB();

// Redis connection (still using Redis for caching)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// CORS Configuration - MUST be first
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting (after CORS) - TEMPORARILY DISABLED FOR DEBUG
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  skip: (req) => {
    // Skip rate limiting for OPTIONS requests (CORS preflight)
    return req.method === 'OPTIONS';
  }
});
app.use('/api/', limiter);
*/
console.log('🚨 Rate limiter DISABLED for debugging CORS issues');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/scanning', scanningRoutes);
app.use('/api/users', userRoutes);

// ROUTE DUPLIQUÉE SUPPRIMÉE - Une seule route /admin-access maintenant

// Route pour la console admin après connexion
app.get('/admin-dashboard', (req, res) => {
  res.redirect('/');
});

// Test admin access page for debugging
app.get('/test-admin', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Admin Access - GlobeGenius</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .debug { background: #f0f0f0; padding: 15px; margin: 10px 0; border-left: 4px solid #007bff; }
            .step { background: #e8f5e8; padding: 15px; margin: 15px 0; border-radius: 5px; }
            button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 5px; cursor: pointer; margin: 10px; }
            button:hover { background: #0056b3; }
            .error { background: #ffe6e6; border-left: 4px solid #dc3545; }
            .success { background: #e8f5e8; border-left: 4px solid #28a745; }
        </style>
    </head>
    <body>
        <h1>🔧 Debug Console Admin - GlobeGenius</h1>
        
        <div class="step">
            <h3>ÉTAPE 1 : Test direct admin access</h3>
            <button onclick="testAdminAccess()">🚀 Accéder à la console admin</button>
            <div id="debug-logs"></div>
        </div>

        <div class="step">
            <h3>ÉTAPE 2 : Test avec paramètres URL</h3>
            <button onclick="testUrlParams()">🔗 Test ?admin=dashboard</button>
            <button onclick="testHash()">🔗 Test #admin-dashboard</button>
        </div>

        <div class="step">
            <h3>ÉTAPE 3 : Test localStorage</h3>
            <button onclick="testLocalStorage()">💾 Tester localStorage</button>
            <button onclick="clearStorage()">🗑️ Vider cache</button>
        </div>

        <div class="debug">
            <h4>Logs en temps réel :</h4>
            <div id="live-logs" style="font-family: monospace; white-space: pre-wrap;"></div>
        </div>

        <script>
            function log(message, type = 'info') {
                const logs = document.getElementById('live-logs');
                const timestamp = new Date().toLocaleTimeString();
                const color = type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue';
                logs.innerHTML += \`[\${timestamp}] <span style="color: \${color}">\${message}</span>\\n\`;
                logs.scrollTop = logs.scrollHeight;
                console.log(\`[DEBUG] \${message}\`);
            }

            async function testAdminAccess() {
                log('🔍 Test accès admin direct...', 'info');
                
                try {
                    // Test 1 : Login admin
                    log('📝 Tentative de login admin...', 'info');
                    const loginResponse = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: 'admin@globegenius.app',
                            password: 'GG2024Admin!'
                        })
                    });

                    const loginData = await loginResponse.json();
                    log(\`Login response: \${loginResponse.status} - \${JSON.stringify(loginData)}\`, loginResponse.ok ? 'success' : 'error');

                    if (loginResponse.ok && loginData.token) {
                        // Test 2 : Stocker le token
                        localStorage.setItem('token', loginData.token);
                        localStorage.setItem('user', JSON.stringify({
                            id: loginData.user.id || 'admin-id',
                            email: loginData.user.email,
                            type: 'admin',
                            name: 'Administrateur',
                            subscription_type: 'enterprise'
                        }));
                        log('✅ Token stocké avec succès', 'success');

                        // Test 3 : Redirection
                        log('🚀 Redirection vers la console admin...', 'info');
                        window.location.href = '/?admin=dashboard&token=' + loginData.token;
                    } else {
                        log('❌ Échec du login admin', 'error');
                    }
                } catch (error) {
                    log(\`❌ Erreur: \${error.message}\`, 'error');
                }
            }

            function testUrlParams() {
                log('🔗 Test avec paramètres URL...', 'info');
                window.location.href = '/?admin=dashboard';
            }

            function testHash() {
                log('🔗 Test avec hash...', 'info');
                window.location.href = '/#admin-dashboard';
            }

            function testLocalStorage() {
                log('💾 Contenu localStorage:', 'info');
                log(\`Token: \${localStorage.getItem('token')}\`, 'info');
                log(\`User: \${localStorage.getItem('user')}\`, 'info');
            }

            function clearStorage() {
                localStorage.clear();
                sessionStorage.clear();
                log('🗑️ Cache vidé', 'success');
            }

            // Auto-run diagnostics
            document.addEventListener('DOMContentLoaded', function() {
                log('🔧 Page de debug chargée', 'success');
                testLocalStorage();
            });
        </script>
    </body>
    </html>
  `);
});

// Admin access route (existing)
app.get('/admin-access', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Console Admin - GlobeGenius</title>
        <meta charset="UTF-8">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0; padding: 0; height: 100vh;
                display: flex; align-items: center; justify-content: center;
            }
            .container { 
                background: white; padding: 40px; border-radius: 10px; 
                box-shadow: 0 10px 30px rgba(0,0,0,0.2); width: 400px; text-align: center;
            }
            .logo { font-size: 2em; margin-bottom: 20px; }
            input { 
                width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; 
                border-radius: 5px; box-sizing: border-box; font-size: 16px;
            }
            button { 
                width: 100%; padding: 12px; background: #667eea; color: white; 
                border: none; border-radius: 5px; font-size: 16px; cursor: pointer; margin: 10px 0;
            }
            button:hover { background: #5a67d8; }
            .error { color: #e53e3e; margin: 10px 0; }
            .debug { font-family: monospace; font-size: 12px; color: #666; margin: 20px 0; text-align: left; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🌍 GlobeGenius</div>
            <h2>Console d'Administration</h2>
            
            <form id="adminForm">
                <input type="email" id="email" placeholder="Email administrateur" value="admin@globegenius.app" required>
                <input type="password" id="password" placeholder="Mot de passe" required>
                <button type="submit">Se connecter</button>
            </form>
            
            <div id="error" class="error" style="display: none;"></div>
            <div id="debug" class="debug"></div>
        </div>

        <script>
            function debugLog(message) {
                const debugDiv = document.getElementById('debug');
                const timestamp = new Date().toLocaleTimeString();
                debugDiv.innerHTML += \`[\${timestamp}] \${message}<br>\`;
                console.log(\`[ADMIN DEBUG] \${message}\`);
            }

            debugLog('🔧 Page admin chargée');

            document.getElementById('adminForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                // 🔥 NETTOYAGE AUTOMATIQUE DE L'EMAIL
                let email = document.getElementById('email').value;
                email = email.replace(/\/+/g, ''); // Supprimer tous les "/"
                email = email.trim(); // Supprimer les espaces
                document.getElementById('email').value = email; // Remettre l'email nettoyé
                
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('error');
                
                debugLog(\`📝 Tentative de connexion: \${email}\`);
                errorDiv.style.display = 'none';

                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();
                    debugLog(\`📡 Réponse serveur: \${response.status} - \${JSON.stringify(data).substring(0, 100)}...\`);

                    if (response.ok && data.token && data.user.subscription_type === 'enterprise') {
                        debugLog('✅ Login admin réussi');
                        
                        // Stocker les données
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('user', JSON.stringify({
                            id: data.user.id || data.user._id || 'admin-id',
                            email: data.user.email,
                            type: 'admin',
                            name: 'Administrateur',
                            subscription_type: 'enterprise'
                        }));
                        
                        debugLog('💾 Données stockées dans localStorage');
                        debugLog(\`🚀 Redirection vers: /?admin=dashboard&token=\${data.token.substring(0, 10)}...\`);
                        
                        // Redirection avec délai pour debug
                        setTimeout(() => {
                            window.location.href = '/?admin=dashboard&token=' + data.token;
                        }, 1000);
                        
                    } else {
                        debugLog('❌ Échec de connexion');
                        errorDiv.textContent = data.message || 'Identifiants incorrects';
                        errorDiv.style.display = 'block';
                    }
                } catch (error) {
                    debugLog(\`💥 Erreur: \${error.message}\`);
                    errorDiv.textContent = 'Erreur de connexion au serveur';
                    errorDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Stats endpoint

// Health check
app.get('/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';

  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
    redis: redisStatus
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Import background jobs
import './cron/strategicFlightScanner';
import { MLMaturityService } from './services/mlMaturityService';
import { createExtendedIndexes, optimizeDatabase } from './utils/databaseExtended';

// Initialize ML Maturity automated evaluation
const mlMaturityService = new MLMaturityService();

// Schedule ML maturity evaluation every Sunday at 2:00 AM
cron.schedule('0 2 * * 0', async () => {
  try {
    console.log('🧠 Starting weekly ML maturity evaluation...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days
    
    await mlMaturityService.calculateMaturity(startDate, endDate);
    console.log('✅ Weekly ML maturity evaluation completed');
  } catch (error) {
    console.error('❌ Error in weekly ML maturity evaluation:', error);
  }
});

console.log('🤖 ML maturity automated evaluation scheduled (weekly on Sundays at 2:00 AM)');

// Initialize test data on startup (only in development)
if (false && process.env.NODE_ENV !== 'production') { // DÉSACTIVÉ pour éviter les fausses données
  setTimeout(async () => {
    try {
      console.log('🔄 Initializing test data and database optimization...');
      
      // Create database indexes for performance
      await createExtendedIndexes();
      
      // Initialize test alerts - DÉSACTIVÉ
      // await createTestAlerts();
      
      console.log('✅ Database optimization completed (test data disabled)');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
    }
  }, 5000); // Wait 5 seconds after startup
  
  // Schedule cleanup of old alerts every day at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      await cleanupOldAlerts();
      await optimizeDatabase(); // Add database optimization to daily cleanup
    } catch (error) {
      console.error('❌ Error cleaning up old alerts:', error);
    }
  });
}

// Export for testing
export { app, redis, logger };