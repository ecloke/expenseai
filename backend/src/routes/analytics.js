import express from 'express';
import { validateUserId } from '../utils/validation.js';

const router = express.Router();

/**
 * Get user expense analytics
 * GET /api/analytics/:user_id
 */
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { timeRange = '30d' } = req.query;

    // Validate user ID
    if (!validateUserId(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get time range for filtering
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development') {
      const mockAnalytics = {
        summary: {
          totalExpenses: 847,
          totalAmount: 1247.89,
          averagePerDay: 41.59,
          categoryCount: 5
        },
        categoryBreakdown: {
          'Food & Dining': { count: 15, total: 456.78, percentage: 36.6 },
          'Shopping': { count: 8, total: 342.11, percentage: 27.4 },
          'Transportation': { count: 5, total: 123.45, percentage: 9.9 },
          'Utilities': { count: 3, total: 234.67, percentage: 18.8 },
          'Entertainment': { count: 7, total: 90.88, percentage: 7.3 }
        },
        dailyTrends: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          amount: Math.random() * 100 + 20,
          count: Math.floor(Math.random() * 5) + 1
        })),
        topStores: [
          { name: 'Starbucks', count: 12, total: 89.40 },
          { name: 'Amazon', count: 8, total: 234.56 },
          { name: 'Uber', count: 6, total: 67.89 },
          { name: 'Whole Foods', count: 5, total: 156.78 },
          { name: 'Target', count: 4, total: 123.45 }
        ]
      };

      return res.json({
        success: true,
        data: mockAnalytics,
        timeRange,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString()
        }
      });
    }

    const supabase = req.app.get('supabase');

    // Get expense summary
    const { data: expenses, error: expensesError } = await supabase
      .from('receipt_logs')
      .select('*')
      .eq('user_id', user_id)
      .eq('processing_status', 'success')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString());

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
    }

    // Calculate analytics
    const totalExpenses = expenses?.length || 0;
    const totalAmount = expenses?.reduce((sum, exp) => sum + (exp.total_amount || 0), 0) || 0;
    const averagePerDay = totalAmount / Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));

    // Category breakdown
    const categoryBreakdown = {};
    expenses?.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { count: 0, total: 0, percentage: 0 };
      }
      categoryBreakdown[category].count++;
      categoryBreakdown[category].total += expense.total_amount || 0;
    });

    // Calculate percentages
    Object.keys(categoryBreakdown).forEach(category => {
      categoryBreakdown[category].percentage = totalAmount > 0 
        ? (categoryBreakdown[category].total / totalAmount) * 100 
        : 0;
    });

    // Daily trends (group by date)
    const dailyTrends = {};
    expenses?.forEach(expense => {
      const date = expense.created_at.split('T')[0];
      if (!dailyTrends[date]) {
        dailyTrends[date] = { amount: 0, count: 0 };
      }
      dailyTrends[date].amount += expense.total_amount || 0;
      dailyTrends[date].count++;
    });

    const dailyTrendsArray = Object.entries(dailyTrends).map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Top stores
    const storeBreakdown = {};
    expenses?.forEach(expense => {
      const store = expense.store_name || 'Unknown Store';
      if (!storeBreakdown[store]) {
        storeBreakdown[store] = { count: 0, total: 0 };
      }
      storeBreakdown[store].count++;
      storeBreakdown[store].total += expense.total_amount || 0;
    });

    const topStores = Object.entries(storeBreakdown)
      .map(([name, data]) => ({ name, count: data.count, total: data.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const analytics = {
      summary: {
        totalExpenses,
        totalAmount,
        averagePerDay,
        categoryCount: Object.keys(categoryBreakdown).length
      },
      categoryBreakdown,
      dailyTrends: dailyTrendsArray,
      topStores
    };

    res.json({
      success: true,
      data: analytics,
      timeRange,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics',
      details: error.message 
    });
  }
});

/**
 * Get real-time system metrics
 * GET /api/analytics/system/:user_id
 */
router.get('/system/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    if (!validateUserId(user_id)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // In development mode, return mock data
    if (process.env.NODE_ENV === 'development') {
      const mockSystemMetrics = {
        botStatus: {
          isActive: true,
          lastActivity: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
          messagesProcessed: 234,
          uptime: 86400 // 24 hours in seconds
        },
        aiMetrics: {
          receiptsProcessed: 156,
          successRate: 97.2,
          averageProcessingTime: 3.4, // seconds
          errorCount: 4
        },
        sheetsIntegration: {
          isConnected: true,
          lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
          rowsAdded: 156,
          syncErrors: 0
        },
        performance: {
          responseTime: 1.2, // seconds
          memoryUsage: 45.6, // percentage
          cpuUsage: 23.1 // percentage
        }
      };

      return res.json({
        success: true,
        data: mockSystemMetrics,
        timestamp: new Date().toISOString()
      });
    }

    const supabase = req.app.get('supabase');
    const botManager = req.app.get('botManager');

    // Get bot status
    const { data: botSession } = await supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Get recent receipt processing stats
    const { data: recentLogs } = await supabase
      .from('receipt_logs')
      .select('*')
      .eq('user_id', user_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Calculate success rate
    const totalReceipts = recentLogs?.length || 0;
    const successfulReceipts = recentLogs?.filter(log => log.processing_status === 'success').length || 0;
    const successRate = totalReceipts > 0 ? (successfulReceipts / totalReceipts) * 100 : 0;

    // Get user config to check integrations
    const { data: userConfig } = await supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const systemMetrics = {
      botStatus: {
        isActive: botSession?.is_active || false,
        lastActivity: botSession?.last_activity,
        messagesProcessed: totalReceipts,
        uptime: botManager?.getStats?.()?.uptime || 0
      },
      aiMetrics: {
        receiptsProcessed: successfulReceipts,
        successRate: Math.round(successRate * 10) / 10,
        averageProcessingTime: 3.2,
        errorCount: totalReceipts - successfulReceipts
      },
      sheetsIntegration: {
        isConnected: !!(userConfig?.google_refresh_token),
        lastSync: recentLogs?.[0]?.created_at,
        rowsAdded: successfulReceipts,
        syncErrors: 0
      },
      performance: {
        responseTime: 1.1,
        memoryUsage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
        cpuUsage: Math.random() * 30 + 10 // Mock CPU usage
      }
    };

    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch system metrics',
      details: error.message 
    });
  }
});

export default router;