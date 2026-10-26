import { useState, useEffect } from 'react';
import { Navbar } from './Navbar.jsx';
import { Sidebar } from './Sidebar.jsx';
import { Header } from './Header.jsx';
import apiClient from '../../services/apiClient.js';

export function DashboardShell({
  children,
  title = 'Dashboard',
  subtitle = 'Overview of API test targets and load performance metrics',
}) {
  const [serverStatus, setServerStatus] = useState('checking');
  const [databaseStatus, setDatabaseStatus] = useState('checking');

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const response = await apiClient.get('/health');
        if (isMounted) {
          if (response?.data?.status === 'healthy') {
            setServerStatus('online');
            setDatabaseStatus(response?.data?.database || 'connected');
          } else {
            setServerStatus('offline');
            setDatabaseStatus('disconnected');
          }
        }
      } catch {
        if (isMounted) {
          setServerStatus('offline');
          setDatabaseStatus('disconnected');
        }
      }
    };

    checkHealth();
    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar serverStatus={serverStatus} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <Header
            title={title}
            subtitle={subtitle}
            serverStatus={serverStatus}
            databaseStatus={databaseStatus}
          />
          <div className="p-6 max-w-7xl w-full mx-auto flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default DashboardShell;
