import { Link } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-12 w-12 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mb-6">
        <Activity className="h-6 w-6" />
      </div>
      <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
        404 — Page Not Found
      </span>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-3">
        Route Does Not Exist
      </h1>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-8">
        The endpoint or resource you requested could not be located in APIForge. Check the URL or return to safety.
      </p>
      <Link to="/">
        <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Return to Home
        </Button>
      </Link>
    </div>
  );
}

export default NotFoundPage;
