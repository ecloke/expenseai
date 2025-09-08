/**
 * Centralized date utilities for ExpenseAI
 * This eliminates duplicate date logic across components
 */

import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfMonth, endOfWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { MALAYSIA_TIMEZONE, TimeRange } from './constants';

/**
 * Get date range based on time range type
 */
export const getDateRange = (range: TimeRange) => {
  const now = new Date();
  
  switch (range) {
    case 'today':
      return {
        start: now,
        end: now
      };
    case 'week': 
      return { 
        start: startOfWeek(now), 
        end: now 
      };
    case 'month': 
      return { 
        start: startOfMonth(now), 
        end: now 
      };
    case 'year':
      return {
        start: startOfYear(now),
        end: now
      };
    case 'all':
    default:
      return null;
  }
};

/**
 * Format date for display in UI (e.g., "Dec 15, 2023")
 */
export const formatDateForDisplay = (date: string | Date): string => {
  return formatInTimeZone(new Date(date), MALAYSIA_TIMEZONE, 'MMM dd, yyyy');
};

/**
 * Format date and time for display (e.g., "Dec 15, 3:30 PM")
 */
export const formatDateTimeForDisplay = (date: string | Date): string => {
  return formatInTimeZone(new Date(date), MALAYSIA_TIMEZONE, 'MMM dd, h:mm a');
};

/**
 * Format date for API queries (YYYY-MM-DD)
 */
export const formatDateForAPI = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export const getTodayString = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

/**
 * Get yesterday's date as YYYY-MM-DD string
 */
export const getYesterdayString = (): string => {
  const yesterday = subDays(new Date(), 1);
  return format(yesterday, 'yyyy-MM-dd');
};

/**
 * Get date N days ago as YYYY-MM-DD string
 */
export const getDaysAgoString = (days: number): string => {
  const date = subDays(new Date(), days);
  return format(date, 'yyyy-MM-dd');
};

/**
 * Get start of current week as YYYY-MM-DD string
 */
export const getWeekStartString = (): string => {
  return format(startOfWeek(new Date()), 'yyyy-MM-dd');
};

/**
 * Get start of current month as YYYY-MM-DD string
 */
export const getMonthStartString = (): string => {
  return format(startOfMonth(new Date()), 'yyyy-MM-dd');
};

/**
 * Check if a date is today
 */
export const isToday = (date: string | Date): boolean => {
  const today = getTodayString();
  const checkDate = typeof date === 'string' ? date : formatDateForAPI(date);
  return today === checkDate.split('T')[0]; // Handle datetime strings
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: string | Date): boolean => {
  const yesterday = getYesterdayString();
  const checkDate = typeof date === 'string' ? date : formatDateForAPI(date);
  return yesterday === checkDate.split('T')[0];
};

/**
 * Get relative date string (Today, Yesterday, or formatted date)
 */
export const getRelativeDateString = (date: string | Date): string => {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDateForDisplay(date);
};

/**
 * Calculate days between two dates
 */
export const daysBetween = (startDate: Date, endDate: Date): number => {
  const timeDifference = endDate.getTime() - startDate.getTime();
  return Math.ceil(timeDifference / (1000 * 3600 * 24));
};

/**
 * Get date range for common periods
 */
export const getCommonDateRanges = () => {
  const now = new Date();
  
  return {
    today: {
      start: formatDateForAPI(now),
      end: formatDateForAPI(now)
    },
    yesterday: {
      start: getYesterdayString(),
      end: getYesterdayString()
    },
    thisWeek: {
      start: getWeekStartString(),
      end: formatDateForAPI(now)
    },
    thisMonth: {
      start: getMonthStartString(),
      end: formatDateForAPI(now)
    },
    last7Days: {
      start: getDaysAgoString(7),
      end: formatDateForAPI(now)
    },
    last30Days: {
      start: getDaysAgoString(30),
      end: formatDateForAPI(now)
    }
  };
};

/**
 * Validate date string format (YYYY-MM-DD)
 */
export const isValidDateString = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};