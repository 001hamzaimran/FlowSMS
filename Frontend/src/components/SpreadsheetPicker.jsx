import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { FileSpreadsheet, RefreshCw, AlertCircle, Link2 } from 'lucide-react';

export const SpreadsheetPicker = ({ onSelect, selectedSpreadsheetId, selectedSpreadsheetName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pickerApiLoaded, setPickerApiLoaded] = useState(false);
  const [selectedName, setSelectedName] = useState(selectedSpreadsheetName || '');
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualInput, setManualInput] = useState('');

  useEffect(() => {
    // Load Google API script dynamically if not already loaded
    if (window.gapi && window.google?.picker) {
      setPickerApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('picker', () => {
        setPickerApiLoaded(true);
      });
    };
    script.onerror = () => {
      setError('Failed to load Google Picker script.');
    };
    document.body.appendChild(script);
  }, []);

  const openPicker = async () => {
    setError('');
    setLoading(true);

    try {
      // 1. Fetch short-lived OAuth access token from Backend
      const res = await api.get('/auth/google/picker-token');

      if (!res.data.success || !res.data.accessToken) {
        setError(res.data.message || 'Failed to retrieve Google OAuth access token.');
        setLoading(false);
        return;
      }

      const accessToken = res.data.accessToken;
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY || res.data.apiKey || '';

      if (!apiKey) {
        setError('Google API Key missing. Please set VITE_GOOGLE_API_KEY in Frontend/.env or GOOGLE_API_KEY in Backend/.env, or use manual link paste below.');
        setLoading(false);
        return;
      }

      if (!window.google?.picker) {
        window.gapi.load('picker', () => {
          createAndShowPicker(accessToken, apiKey);
        });
      } else {
        createAndShowPicker(accessToken, apiKey);
      }
    } catch (err) {
      console.error('Picker Token Error:', err);
      if (err.response?.data?.code === 'TOKEN_REVOKED') {
        setError('Your Google authorization needs updating for Google Drive Picker. Please click "Reconnect Google Account" below.');
      } else {
        setError(err.response?.data?.message || 'Failed to open Google Drive Picker.');
      }
      setLoading(false);
    }
  };

  const createAndShowPicker = (accessToken, apiKey) => {
    try {
      const view = new window.google.picker.View(window.google.picker.ViewId.SPREADSHEETS);

      const builder = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setCallback((data) => {
          if (data[window.google.picker.Response.ACTION] === window.google.picker.Action.PICKED) {
            const doc = data[window.google.picker.Response.DOCUMENTS][0];
            const docId = doc[window.google.picker.Document.ID];
            const docName = doc[window.google.picker.Document.NAME];

            setSelectedName(docName);
            onSelect(docId, docName);
          }
          setLoading(false);
        });

      if (apiKey) {
        builder.setDeveloperKey(apiKey);
      }

      const picker = builder.build();
      picker.setVisible(true);
    } catch (e) {
      console.error('Error creating Google Picker:', e);
      setError('Could not display Google Picker window: ' + e.message);
      setLoading(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    const match = manualInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const docId = match ? match[1] : manualInput.trim();
    setSelectedName('Google Spreadsheet (' + docId.substring(0, 8) + '...)');
    onSelect(docId, 'Google Spreadsheet (' + docId.substring(0, 8) + '...)');
  };

  const handleReconnectGoogle = async () => {
    try {
      const res = await api.get('/auth/google/url');
      if (res.data.success && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert('Failed to get reconnect URL: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div
          style={{
            backgroundColor: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            color: '#f43f5e',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          {error.includes('Reconnect') && (
            <button
              onClick={handleReconnectGoogle}
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              Reconnect Google Account
            </button>
          )}
        </div>
      )}

      {selectedSpreadsheetId ? (
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #0284c7',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>Selected Spreadsheet</p>
              <p style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>{selectedName || selectedSpreadsheetId}</p>
            </div>
          </div>

          <button onClick={openPicker} disabled={loading} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
            {loading ? 'Opening Drive...' : 'Change Spreadsheet'}
          </button>
        </div>
      ) : (
        <div
          style={{
            border: '2px dashed #334155',
            borderRadius: '12px',
            padding: '32px 20px',
            textAlign: 'center',
            backgroundColor: '#0f172a',
          }}
        >
          <div style={{ width: '48px', height: '48px', backgroundColor: '#1e293b', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '12px' }}>
            <FileSpreadsheet size={24} />
          </div>
          <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc', marginBottom: '4px' }}>
            Select Spreadsheet from Google Drive
          </h4>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            Browse your Google Drive files securely using the Google Picker dialog.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <button
              type="button"
              onClick={openPicker}
              disabled={loading}
              className="btn-primary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" /> Loading Google Drive Picker...
                </>
              ) : (
                <>
                  <FileSpreadsheet size={18} /> Select Spreadsheet from Drive
                </>
              )}
            </button>

            {!showManualPaste ? (
              <button
                type="button"
                onClick={() => setShowManualPaste(true)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
              >
                <Link2 size={13} /> Or paste Google Sheet link / ID manually
              </button>
            ) : (
              <div style={{ width: '100%', maxWidth: '500px', marginTop: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="https://docs.google.com/spreadsheets/d/your-id/edit"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                  />
                  <button type="button" onClick={handleManualSubmit} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                    Confirm Sheet
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
