import { google } from 'googleapis';
import { decrypt } from './encryption.js';

export const getGoogleAuthClient = (user) => {
  if (!user.googleRefreshTokenEncrypted) {
    const err = new Error('Google account not connected or missing refresh token');
    err.code = 'NO_REFRESH_TOKEN';
    throw err;
  }

  const refreshToken = decrypt(user.googleRefreshTokenEncrypted);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
};

export const getSpreadsheetTabs = async (user, spreadsheetId) => {
  try {
    const auth = getGoogleAuthClient(user);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });

    const tabs = (response.data.sheets || []).map((sheet) => ({
      sheetId: sheet.properties.sheetId,
      title: sheet.properties.title,
      rowCount: sheet.properties.gridProperties?.rowCount || 0,
      columnCount: sheet.properties.gridProperties?.columnCount || 0,
    }));

    return tabs;
  } catch (error) {
    if (error.message && (error.message.includes('invalid_grant') || error.code === 401)) {
      const err = new Error('Google authorization expired or revoked. Please reconnect your account.');
      err.code = 'TOKEN_REVOKED';
      throw err;
    }
    throw error;
  }
};

export const getSheetPreviewData = async (user, spreadsheetId, sheetName, maxRows = 10) => {
  try {
    const auth = getGoogleAuthClient(user);
    const sheets = google.sheets({ version: 'v4', auth });

    const range = `'${sheetName.replace(/'/g, "''")}'!A1:ZZ${maxRows}`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = rows[0].map((h) => String(h || '').trim());
    const dataRows = rows.slice(1).map((row) => {
      const rowObj = {};
      headers.forEach((header, idx) => {
        if (header) {
          rowObj[header] = row[idx] !== undefined ? String(row[idx]) : '';
        }
      });
      return rowObj;
    });

    return { headers, rows: dataRows };
  } catch (error) {
    if (error.message && (error.message.includes('invalid_grant') || error.code === 401)) {
      const err = new Error('Google authorization expired or revoked. Please reconnect your account.');
      err.code = 'TOKEN_REVOKED';
      throw err;
    }
    throw error;
  }
};

export const fetchFullSheetData = async (user, spreadsheetId, sheetName) => {
  try {
    const auth = getGoogleAuthClient(user);
    const sheets = google.sheets({ version: 'v4', auth });

    const range = `'${sheetName.replace(/'/g, "''")}'!A1:ZZ`;

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = response.data.values || [];
    if (rows.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = rows[0].map((h) => String(h || '').trim());
    const dataRows = rows.slice(1).map((row, index) => {
      const rowObj = { _rowIndex: index + 2 }; // 1-indexed row number in Google Sheets
      headers.forEach((header, idx) => {
        if (header) {
          rowObj[header] = row[idx] !== undefined ? String(row[idx]).trim() : '';
        }
      });
      return rowObj;
    });

    return { headers, rows: dataRows };
  } catch (error) {
    if (error.message && (error.message.includes('invalid_grant') || error.code === 401)) {
      const err = new Error('Google authorization expired or revoked. Please reconnect your account.');
      err.code = 'TOKEN_REVOKED';
      throw err;
    }
    throw error;
  }
};
