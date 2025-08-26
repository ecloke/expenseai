import { GoogleGenerativeAI } from '@google/generative-ai';
import { decrypt } from '../utils/encryption.js';
import { validateInput, receiptDataSchema } from '../utils/validation.js';
import SheetsService from './SheetsService.js';
import fs from 'fs';
import path from 'path';

/**
 * Receipt processing service using Gemini Vision API
 * Extracts structured data from receipt images
 */
class ReceiptProcessor {
  constructor(supabase) {
    this.supabase = supabase;
    this.sheetsService = new SheetsService(supabase);
    
    // Initialize Gemini AI (will be set per request with user's API key)
    this.genAI = null;
    
    // Rate limiting for logs to prevent explosive logging
    this.logCache = new Map(); // userId_status_errorHash -> lastLogTime
    this.LOG_RATE_LIMIT_MS = 60000; // 1 minute between identical logs
  }

  /**
   * Process receipt image and extract structured data
   * @param {Buffer} imageBuffer - Receipt image buffer
   * @param {string} userId - User ID
   * @param {Object} userConfig - User configuration with API keys
   * @returns {Object} - Structured receipt data
   */
  async processReceipt(imageBuffer, userId, userConfig) {
    try {
      console.log(`📸 Processing receipt for user ${userId}`);

      // Initialize Gemini with user's API key
      const geminiApiKey = decrypt(userConfig.gemini_api_key);
      if (!geminiApiKey) {
        throw new Error('Failed to decrypt Gemini API key');
      }

      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

      // Convert image to base64
      const base64Image = imageBuffer.toString('base64');
      const imageData = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg' // Assume JPEG, could be enhanced to detect type
        }
      };

      // Get Malaysia time for proper date handling
      const malaysiaTime = new Date().toLocaleString("en-CA", {
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
        month: "2-digit", 
        day: "2-digit"
      });

      // Structured prompt for receipt extraction
      const prompt = `Analyze this receipt image and return ONLY valid JSON with the following structure:
{
  "store_name": "string",
  "date": "YYYY-MM-DD",
  "total": number,
  "service_charge": number,
  "tax": number,
  "discount": number,
  "items": [
    {
      "name": "string", 
      "total": number,
      "quantity": number,
      "category": "groceries|dining|gas|pharmacy|retail|services|entertainment|other"
    }
  ]
}

Rules:
- Use logical categorization for items
- If unclear, use reasonable defaults
- For items, use "total" not "price" - this is the total amount for that line item (not unit price)
- If quantity is 3 and total shown is 7.8, then total should be 7.8 (not 7.8/3 per unit)
- Ensure all amounts are numbers (not strings)
- Date should be in YYYY-MM-DD format, extracted exactly from the receipt
- Look carefully for dates in format DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY and convert to YYYY-MM-DD
- Common Malaysian date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
- If multiple dates present, use the transaction/purchase date (not printed date)
- If date is unclear or missing, use ${malaysiaTime}
- Use Malaysia Kuala Lumpur timezone context
- Date must be reasonable (not future dates, not older than 1 year)
- Extract ALL items visible on the receipt
- Look for service charge, service tax, GST, or similar fees (set to 0 if not found)
- Look for discounts, vouchers, promotions (use negative number like -20.00, set to 0 if none)
- service_charge, tax, and discount should be numbers (0 if not present)
- discount should be negative for actual discounts (e.g., -20.00 for 20 dollar discount)
- Return ONLY the JSON object, no additional text`;

      // Generate content with Gemini Vision
      const result = await model.generateContent([prompt, imageData]);
      const response = await result.response;
      const text = response.text();

      console.log(`🤖 Gemini Vision response: ${text.substring(0, 200)}...`);

      // Parse and validate response
      let receiptData;
      try {
        // Clean the response to extract JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Gemini response');
        }
        
