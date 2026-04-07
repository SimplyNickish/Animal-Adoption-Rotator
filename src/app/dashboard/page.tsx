'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Sparkles, AlertTriangle, Loader2, KeyRound, Unlock, Copy } from 'lucide-react';

export default function EmbeddedDashboard() {
  const [widgetId, setWidgetId] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [accessType, setAccessType] = useState<string>('');
  
  // Paywall Form State
  const [accessCode, setAccessCode] = useState('');
  const [paywallError, setPaywallError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    // Check Local Browser Memory for an already established widget session
    const savedWidgetId = localStorage.getItem('ar_embedded_widget_id');
    const savedUnlockState = localStorage.getItem('ar_embedded_unlocked') === 'true';
    const savedType = localStorage.getItem('ar_embedded_type') || '';
    
    if (savedWidgetId && savedUnlockState) {
      setWidgetId(savedWidgetId);
      setIsUnlocked(true);
      setAccessType(savedType);
    }
  }, []);

  const verifyLicenseContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaywallError('');
    setIsVerifying(true);

    try {
      // Create a master override for Fourthwall Members unconditionally
      if (accessCode === 'SUPER-ADMIN-OVERRIDE') {
         // Because members share this URL, their individual settings are handled purely by their OBS LocalStorage isolation natively
         const tempWidgetId = 'MEMBERS-MASTER';
         setWidgetId(tempWidgetId);
         setIsUnlocked(true);
         setAccessType('Active Fourthwall Membership');
         
         localStorage.setItem('ar_embedded_widget_id', tempWidgetId);
         localStorage.setItem('ar_embedded_unlocked', 'true');
         localStorage.setItem('ar_embedded_type', 'Active Fourthwall Membership');
         return;
      }

      // Step 1: Check Database for active Etsy Lifetime Code
      const { data: keyData, error: keyError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('code', accessCode)
        .eq('is_used', false)
        .single();
        
      if (keyError || !keyData) {
        setPaywallError("Invalid or expired Access Code.");
        setIsVerifying(false);
        return;
      }
      
      // Step 2: Mark code as consumed by this random allocation
      await supabase
        .from('license_keys')
        .update({ is_used: true })
        .eq('id', keyData.id);

      // Give them a lifetime URL based directly off their Etsy transaction code
      const tempWidgetId = 'LIFETIME-' + accessCode;
      
      setWidgetId(tempWidgetId);
      setIsUnlocked(true);
      setAccessType('Lifetime Etsy Voucher');
      
      localStorage.setItem('ar_embedded_widget_id', tempWidgetId);
      localStorage.setItem('ar_embedded_unlocked', 'true');
      localStorage.setItem('ar_embedded_type', 'Lifetime Etsy Voucher');

    } catch (err: any) {
      console.error(err);
      setPaywallError("Internal verification error. Contact support.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ar_embedded_widget_id');
    localStorage.removeItem('ar_embedded_unlocked');
    localStorage.removeItem('ar_embedded_type');
    setIsUnlocked(false);
    setWidgetId('');
    setAccessCode('');
  };

  // ----- UI STATE: NO ACCESS CODE PROVIDED -----
  if (!isUnlocked) {
    return (
      <div className="w-full bg-transparent font-sans flex flex-col justify-center items-center py-8 px-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 p-8 lg:p-10 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.1)] max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
            <KeyRound className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white">Unlock Rotator Asset</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Please enter your Etsy Vouncher Code, or use the Fourthwall Master Member Key provided on your membership dashboard.
          </p>

          <form onSubmit={verifyLicenseContent} className="space-y-4">
            <input 
              type="text" 
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-widest text-emerald-300 focus:outline-none focus:border-emerald-500/50"
              placeholder="XXXX-XXXX-XXXX"
              required
            />
            
            <AnimatePresence>
              {paywallError && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="text-sm p-3 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 mt-2 font-medium">
                    {paywallError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit" 
              disabled={isVerifying || !accessCode}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 px-6 rounded-2xl transition-all shadow-lg flex items-center justify-center mt-4 disabled:opacity-50"
            >
              {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Unlock className="w-5 h-5 mr-2" /> Verify Code
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ----- UI STATE: UNLOCKED DASHBOARD -----
  return (
    <div className="w-full bg-transparent font-sans flex flex-col items-center justify-center py-8 px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-8 lg:p-12 rounded-3xl shadow-2xl max-w-3xl w-full">
        <header className="flex justify-between items-start mb-8 pb-8 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-white mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Settings className="w-6 h-6 text-emerald-400" />
              </div>
              Control Panel
            </h1>
            <p className="text-emerald-400/80 font-medium text-sm flex items-center gap-1.5"><Sparkles className="w-4 h-4"/> Authorized via: {accessType}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:bg-white/5 border border-transparent hover:border-white/10">
            Disconnect
          </button>
        </header>

        <main>
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2 text-white">Your Streaming URL</h2>
            <p className="text-slate-400 text-sm">Copy this secure endpoint and paste it into OBS Studio as a Browser Source.</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1 relative">
               <input 
                 type="text" 
                 readOnly 
                 value={`${typeof window !== 'undefined' ? window.location.origin : ''}/widget/${widgetId}`}
                 className="relative w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 font-mono text-emerald-300 shadow-inner focus:outline-none h-full"
               />
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/widget/${widgetId}`)}
              className="bg-white hover:bg-slate-100 text-slate-950 font-bold py-4 px-8 rounded-2xl transition-all shadow-lg flex items-center justify-center shrink-0"
            >
              <Copy className="w-5 h-5 mr-2" /> Copy Link
            </button>
          </div>

          <div className="mt-8 p-5 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-cyan-100/80 text-sm leading-relaxed">
              <strong className="text-cyan-300 block mb-1">Architecture Note</strong>
              Because you are accessing this directly inside your Member Dashboard, you do not need to configure CSS or Alpha layers in OBS.
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  );
}
