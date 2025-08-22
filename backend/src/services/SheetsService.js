import { google } from 'googleapis';
import { decrypt, encrypt } from '../utils/encryption.js';

/**
 * Google Sheets service for OAuth and sheet operations
 * Handles authentication, sheet creation, and data operations
 */
class SheetsService {
  constructor(supabase) {
    this.supabase = supabase;
    this.auth = null;
    this.sheets = null;
  }

  /**
   * Initialize service for a specific user with their OAuth tokens
   * @param {Object} userConfig - User configuration with encrypted tokens
   */
  async initializeForUser(userConfig) {
    try {
      // Decrypt OAuth tokens
      const accessToken = decrypt(userConfig.google_access_token);
      const refreshToken = decrypt(userConfig.google_refresh_token);

      if (!accessToken || !refreshToken) {
        throw new Error('Failed to decrypt Google OAuth tokens');
      }

      // Create OAuth2 client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      // Set credentials
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      // Handle token refresh
      oauth2Client.on('tokens', async (tokens) => {
        console.log('🔄 Refreshing Google OAuth tokens');
        await this.updateUserTokens(userConfig.user_id, tokens);
      });

      this.auth = oauth2Client;
      this.sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      console.log(`✅ Google Sheets service initialized for user ${userConfig.user_id}`);

    } catch (error) {
      console.error('Failed to initialize Google Sheets service:', error);
      throw new Error('Failed to authenticate with Google Sheets');
    }
  }

  /**
   * Update user's OAuth tokens in database
   */
  async updateUserTokens(userId, tokens) {
    try {
      const updateData = {};

      if (tokens.access_token) {
        updateData.google_access_token = encrypt(tokens.access_token);
      }

      if (tokens.refresh_token) {
        updateData.google_refresh_token = encrypt(tokens.refresh_token);
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await this.supabase
          .from('user_configs')
          .update(updateData)
          .eq('user_id', userId);

        if (error) {
          console.error('Failed to update OAuth tokens:', error);
        } else {
          console.log('✅ OAuth tokens updated successfully');
        }
      }
    } catch (error) {
      console.error('Error updating OAuth tokens:', error);
    }
  }

  /**
   * Create a new expense sheet with headers
   * @param {string} sheetId - Google Sheet ID
   * @param {string} sheetName - Name of the sheet tab
   */
  async createExpenseSheet(sheetId, sheetName = 'Expenses') {
    try {
      console.log(`📊 Creating expense sheet: ${sheetName}`);

      // Check if sheet already exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId
      });

      const existingSheet = spreadsheet.data.sheets.find(
        sheet => sheet.properties.title === sheetName
      );

      if (existingSheet) {
        console.log(`Sheet "${sheetName}" already exists`);
        return existingSheet.properties.sheetId;
      }

