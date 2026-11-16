import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ToastProvider } from './components/ui/toast-provider';
import { Dashboard } from './pages/Dashboard';
import { Insights } from './pages/Insights';
import { ManageTags } from './pages/ManageTags';
import { Settings } from './pages/Settings';
import { Transactions } from './pages/Transactions';

export default function App() {
  return (
    <ToastProvider>
      <HashRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/tags" element={<ManageTags />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </HashRouter>
    </ToastProvider>
  );
}
