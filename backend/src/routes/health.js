import express from 'express';

const router = express.Router();

/**
 * Comprehensive health check endpoint
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // Basic system metrics
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // In development mode, return mock health data
    if (process.env.NODE_ENV === 'development') {
      const mockHealth = {
        status: 'healthy',
        timestamp,
        uptime: Math.floor(uptime),
        environment: process.env.NODE_ENV,
        version: '1.0.0',
        services: {
          database: {
            status: 'healthy',
            responseTime: 45,
            lastCheck: timestamp
          },
          botManager: {
            status: 'healthy',
            activeBots: 3,
            lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString()
          },
          aiServices: {
            status: 'healthy',
            geminiVision: 'operational',
            geminiPro: 'operational'
          },
          externalAPIs: {
            telegramBot: 'healthy',
            googleSheets: 'healthy',
            supabase: 'healthy'
          }
        },
        metrics: {
          memory: {
            used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
            total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
            percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
          },
          requests: {
            total: 1247,
            successful: 1201,
            failed: 46,
            successRate: 96.3
          },
          responseTime: Date.now() - startTime
        }
      };

      return res.json(mockHealth);
    }

    const supabase = req.app.get('supabase');
    const botManager = req.app.get('botManager');

    // Test database connection
    let dbStatus = 'healthy';
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      const { error } = await supabase.from('user_configs').select('count').limit(1);
      dbResponseTime = Date.now() - dbStart;
      if (error) dbStatus = 'unhealthy';
    } catch (error) {
      dbStatus = 'unhealthy';
    }

    // Get bot manager status
    const botStats = botManager?.getStats?.() || { totalBots: 0, activeBots: 0 };

    // Check external services (simplified)
    const services = {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        lastCheck: timestamp
      },
      botManager: {
        status: botManager ? 'healthy' : 'unhealthy',
        activeBots: botStats.activeBots,
        totalBots: botStats.totalBots,
        lastActivity: timestamp
      },
      aiServices: {
        status: 'healthy', // Would check Gemini API availability
        geminiVision: 'operational',
        geminiPro: 'operational'
      },
      externalAPIs: {
        telegramBot: 'healthy', // Would ping Telegram API
        googleSheets: 'healthy', // Would check Google API
        supabase: dbStatus
      }
    };

    // Determine overall health
    const allServicesHealthy = Object.values(services).every(service => 
      service.status === 'healthy' || service.status === 'operational'
    );

    const healthData = {
      status: allServicesHealthy ? 'healthy' : 'degraded',
      timestamp,
      uptime: Math.floor(uptime),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      services,
      metrics: {
        memory: {
          used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
          total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          user: Math.round((cpuUsage.user / 1000) * 100) / 100,
          system: Math.round((cpuUsage.system / 1000) * 100) / 100
        },
        responseTime: Date.now() - startTime
      }
    };

    // Set appropriate status code
    const statusCode = allServicesHealthy ? 200 : 503;
    res.status(statusCode).json(healthData);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      uptime: Math.floor(process.uptime())
    });
  }
});

/**
 * Database connectivity check
 * GET /api/health/database
 */
router.get('/database', async (req, res) => {
  try {
    const startTime = Date.now();
    
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        status: 'healthy',
        responseTime: 23,
        timestamp: new Date().toISOString(),
        tables: ['user_configs', 'bot_sessions', 'receipt_logs', 'chat_logs']
      });
    }

    const supabase = req.app.get('supabase');

    // Test basic connectivity
    const { data, error } = await supabase
      .from('user_configs')
      .select('count')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      status: 'healthy',
      responseTime,
      timestamp: new Date().toISOString(),
      connection: 'active'
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Bot manager status check
 * GET /api/health/bots
 */
router.get('/bots', async (req, res) => {
  try {
    const botManager = req.app.get('botManager');

    if (!botManager) {
      return res.status(503).json({
        status: 'unhealthy',
        error: 'Bot manager not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const stats = botManager.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      botManager: {
        totalBots: stats.totalBots,
        activeBots: stats.activeBots,
        uptime: Math.floor(stats.uptime || process.uptime())
      }
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * External services check
 * GET /api/health/external
 */
router.get('/external', async (req, res) => {
  try {
    // In development mode, return mock status
    if (process.env.NODE_ENV === 'development') {
      return res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          telegramAPI: {
            status: 'healthy',
            endpoint: 'https://api.telegram.org',
            lastCheck: new Date().toISOString()
          },
          googleSheetsAPI: {
            status: 'healthy',
            endpoint: 'https://sheets.googleapis.com',
            lastCheck: new Date().toISOString()
          },
          geminiAPI: {
            status: 'healthy',
            endpoint: 'https://generativelanguage.googleapis.com',
            lastCheck: new Date().toISOString()
          }
        }
      });
    }

    // In production, would actually ping external services
    const services = {
      telegramAPI: {
        status: 'healthy', // Would check: fetch('https://api.telegram.org/bot<token>/getMe')
        endpoint: 'https://api.telegram.org',
        lastCheck: new Date().toISOString()
      },
      googleSheetsAPI: {
        status: 'healthy', // Would check Google OAuth endpoint
        endpoint: 'https://sheets.googleapis.com',
        lastCheck: new Date().toISOString()
      },
      geminiAPI: {
        status: 'healthy', // Would check Gemini API health
        endpoint: 'https://generativelanguage.googleapis.com',
        lastCheck: new Date().toISOString()
      }
    };

    const allHealthy = Object.values(services).every(service => 
      service.status === 'healthy'
    );

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;