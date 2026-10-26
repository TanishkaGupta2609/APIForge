import { Link } from 'react-router-dom';
import { Activity, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Button } from '../../components/ui/Button.jsx';

export function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30 group-hover:bg-indigo-500 transition">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">APIForge</span>
          </Link>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create developer account</h2>
          <p className="text-xs text-slate-400 mt-1">
            Get started with isolated API load testing and analytics
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              <Input
                label="Full name"
                type="text"
                placeholder="Ada Lovelace"
                required
                icon={<User className="h-4 w-4" />}
              />
              <Input
                label="Email address"
                type="email"
                placeholder="developer@example.com"
                required
                icon={<Mail className="h-4 w-4" />}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Minimum 8 characters"
                required
                icon={<Lock className="h-4 w-4" />}
              />
              <div className="pt-2">
                <Button type="submit" className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Register Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
