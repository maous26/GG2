"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.redis = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const ioredis_1 = __importDefault(require("ioredis"));
const node_cron_1 = __importDefault(require("node-cron"));
const mongoose_1 = __importDefault(require("mongoose"));
const database_1 = require("./config/database");
// Enhanced middleware imports
const logger_1 = require("./config/logger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logger_1.logger; } });
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const security_middleware_1 = require("./middleware/security.middleware");
const performance_middleware_1 = __importDefault(require("./middleware/performance.middleware"));
const validation_middleware_1 = require("./middleware/validation.middleware");
const databaseHealth_service_1 = __importDefault(require("./services/databaseHealth.service"));
const securityAudit_service_1 = __importDefault(require("./services/securityAudit.service"));
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const ubscription_routes_1 = __importDefault(require("./routes/ubscription.routes"));
const scanning_routes_1 = __importDefault(require("./routes/scanning.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const createTestAlerts_1 = require("./utils/createTestAlerts");
// Load environment variables
dotenv_1.default.config();
// Initialize Express
const app = (0, express_1.default)();
exports.app = app;
app.set('trust proxy', true); // Enable trust proxy for all proxies
const PORT = process.env.PORT || 3001;
// Connect to MongoDB
(0, database_1.connectDB)();
// Setup database monitoring
databaseHealth_service_1.default.setupMonitoring();
// Redis connection (still using Redis for caching)
const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
exports.redis = redis;
// Enhanced security and performance middleware
app.use(security_middleware_1.securityHeaders);
app.use(security_middleware_1.requestLogger);
app.use(security_middleware_1.suspiciousActivityDetector);
app.use(performance_middleware_1.default.middleware());
app.use(security_middleware_1.speedLimiter);
// CORS Configuration - MUST be first
app.use((0, cors_1.default)({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
// Middleware
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use(validation_middleware_1.sanitize);
// Enhanced rate limiting with granular controls
app.use('/api/auth', security_middleware_1.authRateLimit);
app.use('/api/admin/kpis', security_middleware_1.adminDashboardRateLimit); // More generous for dashboard
app.use('/api/admin/stats', security_middleware_1.adminDashboardRateLimit); // More generous for stats
app.use('/api/admin/metrics', security_middleware_1.adminDashboardRateLimit); // More generous for metrics
app.use('/api/admin/security', security_middleware_1.adminDashboardRateLimit); // More generous for security dashboard
app.use('/api/admin', security_middleware_1.adminRateLimit); // Standard admin rate limit for other operations
app.use('/api/', security_middleware_1.apiRateLimit);
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/alerts', alert_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/subscriptions', ubscription_routes_1.default);
app.use('/api/scanning', scanning_routes_1.default);
app.use('/api/users', user_routes_1.default);
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
// Enhanced health check endpoints
app.get('/health', async (req, res) => {
    try {
        const mongoStatus = mongoose_1.default.connection.readyState === 1 ? 'connected' : 'disconnected';
        const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';
        const dbHealth = await databaseHealth_service_1.default.checkHealth();
        const performanceStats = performance_middleware_1.default.getHealthStatus();
        const overallStatus = mongoStatus === 'connected' &&
            redisStatus === 'connected' &&
            dbHealth.status !== 'unhealthy' &&
            performanceStats.status !== 'unhealthy' ? 'healthy' : 'unhealthy';
        res.json({
            status: overallStatus,
            timestamp: new Date().toISOString(),
            services: {
                mongodb: mongoStatus,
                redis: redisStatus,
                database: dbHealth.status,
                performance: performanceStats.status
            },
            details: {
                database: dbHealth,
                performance: performanceStats
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Health check failed', { error });
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});
// Detailed health check for monitoring systems
app.get('/health/detailed', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const dbHealth = await databaseHealth_service_1.default.checkHealth();
    const performanceStats = performance_middleware_1.default.getStats();
    res.json({
        timestamp: new Date().toISOString(),
        database: dbHealth,
        performance: performanceStats,
        redis: {
            status: redis.status,
            memory: await redis.info('memory'),
            keyspace: await redis.info('keyspace')
        }
    });
}));
// Performance metrics endpoint
app.get('/metrics', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const stats = performance_middleware_1.default.getStats();
    res.json(stats);
}));
// Security dashboard endpoint
app.get('/security/dashboard', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    const dashboardData = securityAudit_service_1.default.getDashboardData();
    const breachIndicators = await securityAudit_service_1.default.checkDataBreachIndicators();
    res.json({
        timestamp: new Date().toISOString(),
        security: dashboardData,
        breachCheck: breachIndicators
    });
}));
// Database maintenance endpoint (admin only)
app.post('/admin/maintenance', (0, errorHandler_middleware_1.asyncHandler)(async (req, res) => {
    // This should be protected by admin middleware in production
    const results = await databaseHealth_service_1.default.performMaintenance();
    res.json({
        success: true,
        maintenance: results,
        timestamp: new Date().toISOString()
    });
}));
// Error handling middleware (must be last)
app.use(errorHandler_middleware_1.errorHandler);
// Start server
app.listen(PORT, () => {
    logger_1.logger.info(`Server running on port ${PORT}`);
});
// Import background jobs
require("./cron/strategicFlightScanner");
const mlMaturityService_1 = require("./services/mlMaturityService");
const databaseExtended_1 = require("./utils/databaseExtended");
// Initialize ML Maturity automated evaluation
const mlMaturityService = new mlMaturityService_1.MLMaturityService();
// Schedule ML maturity evaluation every Sunday at 2:00 AM
node_cron_1.default.schedule('0 2 * * 0', async () => {
    try {
        console.log('🧠 Starting weekly ML maturity evaluation...');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Last 7 days
        await mlMaturityService.calculateMaturity(startDate, endDate);
        console.log('✅ Weekly ML maturity evaluation completed');
    }
    catch (error) {
        console.error('❌ Error in weekly ML maturity evaluation:', error);
    }
});
console.log('🤖 ML maturity automated evaluation scheduled (weekly on Sundays at 2:00 AM)');
// Schedule security audit cleanup every day at 4:00 AM
node_cron_1.default.schedule('0 4 * * *', async () => {
    try {
        logger_1.logger.info('🔒 Starting daily security audit cleanup...');
        securityAudit_service_1.default.cleanup();
        logger_1.logger.info('✅ Daily security audit cleanup completed');
    }
    catch (error) {
        logger_1.logger.error('❌ Error in daily security audit cleanup:', error);
    }
});
// Schedule database maintenance every Sunday at 3:00 AM
node_cron_1.default.schedule('0 3 * * 0', async () => {
    try {
        logger_1.logger.info('🔧 Starting weekly database maintenance...');
        await databaseHealth_service_1.default.performMaintenance();
        logger_1.logger.info('✅ Weekly database maintenance completed');
    }
    catch (error) {
        logger_1.logger.error('❌ Error in weekly database maintenance:', error);
    }
});
logger_1.logger.info('🔒 Security and maintenance schedules initialized');
// Initialize test data on startup (only in development)
if (false && process.env.NODE_ENV !== 'production') { // DÉSACTIVÉ pour éviter les fausses données
    setTimeout(async () => {
        try {
            console.log('🔄 Initializing test data and database optimization...');
            // Create database indexes for performance
            await (0, databaseExtended_1.createExtendedIndexes)();
            // Initialize test alerts - DÉSACTIVÉ
            // await createTestAlerts();
            console.log('✅ Database optimization completed (test data disabled)');
        }
        catch (error) {
            console.error('❌ Error initializing database:', error);
        }
    }, 5000); // Wait 5 seconds after startup
    // Schedule cleanup of old alerts every day at 3:00 AM
    node_cron_1.default.schedule('0 3 * * *', async () => {
        try {
            await (0, createTestAlerts_1.cleanupOldAlerts)();
            await (0, databaseExtended_1.optimizeDatabase)(); // Add database optimization to daily cleanup
        }
        catch (error) {
            console.error('❌ Error cleaning up old alerts:', error);
        }
    });
}
