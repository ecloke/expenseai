/**
 * Centralized constants for ExpenseAI frontend
 * This file eliminates duplication across multiple components
 */

// Category emojis removed - using text-only categories now

// Categories array - previously duplicated everywhere
export const CATEGORIES = ['all', 'groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'entertainment', 'other'] as const;

// Chart colors for Recharts - from ExpenseCharts.tsx
export const CHART_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00c49f',
  '#0088fe',
  '#ff0062'
] as const;

// Pagination constants
export const ITEMS_PER_PAGE = 20;

// Timezone constants
export const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

// Date range types
export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

// Category type
export type Category = typeof CATEGORIES[number];

// Project filter options
export const PROJECT_FILTERS = {
  ALL: 'all',
  GENERAL: 'general'
} as const;

// Common UI constants
export const UI_CONSTANTS = {
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  MAX_PAGINATION_PAGES: 5
} as const;

// API constants
export const API_CONSTANTS = {
  CACHE_TIME: 5 * 60 * 1000, // 5 minutes
  STALE_TIME: 2 * 60 * 1000, // 2 minutes
  RETRY_COUNT: 3,
  TIMEOUT: 10000 // 10 seconds
} as const;

// Helper functions removed - no longer using category emojis