import express from 'express';
import { getTabs, getSheetPreview } from '../Controllers/sheetsController.js';
import { protect } from '../Middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/:spreadsheetId/tabs', getTabs);
router.get('/:spreadsheetId/tabs/:sheetName/preview', getSheetPreview);

export default router;
