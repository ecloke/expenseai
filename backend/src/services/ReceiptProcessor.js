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
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
  "items": [
    {
      "name": "string", 
      "price": number,
      "quantity": number,
      "category": "groceries|dining|gas|pharmacy|retail|services|other"
    }
  ]
}

Rules:
- Use logical categorization for items
- If unclear, use reasonable defaults
- Ensure all prices are numbers (not strings)
- Date should be in YYYY-MM-DD format, extracted exactly from the receipt
- Look carefully for dates in format DD/MM/YYYY or DD-MM-YYYY and convert to YYYY-MM-DD
- If date is unclear, use ${malaysiaTime}
- Use Malaysia Kuala Lumpur timezone context
- Extract ALL items visible on the receipt
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

      // Validate extracted data
      const validation = receiptDataSchema.validate(receiptData);
      if (validation.error) {
        console.error('Receipt data validation failed:', validation.error.details[0].message);
        throw new Error(`Invalid receipt data: ${validation.error.details[0].message}`);
      }

      const validatedData = validation.value;
      console.log(`✅ Receipt data validated: ${validatedData.items.length} items, total $${validatedData.total}`);

      // Save to Google Sheets
      try {
        console.log('🔄 Attempting to save to Google Sheets...');
        await this.saveToSheets(validatedData, userId, userConfig);
        console.log('✅ Successfully saved to Google Sheets');
      } catch (sheetsError) {
        console.error('❌ CRITICAL: Failed to save to Google Sheets:', sheetsError);
        console.error('❌ Sheets error details:', {
          message: sheetsError.message,
          stack: sheetsError.stack,
          userId,
          hasAccessToken: !!userConfig.google_access_token,
          hasSheetId: !!userConfig.google_sheet_id
        });
        // Don't throw - continue with processing but log the error
        await this.logReceiptProcessing(userId, validatedData, 'partial_success', `Sheets save failed: ${sheetsError.message}`);
      }

      // Log successful processing
      await this.logReceiptProcessing(userId, validatedData, 'success');

      return validatedData;

    } catch (error) {
      console.error(`❌ Receipt processing failed for user ${userId}:`, error);
      
      // Log failed processing
      await this.logReceiptProcessing(userId, null, 'error', error.message);
      
      throw error;
    }
  }

  /**
   * Save receipt data to user's Google Sheet
   */
  async saveToSheets(receiptData, userId, userConfig) {
    try {
      console.log(`📊 Saving receipt data to Google Sheets for user ${userId}`);

      // Initialize sheets service with user's tokens
      await this.sheetsService.initializeForUser(userConfig);

      const sheetName = 'AI Expense Tracker';
      
      // Ensure sheet exists and is properly set up
      await this.sheetsService.ensureSheetSetup(userConfig.google_sheet_id, sheetName);

      // Prepare rows for insertion (just the items, no headers or summary)
      const rows = [];
      
      // Add each item as a row
      for (const item of receiptData.items) {
        rows.push([
          receiptData.date,
          receiptData.store_name,
          item.name,
          item.category,
          item.quantity,
          item.price,
          item.price * item.quantity
        ]);
      }

      // Append to sheet and update running total
      await this.sheetsService.appendRowsAndUpdateTotal(
        userConfig.google_sheet_id,
        sheetName,
        rows
      );

      console.log(`✅ Saved ${rows.length} rows to Google Sheets`);

    } catch (error) {
      console.error('Failed to save to Google Sheets:', error);
      throw new Error('Failed to save receipt data to your Google Sheet');
    }
  }

  /**
   * Log receipt processing for analytics and debugging
   */
  async logReceiptProcessing(userId, receiptData, status, errorMessage = null) {
    try {
      const logData = {
        user_id: userId,
        processing_status: status,
        error_message: errorMessage
      };

      if (receiptData && status === 'success') {
        logData.store_name = receiptData.store_name;
        logData.total_amount = receiptData.total;
        // Note: items_count column doesn't exist in receipt_logs table
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