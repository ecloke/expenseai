/**
 * Date utility functions for parsing command parameters
 */

const MONTH_NAMES = {
  'jan': 0, 'january': 0,
  'feb': 1, 'february': 1,
  'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'may': 4,
  'jun': 5, 'june': 5,
  'jul': 6, 'july': 6,
  'aug': 7, 'august': 7,
  'sep': 8, 'september': 8,
  'oct': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11
};

/**
 * Parse month range from text like "jan-aug", "january-august", "1-8"
 * @param {string} rangeText - The range text to parse
 * @returns {object|null} - { startMonth, endMonth, startDate, endDate, year } or null if invalid
 */
export function parseMonthRange(rangeText) {
  if (!rangeText || typeof rangeText !== 'string') {
    return null;
  }

  const range = rangeText.toLowerCase().trim();
  const currentYear = new Date().getFullYear();

  // Handle single month (e.g., "jan", "january", "1")
  if (!range.includes('-')) {
    const month = parseMonth(range);
    if (month !== null) {
      const startDate = new Date(currentYear, month, 1);
      const endDate = new Date(currentYear, month + 1, 0); // Last day of month
      return {
        startMonth: month,
        endMonth: month,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        year: currentYear
      };
    }
    return null;
  }

  // Handle range (e.g., "jan-aug", "1-8")
  const parts = range.split('-');
  if (parts.length !== 2) {
    return null;
  }

  const startMonth = parseMonth(parts[0].trim());
  const endMonth = parseMonth(parts[1].trim());

  if (startMonth === null || endMonth === null) {
    return null;
  }

  // Validate range
  if (startMonth > endMonth) {
    return null; // Invalid range
  }

  const startDate = new Date(currentYear, startMonth, 1);
  const endDate = new Date(currentYear, endMonth + 1, 0); // Last day of end month

  return {
    startMonth,
    endMonth,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    year: currentYear
  };
}

/**
 * Parse a single month from various formats
 * @param {string} monthText - Month text (jan, january, 1, etc.)
 * @returns {number|null} - Month index (0-11) or null if invalid
 */
function parseMonth(monthText) {
  const text = monthText.toLowerCase().trim();
  
  // Check month names
  if (MONTH_NAMES.hasOwnProperty(text)) {
    return MONTH_NAMES[text];
  }
  
  // Check numeric (1-12)
  const num = parseInt(text);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return num - 1; // Convert to 0-based index
  }
  
  return null;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} - True if valid
 */
export function isValidDateFormat(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && 
         date.toISOString().split('T')[0] === dateString;
}

/**
 * Validate amount (positive number)
 * @param {string} amountString - Amount string to validate
 * @returns {boolean} - True if valid
 */
export function isValidAmount(amountString) {
  if (!amountString || typeof amountString !== 'string') {
    return false;
  }

  const amount = parseFloat(amountString.trim());
  return !isNaN(amount) && amount > 0 && amount < 999999;
}

/**
 * Get month name from index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} - Month name
 */
export function getMonthName(monthIndex) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex] || 'Unknown';
}

/**
 * Format date range for display
 * @param {object} range - Range object from parseMonthRange
 * @returns {string} - Formatted range string
 */
export function formatDateRange(range) {
  if (!range) return '';
  
  if (range.startMonth === range.endMonth) {
    return `${getMonthName(range.startMonth)} ${range.year}`;
  } else {
    return `${getMonthName(range.startMonth)} - ${getMonthName(range.endMonth)} ${range.year}`;
  }
}

/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} - Today's date
 */
export function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date as YYYY-MM-DD string
 * @returns {string} - Yesterday's date
 */
export function getYesterdayString() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

/**
 * Get date N days ago as YYYY-MM-DD string
 * @param {number} days - Number of days ago
 * @returns {string} - Date string
 */
export function getDaysAgoString(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get start of current week (Sunday) as YYYY-MM-DD string
 * @returns {string} - Week start date
 */
export function getWeekStartString() {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

/**
 * Get start of current month as YYYY-MM-DD string
 * @returns {string} - Month start date
 */
export function getMonthStartString() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return startOfMonth.toISOString().split('T')[0];
}

/**
 * Get common date ranges
 * @returns {object} - Object with common date ranges
 */
export function getCommonDateRanges() {
  return {
    today: {
      start: getTodayString(),
      end: getTodayString()
    },
    yesterday: {
      start: getYesterdayString(),
      end: getYesterdayString()
    },
    week: {
      start: getWeekStartString(),
      end: getTodayString()
    },
    month: {
      start: getMonthStartString(),
      end: getTodayString()
    }
  };
}