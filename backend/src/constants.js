/**
 * Centralized constants for ExpenseAI backend
 * This file eliminates duplication across multiple services
 */

// Category emojis removed - using text-only categories now

// Available categories
export const CATEGORIES = ['groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'entertainment', 'other'];

// All categories including 'all' filter
export const CATEGORIES_WITH_ALL = ['all', ...CATEGORIES];

// Date range constants
export const DATE_RANGES = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  CUSTOM: 'custom'
};

// Pagination constants
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0
};

// Cache durations (in milliseconds)
export const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,   // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000    // 1 hour
};

// API response messages
export const MESSAGES = {
  SUCCESS: {
    EXPENSE_CREATED: 'Expense created successfully',
    EXPENSE_UPDATED: 'Expense updated successfully',
    EXPENSE_DELETED: 'Expense deleted successfully',
    PROJECT_CREATED: 'Project created successfully',
    PROJECT_UPDATED: 'Project updated successfully',
    PROJECT_DELETED: 'Project deleted successfully'
  },
  ERROR: {
    INVALID_USER_ID: 'Invalid user ID',
    EXPENSE_NOT_FOUND: 'Expense not found',
    PROJECT_NOT_FOUND: 'Project not found',
    UNAUTHORIZED: 'Unauthorized access',
    INTERNAL_ERROR: 'Internal server error',
    VALIDATION_ERROR: 'Validation error',
    DATABASE_ERROR: 'Database error'
  }
};

// Status constants
export const STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending',
  PARTIAL: 'partial'
};

// Project status
export const PROJECT_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed'
};

// Bot session constants
export const BOT_SESSION = {
  ACTIVE: true,
  INACTIVE: false,
  HEARTBEAT_INTERVAL: 60 * 1000 // 1 minute
};

// Time ranges for analytics
export const ANALYTICS_TIME_RANGES = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365
};

// Query limits
export const QUERY_LIMITS = {
  EXPENSES: 1000,
  PROJECTS: 100,
  TOP_STORES: 10,
  CATEGORIES: 20
};

// Currency formats
export const DEFAULT_CURRENCY = '$';
export const SUPPORTED_CURRENCIES = ['$', 'RM', '€', '£', '¥', '₹'];

// File processing constants
export const FILE_PROCESSING = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'pdf'],
  MAX_PROCESSING_TIME: 30 * 1000 // 30 seconds
};

// Rate limiting
export const RATE_LIMITS = {
  RECEIPTS_PER_HOUR: 100,
  API_CALLS_PER_MINUTE: 60,
  FAILED_ATTEMPTS: 5
};