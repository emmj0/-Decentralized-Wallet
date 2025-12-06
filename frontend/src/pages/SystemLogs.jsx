import React, { useEffect, useState } from 'react';
import useApi from '../hooks/useApi';
import Spinner from '../components/Spinner';

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { callApi } = useApi();

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const data = await callApi('/api/admin/logs?limit=100');
        setLogs(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch logs');
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [callApi]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">System Logs</h1>
      {loading && (
        <div className="flex justify-center items-center">
          <Spinner />
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          <p>Error: {error}</p>
        </div>
      )}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="table-auto w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2">Level</th>
                <th className="border border-slate-300 px-4 py-2">Message</th>
                <th className="border border-slate-300 px-4 py-2">Meta</th>
                <th className="border border-slate-300 px-4 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="border border-slate-300 px-4 py-2 text-center">{log.level}</td>
                  <td className="border border-slate-300 px-4 py-2">{log.message}</td>
                  <td className="border border-slate-300 px-4 py-2">
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(log.meta, null, 2)}</pre>
                  </td>
                  <td className="border border-slate-300 px-4 py-2 text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}