import { getSpreadsheetTabs, getSheetPreviewData } from '../Utils/googleSheets.js';

export const getTabs = async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    if (!spreadsheetId) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID is required' });
    }

    const tabs = await getSpreadsheetTabs(req.user, spreadsheetId);
    return res.json({ success: true, tabs });
  } catch (error) {
    if (error.code === 'TOKEN_REVOKED') {
      return res.status(401).json({ success: false, code: 'TOKEN_REVOKED', message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSheetPreview = async (req, res) => {
  try {
    const { spreadsheetId, sheetName } = req.params;
    if (!spreadsheetId || !sheetName) {
      return res.status(400).json({ success: false, message: 'Spreadsheet ID and Sheet Name are required' });
    }

    const preview = await getSheetPreviewData(req.user, spreadsheetId, sheetName, 10);
    return res.json({ success: true, headers: preview.headers, rows: preview.rows });
  } catch (error) {
    if (error.code === 'TOKEN_REVOKED') {
      return res.status(401).json({ success: false, code: 'TOKEN_REVOKED', message: error.message });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
