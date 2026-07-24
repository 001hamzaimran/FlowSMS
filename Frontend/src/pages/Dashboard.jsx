import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { PlusCircle, Play, Pause, Trash2, Eye, FileSpreadsheet, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

export const Dashboard = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['flows'],
    queryFn: async () => {
      const res = await api.get('/flows');
      return res.data.flows;
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id) => api.patch(`/flows/${id}/pause`),
    onSuccess: () => queryClient.invalidateQueries(['flows']),
  });

  const resumeMutation = useMutation({
    mutationFn: async (id) => api.patch(`/flows/${id}/resume`),
    onSuccess: () => queryClient.invalidateQueries(['flows']),
  });

  const runNowMutation = useMutation({
    mutationFn: async (id) => api.post(`/flows/${id}/run`),
    onSuccess: () => {
      alert('Flow run triggered successfully!');
      queryClient.invalidateQueries(['flows']);
    },
    onError: (err) => {
      alert(`Run failed: ${err.response?.data?.message || err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/flows/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['flows']),
  });

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete flow "${name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusBadge = (status) => {
    const classMap = {
      active: 'badge-active',
      paused: 'badge-paused',
      completed: 'badge-completed',
      error: 'badge-error',
      draft: 'badge-draft',
    };
    return <span className={`badge ${classMap[status] || 'badge-draft'}`}>{status}</span>;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#f8fafc' }}>Flow Automation Dashboard</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
            Manage your active SMS campaigns, schedules, and Twilio sender configurations.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => refetch()} className="btn-secondary" style={{ padding: '9px 14px' }}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link to="/flows/new" className="btn-primary">
            <PlusCircle size={18} />
            Create New Flow
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Loading flows...</div>
      ) : error ? (
        <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', padding: '20px', borderRadius: '12px', color: '#f43f5e' }}>
          Failed to load flows: {error.message}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: '#334155', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', marginBottom: '16px' }}>
            <FileSpreadsheet size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', marginBottom: '8px' }}>No SMS Flows Created Yet</h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
            Connect your first Google Sheet, set your message template, and schedule automated SMS runs.
          </p>
          <Link to="/flows/new" className="btn-primary">
            <PlusCircle size={18} />
            Create Your First Flow
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
          {data.map((flow) => (
            <div key={flow._id} className="glass-card glass-card-hover" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                    {flow.name}
                  </h3>
                  {getStatusBadge(flow.status)}
                </div>

                {flow.status === 'error' && flow.errorMessage && (
                  <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={16} />
                    {flow.errorMessage}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#cbd5e1', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileSpreadsheet size={15} style={{ color: '#38bdf8' }} />
                    <span style={{ color: '#94a3b8' }}>Sheet:</span>
                    <strong style={{ color: '#f8fafc' }}>{flow.sheetName}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} style={{ color: '#f59e0b' }} />
                    <span style={{ color: '#94a3b8' }}>Schedule:</span>
                    <span>
                      {flow.scheduleType === 'recurring' ? `Cron (${flow.cronExpression}) [${flow.timezone}]` : 'One-time'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Last Run: {flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {flow.status === 'active' ? (
                    <button
                      onClick={() => pauseMutation.mutate(flow._id)}
                      disabled={pauseMutation.isPending}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      title="Pause Flow"
                    >
                      <Pause size={14} />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => resumeMutation.mutate(flow._id)}
                      disabled={resumeMutation.isPending}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.3)' }}
                      title="Resume Flow"
                    >
                      <Play size={14} />
                      Resume
                    </button>
                  )}

                  <button
                    onClick={() => runNowMutation.mutate(flow._id)}
                    disabled={runNowMutation.isPending}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                    title="Run Now"
                  >
                    <Play size={14} />
                    Run Now
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <Link to={`/flows/${flow._id}`} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '12px' }}>
                    <Eye size={14} />
                  </Link>
                  <button
                    onClick={() => handleDelete(flow._id, flow.name)}
                    className="btn-danger"
                    style={{ padding: '6px 10px' }}
                    title="Delete Flow"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