      // Create new sheet
      const addSheetResponse = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName,
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            }
          }]
        }
      });

      const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;

      // Add headers
      const headers = ['Date', 'Store', 'Item', 'Category', 'Quantity', 'Price', 'Total'];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:G1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });

      // Format headers (bold)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            repeatCell: {
              range: {
                sheetId: newSheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 7
              },
              cell: {
                userEnteredFormat: {
                  textFormat: {
                    bold: true
                  },
                  backgroundColor: {
                    red: 0.9,
                    green: 0.9,
                    blue: 0.9
                  }
                }
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)'
            }
          }]
        }
      });

      console.log(`✅ Created expense sheet "${sheetName}" with headers`);
      return newSheetId;

    } catch (error) {
      console.error('Failed to create expense sheet:', error);
      throw new Error('Failed to create expense tracking sheet');
    }
  }

  /**
   * Check if sheet is empty (no data rows)
   * @param {string} sheetId - Google Sheet ID
   * @param {string} sheetName - Name of the sheet tab
   * @returns {boolean} - True if sheet is empty
   */
  async isSheetEmpty(sheetId, sheetName = 'Expenses') {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:A`
      });

      const values = response.data.values || [];
      return values.length <= 1; // Only header row or empty

    } catch (error) {
      // If sheet doesn't exist, it's "empty"
      if (error.code === 400) {
        return true;
      }
      console.error('Error checking if sheet is empty:', error);
      return false;
    }
  }

  /**
   * Append rows to the expense sheet
   * @param {string} sheetId - Google Sheet ID
   * @param {string} sheetName - Name of the sheet tab
   * @param {Array} rows - Array of row arrays to append
   */
  async appendRows(sheetId, sheetName = 'Expenses', rows) {
    try {
      console.log(`📝 Appending ${rows.length} rows to ${sheetName}`);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:G`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: rows
        }
      });

      console.log(`✅ Appended ${rows.length} rows successfully`);
      return response.data;

    } catch (error) {
      console.error('Failed to append rows:', error);
      throw new Error('Failed to add data to your expense sheet');
    }
  }

  /**
   * Get all data from a sheet
   * @param {string} sheetId - Google Sheet ID
   * @param {string} sheetName - Name of the sheet tab
   * @returns {Array} - Array of row arrays
   */
  async getSheetData(sheetId, sheetName = 'Expenses') {
    try {
      console.log(`📖 Reading data from ${sheetName}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A:G`
      });

      const values = response.data.values || [];
      console.log(`📊 Retrieved ${values.length} rows from ${sheetName}`);
      
      return values;

    } catch (error) {
      console.error('Failed to get sheet data:', error);
      
      // If sheet doesn't exist, try to create it
      if (error.code === 400) {
        console.log('Sheet not found, creating new expense sheet...');
        await this.createExpenseSheet(sheetId, sheetName);
        return [['Date', 'Store', 'Item', 'Category', 'Quantity', 'Price', 'Total']];
      }
      
      throw new Error('Failed to read expense data from your sheet');
    }
  }

  /**
   * Update a specific range in the sheet
   * @param {string} sheetId - Google Sheet ID
   * @param {string} range - A1 notation range
   * @param {Array} values - Array of row arrays to update
   */
  async updateRange(sheetId, range, values) {
    try {
      const response = await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: values
        }
      });

      return response.data;

    } catch (error) {
      console.error('Failed to update range:', error);
      throw new Error('Failed to update expense data');
    }
  }

  /**
   * Get sheet metadata and properties
   * @param {string} sheetId - Google Sheet ID
   */
  async getSheetInfo(sheetId) {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId
      });

      const spreadsheet = response.data;
      const sheets = spreadsheet.sheets.map(sheet => ({
        id: sheet.properties.sheetId,
        title: sheet.properties.title,
        rowCount: sheet.properties.gridProperties.rowCount,
        columnCount: sheet.properties.gridProperties.columnCount
      }));

      return {
        title: spreadsheet.properties.title,
        sheets: sheets,
        url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
      };

    } catch (error) {
      console.error('Failed to get sheet info:', error);
      throw new Error('Failed to access your Google Sheet');
    }
  }

  /**
   * Test sheet access and permissions
   * @param {string} sheetId - Google Sheet ID
   * @returns {Object} - Test result
   */
  async testSheetAccess(sheetId) {
    try {
      // Try to read sheet metadata
      const info = await this.getSheetInfo(sheetId);
      
      // Try to read a small range
      await this.getSheetData(sheetId, 'Expenses');

      return {
        success: true,
        message: 'Sheet access successful',
        sheetTitle: info.title,
        url: info.url
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to access Google Sheet'
      };
    }
  }

  /**
   * Create a summary sheet with aggregated data
   * @param {string} sheetId - Google Sheet ID
   * @param {Array} expenseData - Raw expense data
   */
  async createSummarySheet(sheetId, expenseData) {
    try {
      const summarySheetName = 'Summary';
      
      // Calculate summary data
      const totalExpenses = expenseData.reduce((sum, expense) => sum + expense.total, 0);
      const categoryTotals = {};
      
      expenseData.forEach(expense => {
        if (!categoryTotals[expense.category]) {
          categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.total;
      });

      // Prepare summary data
      const summaryRows = [
        ['Expense Summary', '', ''],
        ['Total Expenses', `$${totalExpenses.toFixed(2)}`, ''],
        ['Number of Transactions', expenseData.length.toString(), ''],
        ['', '', ''],
        ['Category Breakdown', '', ''],
        ['Category', 'Total', 'Percentage']
      ];

      // Add category breakdown
      Object.entries(categoryTotals).forEach(([category, total]) => {
        const percentage = ((total / totalExpenses) * 100).toFixed(1);
        summaryRows.push([category, `$${total.toFixed(2)}`, `${percentage}%`]);
      });

      // Create or update summary sheet
      await this.createExpenseSheet(sheetId, summarySheetName);
      
      // Clear existing content and add summary
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `${summarySheetName}!A:C`
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${summarySheetName}!A1:C${summaryRows.length}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: summaryRows
        }
      });

      console.log('✅ Summary sheet created successfully');

    } catch (error) {
      console.error('Failed to create summary sheet:', error);
      throw new Error('Failed to create expense summary');
    }
  }
}

export default SheetsService;