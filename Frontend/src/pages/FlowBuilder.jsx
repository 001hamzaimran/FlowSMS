import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { SpreadsheetPicker } from '../components/SpreadsheetPicker';
import {
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  Key,
  Calendar,
  Layers,
  PhoneCall,
  Check,
  RefreshCw,
} from 'lucide-react';

export const FlowBuilder = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Sheet & Tab
  const [name, setName] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [tabs, setTabs] = useState([]);
  const [selectedTab, setSelectedTab] = useState('');
  const [loadingTabs, setLoadingTabs] = useState(false);

  // Step 2: Columns & Preview
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [phoneColumn, setPhoneColumn] = useState('');
  const [countryCodeColumn, setCountryCodeColumn] = useState('');
  const [mergeFieldColumns, setMergeFieldColumns] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Step 3: Message Template
  const [messageTemplate, setMessageTemplate] = useState('Hi {{Name}}, your appointment is confirmed!');

  // Step 4: Schedule
  const [scheduleType, setScheduleType] = useState('recurring');
  const [scheduleTime, setScheduleTime] = useState('');
  const [cronOption, setCronOption] = useState('daily_9am');
  const [cronExpression, setCronExpression] = useState('0 9 * * *');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');

  // Step 5: Twilio Credentials
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioFromNumber, setTwilioFromNumber] = useState('');
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testingSms, setTestingSms] = useState(false);

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

  // When spreadsheet is selected via Picker
  const handleSpreadsheetSelect = async (id, docName) => {
    setError('');
    setSpreadsheetId(id);
    setSpreadsheetName(docName);
    if (!name) {
      setName(`${docName} SMS Campaign`);
    }

    setLoadingTabs(true);
    try {
      const res = await api.get(`/sheets/${id}/tabs`);
      if (res.data.success && res.data.tabs.length > 0) {
        setTabs(res.data.tabs);
        setSelectedTab(res.data.tabs[0].title);
      } else {
        setError('No sheets/tabs found in this spreadsheet.');
      }
    } catch (err) {
      if (err.response?.data?.code === 'TOKEN_REVOKED') {
        setError('Your Google authorization needs updating for offline access. Please click Reconnect Google Account.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch spreadsheet tabs.');
      }
    } finally {
      setLoadingTabs(false);
    }
  };

  // Step 1 -> Step 2: Fetch Preview
  const handleProceedToMapping = async () => {
    if (!name.trim()) {
      setError('Please enter a name for this flow.');
      return;
    }
    if (!spreadsheetId || !selectedTab) {
      setError('Please select a Google Spreadsheet and tab.');
      return;
    }
    setError('');
    setLoadingPreview(true);
    try {
      const res = await api.get(`/sheets/${spreadsheetId}/tabs/${encodeURIComponent(selectedTab)}/preview`);
      if (res.data.success) {
        const hdrs = res.data.headers || [];
        setHeaders(hdrs);
        setPreviewRows(res.data.rows || []);

        // Auto-select phone column if matching header exists
        const probablePhoneHeader = hdrs.find((h) =>
          /phone|mobile|cell|contact|number/i.test(h)
        );
        if (probablePhoneHeader) {
          setPhoneColumn(probablePhoneHeader);
        } else if (hdrs.length > 0) {
          setPhoneColumn(hdrs[0]);
        }

        // Auto-select merge fields
        setMergeFieldColumns(hdrs);

        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch sheet preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Helper insert merge tag into template
  const insertMergeTag = (colName) => {
    setMessageTemplate((prev) => `${prev} {{${colName}}}`);
  };

  // Render sample message using row 1 preview data
  const renderSamplePreview = () => {
    if (!previewRows || previewRows.length === 0) return messageTemplate;
    const sampleRow = previewRows[0];
    return messageTemplate.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
      const k = key.trim();
      return sampleRow[k] !== undefined ? sampleRow[k] : `[${k}]`;
    });
  };

  // Cron Quick Presets
  const handleCronPresetChange = (preset) => {
    setCronOption(preset);
    if (preset === 'daily_9am') setCronExpression('0 9 * * *');
    if (preset === 'daily_6pm') setCronExpression('0 18 * * *');
    if (preset === 'weekly_mon_9am') setCronExpression('0 9 * * 1');
    if (preset === 'every_hour') setCronExpression('0 * * * *');
  };

  // Test SMS
  const handleSendTestSms = async () => {
    setError('');
    if (!twilioSid || !twilioAuthToken || !twilioFromNumber || !testPhoneNumber) {
      setError('Please fill in Twilio SID, Auth Token, From Number, and a Test Phone Number.');
      return;
    }
    setTestingSms(true);
    try {
      const res = await api.post('/flows/test-sms', {
        twilioSid,
        twilioAuthToken,
        twilioFromNumber,
        testPhoneNumber,
        sampleMessage: renderSamplePreview(),
      });
      if (res.data.success) {
        alert(`Test SMS sent successfully! Twilio SID: ${res.data.messageSid}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Test SMS failed.');
    } finally {
      setTestingSms(false);
    }
  };

  // Final Save Flow
  const handleSaveFlow = async () => {
    setError('');
    if (!twilioSid || !twilioAuthToken || !twilioFromNumber) {
      setError('Twilio credentials are required.');
      return;
    }

    setSaving(true);
    try {
      const flowPayload = {
        name,
        spreadsheetId,
        sheetName: selectedTab,
        phoneColumn,
        countryCodeColumn,
        mergeFieldColumns,
        messageTemplate,
        scheduleType,
        scheduleTime: scheduleType === 'one_time' ? scheduleTime : null,
        cronExpression: scheduleType === 'recurring' ? cronExpression : '',
        timezone,
        twilioSid,
        twilioAuthToken,
        twilioFromNumber,
      };

      const res = await api.post('/flows', flowPayload);
      if (res.data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save flow.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc' }}>Create New SMS Flow</h2>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
          Follow the multi-step builder to configure Google Sheets mapping, message templates, schedules, and Twilio sender.
        </p>
      </div>

      {/* Stepper Bar */}
      <div className="stepper-container">
        {[
          { num: 1, label: 'Sheet & Tab' },
          { num: 2, label: 'Column Mapping' },
          { num: 3, label: 'Message Template' },
          { num: 4, label: 'Schedule' },
          { num: 5, label: 'Twilio & Launch' },
        ].map((s) => (
          <div key={s.num} className={`step-item ${step === s.num ? 'active' : step > s.num ? 'completed' : ''}`}>
            <div className="step-circle">{step > s.num ? <Check size={18} /> : s.num}</div>
            <span className="step-label">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <span>{error}</span>
          {(error.includes('Google') || error.includes('refresh token') || error.includes('authorization')) && (
            <button
              type="button"
              onClick={handleReconnectGoogle}
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
            >
              <RefreshCw size={14} /> Reconnect Google Account
            </button>
          )}
        </div>
      )}

      {/* STEP 1: SHEET & TAB SELECTION WITH GOOGLE PICKER */}
      {step === 1 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileSpreadsheet style={{ color: '#38bdf8' }} />
            Step 1: Select Google Spreadsheet via Drive Picker
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Flow Name *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Customer Appointment Reminders"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Google Spreadsheet *
              </label>
              <SpreadsheetPicker
                onSelect={handleSpreadsheetSelect}
                selectedSpreadsheetId={spreadsheetId}
                selectedSpreadsheetName={spreadsheetName}
              />
            </div>

            {loadingTabs && (
              <div style={{ fontSize: '13px', color: '#38bdf8', padding: '8px 0' }}>
                Loading spreadsheet tabs...
              </div>
            )}

            {tabs.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                  Select Sheet / Tab *
                </label>
                <select
                  className="input-field"
                  value={selectedTab}
                  onChange={(e) => setSelectedTab(e.target.value)}
                >
                  {tabs.map((t) => (
                    <option key={t.sheetId} value={t.title}>
                      {t.title} ({t.rowCount} rows)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={handleProceedToMapping}
                disabled={loadingPreview || !spreadsheetId || !selectedTab}
                className="btn-primary"
              >
                {loadingPreview ? 'Loading Preview...' : 'Next: Column Mapping'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: COLUMN MAPPING & LIVE PREVIEW */}
      {step === 2 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers style={{ color: '#38bdf8' }} />
            Step 2: Map Sheet Columns & Fields
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Phone Number Column *
              </label>
              <select
                className="input-field"
                value={phoneColumn}
                onChange={(e) => setPhoneColumn(e.target.value)}
              >
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Country Code Column (Optional)
              </label>
              <select
                className="input-field"
                value={countryCodeColumn}
                onChange={(e) => setCountryCodeColumn(e.target.value)}
              >
                <option value="">(None — numbers include +country code)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Sheet Sample Preview */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '12px' }}>
              Live Sample Preview (First 5 Rows)
            </h4>
            <div style={{ overflowX: 'auto', border: '1px solid #334155', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    {headers.map((h) => (
                      <th key={h} style={{ padding: '10px 14px', fontWeight: '600' }}>
                        {h} {h === phoneColumn && <span style={{ color: '#38bdf8' }}>(Phone)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 5).map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      {headers.map((h) => (
                        <td key={h} style={{ padding: '10px 14px', color: '#f8fafc' }}>
                          {r[h] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ArrowLeft size={18} />
              Back
            </button>
            <button onClick={() => setStep(3)} className="btn-primary">
              Next: Template Editor
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MESSAGE TEMPLATE EDITOR */}
      {step === 3 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles style={{ color: '#38bdf8' }} />
            Step 3: Compose SMS Message Template
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
              Click to Insert Merge Tags:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {headers.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => insertMergeTag(h)}
                  className="btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '12px', borderRadius: '6px' }}
                >
                  +{`{{${h}}}`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
              Message Template *
            </label>
            <textarea
              rows={4}
              className="input-field"
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              placeholder="e.g. Hi {{Name}}, your account status is {{Status}}."
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Real-time Rendered Sample Preview */}
          <div style={{ backgroundColor: '#0f172a', border: '1px dashed #0284c7', borderRadius: '12px', padding: '20px', marginBottom: '28px' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', marginBottom: '8px', fontWeight: '700' }}>
              Real-Time Rendered Preview (Row 1 Sample)
            </h4>
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px', color: '#f8fafc', fontSize: '14px', lineHeight: '1.5' }}>
              {renderSamplePreview()}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} className="btn-secondary">
              <ArrowLeft size={18} />
              Back
            </button>
            <button onClick={() => setStep(4)} className="btn-primary">
              Next: Schedule Config
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SCHEDULE CONFIGURATION */}
      {step === 4 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar style={{ color: '#38bdf8' }} />
            Step 4: Configure Execution Schedule
          </h3>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <label style={{ flex: 1, cursor: 'pointer' }}>
              <input
                type="radio"
                name="scheduleType"
                value="recurring"
                checked={scheduleType === 'recurring'}
                onChange={() => setScheduleType('recurring')}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: scheduleType === 'recurring' ? '2px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: scheduleType === 'recurring' ? 'rgba(56, 189, 248, 0.1)' : '#1e293b',
                  textAlign: 'center',
                }}
              >
                <h4 style={{ fontSize: '15px', color: '#f8fafc', marginBottom: '4px', fontWeight: '700' }}>Recurring Cron</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Run automatically on a repeating schedule</p>
              </div>
            </label>

            <label style={{ flex: 1, cursor: 'pointer' }}>
              <input
                type="radio"
                name="scheduleType"
                value="one_time"
                checked={scheduleType === 'one_time'}
                onChange={() => setScheduleType('one_time')}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  border: scheduleType === 'one_time' ? '2px solid #38bdf8' : '1px solid #334155',
                  backgroundColor: scheduleType === 'one_time' ? 'rgba(56, 189, 248, 0.1)' : '#1e293b',
                  textAlign: 'center',
                }}
              >
                <h4 style={{ fontSize: '15px', color: '#f8fafc', marginBottom: '4px', fontWeight: '700' }}>One-Time Run</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Run once at a specific date and time</p>
              </div>
            </label>
          </div>

          {scheduleType === 'recurring' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                  Frequency Preset
                </label>
                <select
                  className="input-field"
                  value={cronOption}
                  onChange={(e) => handleCronPresetChange(e.target.value)}
                >
                  <option value="daily_9am">Every Day at 9:00 AM</option>
                  <option value="daily_6pm">Every Day at 6:00 PM</option>
                  <option value="weekly_mon_9am">Every Monday at 9:00 AM</option>
                  <option value="every_hour">Every Hour</option>
                  <option value="custom">Custom Cron Expression</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                  Cron Expression *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={cronExpression}
                  onChange={(e) => {
                    setCronOption('custom');
                    setCronExpression(e.target.value);
                  }}
                  placeholder="0 9 * * *"
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Run Date & Time *
              </label>
              <input
                type="datetime-local"
                className="input-field"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          )}

          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
              Target Timezone *
            </label>
            <input
              type="text"
              className="input-field"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="e.g. America/New_York or UTC"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(3)} className="btn-secondary">
              <ArrowLeft size={18} />
              Back
            </button>
            <button onClick={() => setStep(5)} className="btn-primary">
              Next: Twilio Credentials
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TWILIO CREDENTIALS & LAUNCH */}
      {step === 5 && (
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key style={{ color: '#38bdf8' }} />
            Step 5: Twilio Credentials & Launch
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Twilio Account SID *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={twilioSid}
                onChange={(e) => setTwilioSid(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Twilio Auth Token *
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Encrypted at rest (never displayed raw again)"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '8px' }}>
                Twilio From Phone Number *
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="+18885550199"
                value={twilioFromNumber}
                onChange={(e) => setTwilioFromNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Test SMS Drawer */}
          <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '20px', marginBottom: '28px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PhoneCall size={18} style={{ color: '#22c55e' }} />
              Test SMS Credentials Before Saving
            </h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Your mobile phone number (+1...)"
                value={testPhoneNumber}
                onChange={(e) => setTestPhoneNumber(e.target.value)}
              />
              <button
                type="button"
                onClick={handleSendTestSms}
                disabled={testingSms}
                className="btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Send size={16} />
                {testingSms ? 'Sending...' : 'Send Test SMS'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(4)} className="btn-secondary">
              <ArrowLeft size={18} />
              Back
            </button>
            <button onClick={handleSaveFlow} disabled={saving} className="btn-primary" style={{ padding: '12px 24px', fontSize: '15px' }}>
              <CheckCircle2 size={20} />
              {saving ? 'Creating Flow...' : 'Save & Launch Flow'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
