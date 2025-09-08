/**
 * Centralized date utilities for ExpenseAI
 * This eliminates duplicate date logic across components
 */

import { format, subDays, startOfWeek, startOfMonth, startOfYear, endOfMonth, endOfWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { MALAYSIA_TIMEZONE, TimeRange } from './constants';

/**
 * Get date range based on time range type in Malaysia timezone
 */
export const getDateRange = (range: TimeRange, customRange?: { start: Date; end: Date }) => {
  // Get current date in Malaysia timezone
  const nowInMalaysia = new Date(formatInTimeZone(new Date(), MALAYSIA_TIMEZONE, 'yyyy-MM-dd\'T\'HH:mm:ss'));
  
  switch (range) {
    case 'today':
      return {
        start: nowInMalaysia,
        end: nowInMalaysia
      };
    case 'week': 
      return { 
        start: startOfWeek(nowInMalaysia), 
        end: nowInMalaysia 
      };
    case 'month': 
      return { 
        start: startOfMonth(nowInMalaysia), 
        end: nowInMalaysia 
      };
    case 'year':
      return {
        start: startOfYear(nowInMalaysia),
        end: nowInMalaysia
      };
    case 'custom':
      return customRange || null;
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
 * Format date for API queries (YYYY-MM-DD) in Malaysia timezone
 */
export const formatDateForAPI = (date: Date): string => {
  return formatInTimeZone(date, MALAYSIA_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get today's date as YYYY-MM-DD string in Malaysia timezone
 */
export const getTodayString = (): string => {
  return formatInTimeZone(new Date(), MALAYSIA_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get yesterday's date as YYYY-MM-DD string in Malaysia timezone
 */
export const getYesterdayString = (): string => {
  const yesterday = subDays(new Date(), 1);
  return formatInTimeZone(yesterday, MALAYSIA_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get date N days ago as YYYY-MM-DD string in Malaysia timezone
 */
export const getDaysAgoString = (days: number): string => {
  const date = subDays(new Date(), days);
  return formatInTimeZone(date, MALAYSIA_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get start of current week as YYYY-MM-DD string in Malaysia timezone
 */
export const getWeekStartString = (): string => {
  return formatInTimeZone(startOfWeek(new Date()), MALAYSIA_TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get start of current month as YYYY-MM-DD string in Malaysia timezone
 */
export const getMonthStartString = (): string => {
  return formatInTimeZone(startOfMonth(new Date()), MALAYSIA_TIMEZONE, 'yyyy-MM-dd');
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
 * Get date range for common periods in Malaysia timezone
 */
export const getCommonDateRanges = () => {
  const nowInMalaysia = new Date(formatInTimeZone(new Date(), MALAYSIA_TIMEZONE, 'yyyy-MM-dd\'T\'HH:mm:ss'));
  
  return {
    today: {
      start: formatDateForAPI(nowInMalaysia),
      end: formatDateForAPI(nowInMalaysia)
    },
    yesterday: {
      start: getYesterdayString(),
      end: getYesterdayString()
    },
    thisWeek: {
      start: getWeekStartString(),
      end: formatDateForAPI(nowInMalaysia)
    },
    thisMonth: {
      start: getMonthStartString(),
      end: formatDateForAPI(nowInMalaysia)
    },
    last7Days: {
      start: getDaysAgoString(7),
      end: formatDateForAPI(nowInMalaysia)
    },
    last30Days: {
      start: getDaysAgoString(30),
      end: formatDateForAPI(nowInMalaysia)
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