        receiptData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError);
        throw new Error('Invalid response format from AI vision model');
      }

      // Validate and fix date
      receiptData = this.validateAndFixDate(receiptData, malaysiaTime.split('T')[0]);

      // Validate extracted data
      const validation = receiptDataSchema.validate(receiptData);
      if (validation.error) {
        console.error('Receipt data validation failed:', validation.error.details[0].message);
        throw new Error(`Invalid receipt data: ${validation.error.details[0].message}`);
      }

      const validatedData = validation.value;
      console.log(`✅ Receipt data validated: ${validatedData.items.length} items, total $${validatedData.total}`);

      // COMMENTED OUT - Google Sheets Integration (preserved for future use)
      // Save to Google Sheets
      // try {
      //   console.log('🔄 Attempting to save to Google Sheets...');
      //   await this.saveToSheets(validatedData, userId, userConfig);
      //   console.log('✅ Successfully saved to Google Sheets');
      // } catch (sheetsError) {
      //   console.error('❌ CRITICAL: Failed to save to Google Sheets:', sheetsError);
      //   console.error('❌ Sheets error details:', {
      //     message: sheetsError.message,
      //     stack: sheetsError.stack,
      //     userId,
      //     hasAccessToken: !!userConfig.google_access_token,
      //     hasSheetId: !!userConfig.google_sheet_id
      //   });
      //   // Don't throw - continue with processing but log the error
      //   await this.logReceiptProcessing(userId, validatedData, 'partial_success', `Sheets save failed: ${sheetsError.message}`);
      // }

      // NOTE: Removed automatic database save to prevent double-recording
      // Saving is now handled by BotManager after user selects project (or for general expenses)
      console.log('✅ Receipt data extracted and validated successfully');

      // Add the calculated category to the receipt data
      validatedData.category = this.categorizeReceipt(validatedData);

      // Log successful processing (note: database save happens later in BotManager)
      await this.logReceiptProcessing(userId, validatedData, 'partial');

      return validatedData;

    } catch (error) {
      console.error(`❌ Receipt processing failed for user ${userId}:`, error);
      
      // Log failed processing
      await this.logReceiptProcessing(userId, null, 'error', error.message);
      
      throw error;
    }
  }

  /**
   * Save receipt data to database (replaces Google Sheets)
   */
  async saveToDatabase(receiptData, userId) {
    try {
      console.log(`💾 Saving receipt data to database for user ${userId}`);

      // Create expense record with actual receipt date
      const expenseData = {
        user_id: userId,
        receipt_date: receiptData.date, // Use actual receipt date, not today's date
        store_name: receiptData.store_name,
        category: this.categorizeReceipt(receiptData), // Determine overall receipt category
        total_amount: receiptData.total
      };

      const { data, error } = await this.supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log(`✅ Saved expense record: $${receiptData.total} at ${receiptData.store_name} on ${receiptData.date}`);
      return data;

    } catch (error) {
      console.error('Failed to save to database:', error);
      throw new Error('Failed to save receipt data to database');
    }
  }

  /**
   * Categorize receipt based on items and store name
   */
  categorizeReceipt(receiptData) {
    const items = receiptData.items || [];
    const storeName = (receiptData.store_name || '').toLowerCase();
    
    // Count items by category
    const categoryCount = {};
    items.forEach(item => {
      const category = item.category || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    // If we have items, use the most common category
    if (Object.keys(categoryCount).length > 0) {
      return Object.keys(categoryCount).reduce((a, b) => 
        categoryCount[a] > categoryCount[b] ? a : b
      );
    }

    // Fallback: categorize by store name
    if (storeName.includes('restaurant') || storeName.includes('cafe') || 
        storeName.includes('food') || storeName.includes('mcd') || 
        storeName.includes('kfc') || storeName.includes('pizza')) {
      return 'dining';
    } else if (storeName.includes('grocery') || storeName.includes('mart') || 
               storeName.includes('supermarket') || storeName.includes('tesco') || 
               storeName.includes('giant')) {
      return 'groceries';
    } else if (storeName.includes('petrol') || storeName.includes('shell') || 
               storeName.includes('petronas') || storeName.includes('gas')) {
      return 'gas';
    } else if (storeName.includes('pharmacy') || storeName.includes('guardian') || 
               storeName.includes('watsons')) {
      return 'pharmacy';
    } else if (storeName.includes('cinema') || storeName.includes('movie') || 
               storeName.includes('gsc') || storeName.includes('tgv') || 
               storeName.includes('entertainment') || storeName.includes('arcade') ||
               storeName.includes('bowling') || storeName.includes('karaoke') ||
               storeName.includes('ktv') || storeName.includes('theme park') ||
               storeName.includes('zoo') || storeName.includes('museum')) {
      return 'entertainment';
    }

    return 'other';
  }

  /**
   * Validate and fix receipt date to ensure it's reasonable and properly formatted
   */
  validateAndFixDate(receiptData, fallbackDate) {
    const originalDate = receiptData.date;
    
    try {
      // If no date provided, use fallback
      if (!originalDate) {
        console.log('⚠️ No date found in receipt, using current date');
        receiptData.date = fallbackDate;
        return receiptData;
      }

      // Try to parse the date
      const parsedDate = new Date(originalDate);
      
      // Check if date is valid
      if (isNaN(parsedDate.getTime())) {
        console.log(`⚠️ Invalid date format: ${originalDate}, using current date`);
        receiptData.date = fallbackDate;
        return receiptData;
      }

      // Check if date is reasonable (not future, not older than 2 years)
      const today = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(today.getFullYear() - 2);

      if (parsedDate > today) {
        console.log(`⚠️ Future date detected: ${originalDate}, using current date`);
        receiptData.date = fallbackDate;
        return receiptData;
      }

      if (parsedDate < twoYearsAgo) {
        console.log(`⚠️ Date too old: ${originalDate}, using current date`);
        receiptData.date = fallbackDate;
        return receiptData;
      }

      // Ensure date is in YYYY-MM-DD format
      const formattedDate = parsedDate.toISOString().split('T')[0];
      receiptData.date = formattedDate;
      
      console.log(`📅 Receipt date validated: ${formattedDate}`);
      return receiptData;

    } catch (error) {
      console.log(`⚠️ Error validating date ${originalDate}:`, error.message);
      receiptData.date = fallbackDate;
      return receiptData;
    }
  }

  /**
   * COMMENTED OUT - Google Sheets Integration (preserved for future use)
   * Save receipt data to user's Google Sheet
   */
  // COMMENTED OUT - Google Sheets Integration (preserved for future use)
  // async saveToSheets_DISABLED(receiptData, userId, userConfig) {
  //   try {
  //     console.log(`📊 Saving receipt data to Google Sheets for user ${userId}`);

  //     // Initialize sheets service with user's tokens
  //     await this.sheetsService.initializeForUser(userConfig);

  //     const sheetName = 'AI Expense Tracker';
      
  //     // Ensure sheet exists and is properly set up
  //     await this.sheetsService.ensureSheetSetup(userConfig.google_sheet_id, sheetName);

  //     // Prepare rows for insertion (items + service charge + tax as separate line items)
  //     const rows = [];
      
  //     // Add each item as a row (6 columns: Date, Store, Item, Category, Quantity, Total)
  //     for (const item of receiptData.items) {
  //       rows.push([
  //         receiptData.date,
  //         receiptData.store_name,
  //         item.name,
  //         item.category,
  //         item.quantity || 1,
  //         item.total || item.price || 0  // Use total from receipt (not calculated)
  //       ]);
  //     }

  //     // Add service charge as a separate line item if it exists
  //     if (receiptData.service_charge && receiptData.service_charge > 0) {
  //       rows.push([
  //         receiptData.date,
  //         receiptData.store_name,
  //         'Service Charge',
  //         'services',
  //         1,
  //         receiptData.service_charge
  //       ]);
  //     }

  //     // Add tax as a separate line item if it exists
  //     if (receiptData.tax && receiptData.tax > 0) {
  //       rows.push([
  //         receiptData.date,
  //         receiptData.store_name,
  //         'Tax',
  //         'services',
  //         1,
  //         receiptData.tax
  //       ]);
  //     }

  //     // Add discount as a separate line item if it exists (negative amount)
  //     if (receiptData.discount && receiptData.discount !== 0) {
  //       rows.push([
  //         receiptData.date,
  //         receiptData.store_name,
  //         receiptData.discount < 0 ? 'Discount/Voucher' : 'Additional Charge',
  //         'services',
  //         1,
  //         receiptData.discount
  //       ]);
  //     }

  //     // Append to sheet and update running total
  //     await this.sheetsService.appendRowsAndUpdateTotal(
  //       userConfig.google_sheet_id,
  //       sheetName,
  //       rows
  //     );

  //     console.log(`✅ Saved ${rows.length} rows to Google Sheets`);

  //   } catch (error) {
  //     console.error('Failed to save to Google Sheets:', error);
  //     throw new Error('Failed to save receipt data to your Google Sheet');
  //   }
  // }

  /**
   * Log receipt processing for analytics and debugging with rate limiting
   */
  async logReceiptProcessing(userId, receiptData, status, errorMessage = null) {
    try {
      // Create unique cache key for deduplication
      const errorHash = errorMessage ? this.hashString(errorMessage.substring(0, 100)) : 'none';
      const cacheKey = `${userId}_${status}_${errorHash}`;
      const now = Date.now();
      
      // Check if we recently logged the same error for this user
      const lastLogTime = this.logCache.get(cacheKey);
      if (lastLogTime && (now - lastLogTime) < this.LOG_RATE_LIMIT_MS) {
        // Skip logging - too frequent
        console.log(`Skipping duplicate log for ${status} (rate limited)`);
        return;
      }
      
      // Update cache with current timestamp
      this.logCache.set(cacheKey, now);
      
      // Clean old cache entries periodically (prevent memory leak)
      if (this.logCache.size > 1000) {
        this.cleanLogCache();
      }

      const logData = {
        user_id: userId,
        processing_status: status,
        error_message: errorMessage
      };

      if (receiptData && status === 'success') {
        logData.store_name = receiptData.store_name;
        logData.total_amount = receiptData.total;
        logData.items_count = receiptData.items?.length || 0;
      }

      const { error } = await this.supabase
        .from('receipt_logs')
        .insert(logData);

      if (error) {
        console.error('Failed to log receipt processing:', error);
      }
    } catch (error) {
      console.error('Error logging receipt processing:', error);
    }
  }

  /**
   * Simple hash function for error message deduplication
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clean old entries from log cache to prevent memory leaks
   */
  cleanLogCache() {
    const now = Date.now();
    const cutoff = now - (this.LOG_RATE_LIMIT_MS * 2); // Clean entries older than 2x rate limit
    
    for (const [key, timestamp] of this.logCache.entries()) {
      if (timestamp < cutoff) {
        this.logCache.delete(key);
      }
    }
    
    console.log(`Cleaned log cache, ${this.logCache.size} entries remaining`);
  }

  /**
   * Test receipt processing with a sample image
   * Used for validation and testing
   */
  async testProcessing(userId, testImagePath) {
    try {
      // Get user config
      const { data: userConfig } = await this.supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!userConfig) {
        throw new Error('User configuration not found');
      }

      // Read test image
      const imageBuffer = fs.readFileSync(testImagePath);
      
      // Process receipt
      const result = await this.processReceipt(imageBuffer, userId, userConfig);
      
      return {
        success: true,
        data: result,
        message: 'Receipt processed successfully'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Receipt processing failed'
      };
    }
  }

  /**
   * Get receipt processing statistics for a user
   */
  async getProcessingStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('receipt_logs')
        .select('processing_status, total_amount, items_count, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const stats = {
        total_receipts: data.length,
        successful_receipts: data.filter(log => log.processing_status === 'success').length,
        failed_receipts: data.filter(log => log.processing_status === 'error').length,
        total_amount: data
          .filter(log => log.total_amount)
          .reduce((sum, log) => sum + parseFloat(log.total_amount), 0),
        total_items: data
          .filter(log => log.items_count)
          .reduce((sum, log) => sum + log.items_count, 0),
        success_rate: data.length > 0 ? 
          (data.filter(log => log.processing_status === 'success').length / data.length * 100).toFixed(1) : 0
      };

      return stats;

    } catch (error) {
      console.error('Failed to get processing stats:', error);
      throw error;
    }
  }
}

export default ReceiptProcessor;