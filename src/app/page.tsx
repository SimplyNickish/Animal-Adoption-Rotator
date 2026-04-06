'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Sparkles, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const [session, setSession] = useState<any>(null);
  const [widgetId, setWidgetId] = useState<string>('');
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

      // If user doesn't have a widget URL yet, permanently generate one for them
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

  const signIn = async () => {
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        alert("System Configuration Error: Missing Supabase Analytics Environment Keys. Please verify Vercel environment.");
        return;
      }
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo: window.location.origin }
      });
    } catch (e) {
      console.error("Auth redirect failed: ", e);
      alert("Authentication Service is currently unavailable. Contact Administrator.");
    }
  };

  if (!session) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-800 p-8 rounded-3xl text-center max-w-md border border-white/10 shadow-2xl">
          <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Live-Service Ecosystem</h1>
          <p className="text-slate-400 mb-8">Authenticate to access your dynamic OBS URL.</p>
          <button onClick={signIn} className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-6 rounded-xl transition-colors">
            Login via GitHub
          </button>
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
        <button onClick={() => supabase.auth.signOut()} className="text-slate-400 hover:text-white transition-colors">
          Sign Out
        </button>
      </header>

      <main className="flex-1">
        <div className="bg-slate-800 p-8 rounded-3xl border border-white/10 shadow-xl max-w-3xl">
          <h2 className="text-xl font-semibold mb-4 text-emerald-300">Your OBS Source URL</h2>
          <p className="text-slate-400 mb-6">Add this URL to OBS Studio as a "Browser Source". Ensure the background is transparent.</p>
          
          <div className="flex gap-4 items-center">
            <input 
              type="text" 
              readOnly 
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${widgetId}`}
              className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 font-mono text-emerald-400"
            />
            <button 
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/widget/${widgetId}`)}
              className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Copy Link
            </button>
          </div>

          <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-100/70">
              Your unique widget ID enforces the global transparent property needed for native OBS transparent scaling out-of-the-box.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
