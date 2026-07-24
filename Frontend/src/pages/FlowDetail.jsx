import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import {
  ArrowLeft,
  Play,
  Pause,
  RefreshCw,
  FileSpreadsheet,
  Clock,
  Key,
  ListCheck,
  History,
  CheckCircle,
  AlertCircle,
  XCircle,
  SkipForward,
} from 'lucide-react';

export const FlowDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('runs'); // 'runs' or 'records'

  const { data: flow, isLoading: loadingFlow } = useQuery({
    queryKey: ['flow', id],
    queryFn: async () => {
      const res = await api.get(`/flows/${id}`);
      return res.data.flow;
    },
  });

  const { data: runs, isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['flowRuns', id],
    queryFn: async () => {
      const res = await api.get(`/flows/${id}/runs`);
      return res.data.runs;
    },
  });

  const { data: records, isLoading: loadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['sentRecords', id],
    queryFn: async () => {
      const res = await api.get(`/flows/${id}/records`);
      return res.data.records;
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async () => api.post(`/flows/${id}/run`),
    onSuccess: () => {
      alert('Manual run started successfully!');
      queryClient.invalidateQueries(['flow', id]);
      queryClient.invalidateQueries(['flowRuns', id]);
      queryClient.invalidateQueries(['sentRecords', id]);
    },
    onError: (err) => {
      alert(`Run failed: ${err.response?.data?.message || err.message}`);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => api.patch(`/flows/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries(['flow', id]),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => api.patch(`/flows/${id}/resume`),
    onSuccess: () => queryClient.invalidateQueries(['flow', id]),
  });

  if (loadingFlow) {
    return <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading flow details...</div>;
  }

  if (!flow) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', textAlign: 'center', color: '#f43f5e' }}>
        Flow not found. <Link to="/dashboard" style={{ color: '#38bdf8' }}>Return to Dashboard</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
      <Link to="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '26px', fontWeight: '800', color: '#f8fafc' }}>{flow.name}</h2>
            <span className={`badge badge-${flow.status}`}>{flow.status}</span>
          </div>
          <p style={{ fontSize: '14px', color: '#94a3b8' }}>Created on {new Date(flow.createdAt).toLocaleDateString()}</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {flow.status === 'active' ? (
            <button onClick={() => pauseMutation.mutate()} className="btn-secondary">
              <Pause size={16} /> Pause
            </button>
          ) : (
            <button onClick={() => resumeMutation.mutate()} className="btn-secondary" style={{ color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
              <Play size={16} /> Resume
            </button>
          )}

          <button onClick={() => runNowMutation.mutate()} disabled={runNowMutation.isPending} className="btn-primary">
            <Play size={16} /> {runNowMutation.isPending ? 'Starting Run...' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Flow Configuration Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '8px', fontSize: '13px', fontWeight: '700' }}>
            <FileSpreadsheet size={16} />
            GOOGLE SHEET
          </div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>{flow.sheetName}</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Phone Col: <strong>{flow.phoneColumn}</strong></p>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px', fontSize: '13px', fontWeight: '700' }}>
            <Clock size={16} />
            SCHEDULE
          </div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
            {flow.scheduleType === 'recurring' ? `Cron: ${flow.cronExpression}` : 'One-Time'}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Timezone: <strong>{flow.timezone}</strong></p>
        </div>

        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', marginBottom: '8px', fontSize: '13px', fontWeight: '700' }}>
            <Key size={16} />
            TWILIO SENDER
          </div>
          <p style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>{flow.twilioFromNumber}</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Auth Token: <strong>{flow.twilioAuthTokenMasked}</strong></p>
        </div>
      </div>

      {/* Tabs for Runs vs Sent Records */}
      <div style={{ borderBottom: '1px solid #334155', display: 'flex', gap: '24px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('runs')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '15px',
            fontWeight: '600',
            color: activeTab === 'runs' ? '#38bdf8' : '#94a3b8',
            borderBottom: activeTab === 'runs' ? '2px solid #38bdf8' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <History size={18} />
          Execution Runs ({runs?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('records')}
          style={{
            background: 'none',
            border: 'none',
            padding: '12px 4px',
            fontSize: '15px',
            fontWeight: '600',
            color: activeTab === 'records' ? '#38bdf8' : '#94a3b8',
            borderBottom: activeTab === 'records' ? '2px solid #38bdf8' : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ListCheck size={18} />
          Sent Records History ({records?.length || 0})
        </button>
      </div>

      {/* RUNS HISTORY TABLE */}
      {activeTab === 'runs' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>Flow Execution Log</h3>
            <button onClick={() => refetchRuns()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loadingRuns ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading runs...</p>
          ) : !runs || runs.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No execution runs recorded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px 12px' }}>Started At</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Processed</th>
                    <th style={{ padding: '10px 12px' }}>Sent</th>
                    <th style={{ padding: '10px 12px' }}>Skipped (Dedup)</th>
                    <th style={{ padding: '10px 12px' }}>Invalid</th>
                    <th style={{ padding: '10px 12px' }}>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r._id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', color: '#f8fafc' }}>{new Date(r.startedAt).toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${r.status === 'completed' ? 'active' : r.status === 'failed' ? 'error' : 'paused'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#f8fafc' }}>{r.rowsProcessed}</td>
                      <td style={{ padding: '12px', color: '#4ade80', fontWeight: '600' }}>{r.rowsSent}</td>
                      <td style={{ padding: '12px', color: '#fbbf24' }}>{r.rowsSkipped}</td>
                      <td style={{ padding: '12px', color: '#94a3b8' }}>{r.rowsInvalid}</td>
                      <td style={{ padding: '12px', color: '#f43f5e' }}>{r.rowsFailed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SENT RECORDS TABLE */}
      {activeTab === 'records' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>Deduplicated Message Log</h3>
            <button onClick={() => refetchRecords()} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loadingRecords ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Loading records...</p>
          ) : !records || records.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>No sent records found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px 12px' }}>Phone (E.164)</th>
                    <th style={{ padding: '10px 12px' }}>Sent Date</th>
                    <th style={{ padding: '10px 12px' }}>Twilio SID</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec._id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '12px', color: '#f8fafc', fontWeight: '600' }}>{rec.phoneNumberE164}</td>
                      <td style={{ padding: '12px', color: '#cbd5e1' }}>{new Date(rec.sentAt).toLocaleString()}</td>
                      <td style={{ padding: '12px', color: '#94a3b8', fontFamily: 'monospace' }}>{rec.twilioMessageSid || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span className={`badge badge-${rec.status === 'delivered' ? 'active' : rec.status === 'failed' ? 'error' : 'paused'}`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
