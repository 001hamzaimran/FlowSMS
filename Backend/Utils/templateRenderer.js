/**
 * Interpolates template variables in format {{fieldName}} or {{ fieldName }}
 * with values from row data object.
 */
export const renderTemplate = (template, rowData = {}) => {
  if (!template) return '';

  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (Object.prototype.hasOwnProperty.call(rowData, trimmedKey)) {
      const val = rowData[trimmedKey];
      return val !== undefined && val !== null ? String(val) : '';
    }
    return '';
  });
};
