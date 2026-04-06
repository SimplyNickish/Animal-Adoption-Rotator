'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Sparkles, AlertTriangle, Mail, Lock, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [widgetId, setWidgetId] = useState<string>('');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginFlow, setIsLoginFlow] = useState(true);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAndCreateWidget(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAndCreateWidget(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAndCreateWidget = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('widgets').select('widget_id').eq('user_id', userId).single();
      
      let finalWidgetId = data?.widget_id;

      if (!finalWidgetId) {
        const newUrlId = Math.random().toString(36).substring(2, 12);
        const { data: newRow, error: insertError } = await supabase.from('widgets')
          .insert({ user_id: userId, widget_id: newUrlId })
          .select('widget_id')
          .single();
          
        if (insertError) {
          console.error("Failed to allocate new widget ID: ", insertError);
          return;
        }
        finalWidgetId = newRow?.widget_id;
      }

      if (finalWidgetId) {
        setWidgetId(finalWidgetId);
      }
    } catch (e) {
      console.error("Configuration system failed to respond.", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        setAuthError("System Configuration Error: Missing Supabase Keys.");
        setIsLoading(false);
        return;
      }

      if (isLoginFlow) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setAuthError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
        } else {
          // Instruct user to check email if Supabase confirmation is active
          setAuthError("Success! If you don't instantly log in, please check your email for a confirmation link.");
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center p-8 bg-slate-950">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900 p-8 pt-10 rounded-3xl w-full max-w-md border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-4">
              <Sparkles className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Live-Service Ecosystem</h1>
            <p className="text-slate-400 text-sm">Create an account or login to access your dynamic widgets.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="email" 
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="password" 
                  autoComplete={isLoginFlow ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <AnimatePresence>
              {authError && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className={`text-sm p-3 rounded-lg border ${authError.includes('Success') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {authError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-slate-950 font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] flex items-center justify-center mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLoginFlow ? 'Secure Login' : 'Create Account')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => { setIsLoginFlow(!isLoginFlow); setAuthError(''); }}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLoginFlow ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-8 bg-slate-900 flex flex-col">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          Widget Dashboard
        </h1>
        <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg font-medium">
          Sign Out
        </button>
      </header>

      <main className="flex-1">
        <div className="bg-slate-800 p-8 rounded-3xl border border-white/5 shadow-2xl max-w-3xl">
          <h2 className="text-xl font-semibold mb-2 text-white">Your Streaming URL</h2>
          <p className="text-slate-400 mb-8">Add this precise URL to OBS Studio as a "Browser Source".</p>
          
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
               <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 blur-xl opacity-50 rounded-xl"></div>
               <input 
                 type="text" 
                 readOnly 
                 value={`${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${widgetId}`}
                 className="relative w-full bg-slate-950 border border-white/10 rounded-xl px-5 py-4 font-mono text-emerald-400 shadow-inner focus:outline-none"
               />
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/widget/${widgetId}`)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 px-8 rounded-xl transition-colors shadow-lg shrink-0"
            >
              Copy URL
            </button>
          </div>

          <div className="mt-8 p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-200/80 leading-relaxed font-medium">
              This widget ecosystem dynamically enforces background transparency on all endpoints. You do not need to inject custom CSS into OBS; simply paste the URL above and crop visually.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
