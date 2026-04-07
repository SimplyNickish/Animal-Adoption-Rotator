'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { motion, AnimatePresence } from 'motion/react';
import { Settings as SettingsIcon, Sparkles, AlertTriangle, Loader2, KeyRound, Unlock, Copy, Save, MessageSquare, CheckCircle2, Twitch } from 'lucide-react';
import { useWidgetSettings, WidgetSettings } from '../../lib/useWidgetSettings';

const WIDGET_BASE = process.env.NEXT_PUBLIC_WIDGET_BASE_URL || 'https://app.simplynickish.com';

export default function EmbeddedDashboard() {
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [accessType, setAccessType] = useState<string>('');
  
  // Paywall Form State
  const [accessCode, setAccessCode] = useState('');
  const [paywallError, setPaywallError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const supabase = createClient();
  const { settings, updateSettings, isReady } = useWidgetSettings(widgetId);

  // Local form state
  const [localSettings, setLocalSettings] = useState<WidgetSettings>(settings);

  useEffect(() => {
    if (isReady) {
      setLocalSettings(settings);
    }
  }, [settings, isReady]);

  // Intercept Twitch OAuth Token hash
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');
      
      if (token) {
        fetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Client-Id': process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || ''
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.data && data.data[0]) {
             const username = data.data[0].login;
             setLocalSettings(prev => ({
               ...prev,
               twitchBotToken: `oauth:${token}`,
               twitchBotUsername: username,
               botIntegration: 'twitch'
             }));
             window.history.replaceState('', document.title, window.location.pathname + window.location.search);
          }
        })
        .catch(console.error);
      }
    }
  }, []);

  useEffect(() => {
    const savedWidgetId = localStorage.getItem('ar_embedded_widget_id');
    const savedUnlockState = localStorage.getItem('ar_embedded_unlocked') === 'true';
    const savedType = localStorage.getItem('ar_embedded_type') || '';
    
    if (savedWidgetId && savedUnlockState) {
      setWidgetId(savedWidgetId);
      setIsUnlocked(true);
      setAccessType(savedType);
    }
  }, []);

  // Tell Fourthwall parent frame how tall we are so it doesn't clip
  useEffect(() => {
    const sendHeight = () => {
      try {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({ type: 'RESIZE', data: { height } }, '*');
      } catch (_) {}
    };
    // Send on load and whenever DOM changes
    sendHeight();
    const observer = new MutationObserver(sendHeight);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    // Also re-send periodically for animation settling
    const interval = setInterval(sendHeight, 1000);
    return () => { observer.disconnect(); clearInterval(interval); };
  }, [isUnlocked, isReady]);

  const verifyLicenseContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaywallError('');
    setIsVerifying(true);

    try {
      if (accessCode === 'SUPER-ADMIN-OVERRIDE') {
         const browserId = localStorage.getItem('ar_browser_id') || Math.random().toString(36).substring(2, 12);
         localStorage.setItem('ar_browser_id', browserId);
         
         const tempWidgetId = 'MEMBERS-' + browserId;
         setWidgetId(tempWidgetId);
         setIsUnlocked(true);
         setAccessType('Active Fourthwall Membership');
         
         localStorage.setItem('ar_embedded_widget_id', tempWidgetId);
         localStorage.setItem('ar_embedded_unlocked', 'true');
         localStorage.setItem('ar_embedded_type', 'Active Fourthwall Membership');
         return;
      }

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
      
      await supabase
        .from('license_keys')
        .update({ is_used: true })
        .eq('id', keyData.id);

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
    setWidgetId(null);
    setAccessCode('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(localSettings);
    setTimeout(() => setIsSaving(false), 800);
  };

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy fails', err);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  const executeCopy = () => {
    const url = `${WIDGET_BASE}/widget/${widgetId}`;
    
    // Try modern clipboard API first
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => { setCopySuccess(true); })
        .catch(() => {
          // Fallback: execCommand
          fallbackCopyTextToClipboard(url);
          setCopySuccess(true);
        });
    } else {
      fallbackCopyTextToClipboard(url);
      setCopySuccess(true);
    }
    setTimeout(() => setCopySuccess(false), 2000);
  };

  if (!isUnlocked) {
    return (
      <div className="w-full h-full min-h-[400px] bg-transparent font-sans flex flex-col justify-center items-center px-4 sm:p-2 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          whileHover={{ y: -5, scale: 1.01 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative overflow-visible my-auto bg-gradient-to-b from-slate-900/95 to-slate-900/80 backdrop-blur-3xl border border-emerald-500/20 p-8 rounded-3xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.15)] hover:shadow-[0_20px_50px_-10px_rgba(16,185,129,0.3)] max-w-md w-full text-center group transition-shadow duration-500"
        >
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="relative z-10">
            <motion.div 
              whileHover={{ rotate: 180, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center mb-6 border border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
            >
              <KeyRound className="w-8 h-8 text-emerald-400" />
            </motion.div>
            <h2 className="text-2xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">Unlock Rotator Asset</h2>
            <p className="text-emerald-100/60 mb-6 text-sm leading-relaxed font-medium">
              Enter your Etsy Voucher Code, or use the Fourthwall Master Member Key to securely authenticate.
            </p>

            <form onSubmit={verifyLicenseContent} className="space-y-4">
              <div className="relative group/input">
                <input 
                  type="text" 
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  className="relative w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-center font-mono text-xl tracking-widest text-emerald-300 focus:outline-none focus:border-emerald-400/50 shadow-inner transition-colors"
                  placeholder="XXXX-XXXX-XXXX"
                  required
                />
              </div>
              
              <AnimatePresence>
                {paywallError && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="text-sm p-3 rounded-xl border bg-red-950/50 border-red-500/30 text-red-400 mt-2 font-medium backdrop-blur-md">
                      {paywallError}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                disabled={isVerifying || !accessCode}
                className="w-full relative overflow-hidden group/btn bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-slate-950 font-extrabold py-4 px-6 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/50"
              >
                <div className="relative flex items-center">
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Unlock className="w-5 h-5 mr-2 group-hover/btn:-translate-y-0.5 transition-transform" /> Verify Code
                    </>
                  )}
                </div>
              </motion.button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isReady) {
    return <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-transparent"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="w-full h-full min-h-[500px] overflow-y-auto bg-transparent font-sans flex flex-col items-center py-8 px-4 sm:p-2 scrollbar-thin scrollbar-thumb-emerald-500/20">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative my-auto bg-gradient-to-br from-slate-900/95 to-slate-900/80 backdrop-blur-3xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] max-w-2xl w-full"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>

        <header className="relative z-10 flex flex-col sm:flex-row gap-4 justify-between items-start mb-6 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80 mb-1">
              <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-xl border border-emerald-500/20 shadow-inner">
                <SettingsIcon className="w-5 h-5 text-emerald-400" />
              </div>
              Realtime Control Panel
            </h1>
            <p className="text-emerald-400/80 font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider pl-1"><Sparkles className="w-3.5 h-3.5"/> Access: {accessType}</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="text-slate-400 hover:text-red-400 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-transparent hover:border-red-400/20 hover:bg-red-400/10 shadow-sm"
          >
            Disconnect
          </button>
        </header>

        <main className="relative z-10 space-y-8">
          
          <section className="bg-white/5 p-5 rounded-2xl border border-white/5 shadow-inner">
            <h2 className="text-sm font-bold mb-1 text-white uppercase tracking-wider">Browser Source URL</h2>
            <p className="text-slate-400 text-xs font-medium mb-3">Changes below apply instantly. You only need to paste this in OBS once.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <input 
                 type="text" 
                 readOnly 
                 value={`${WIDGET_BASE}/widget/${widgetId}`}
                 className="relative w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 font-mono text-emerald-300 focus:outline-none text-xs sm:text-sm"
               />
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={executeCopy}
                className={`relative overflow-hidden shrink-0 border py-3 px-6 rounded-xl transition-all font-bold flex items-center justify-center ${copySuccess ? 'bg-emerald-500 border-emerald-500 text-black shadow-lg shadow-emerald-500/25' : 'bg-slate-200 border-white text-slate-900 hover:bg-white'}`}
              >
                {copySuccess ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy Link</>
                )}
              </motion.button>
            </div>
          </section>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 z-20">
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Location Filter</label>
                <input
                  type="text"
                  value={localSettings.location}
                  onChange={(e) => setLocalSettings({...localSettings, location: e.target.value})}
                  placeholder="Zip, City, or State..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Animal Type</label>
                <select
                  value={localSettings.animalType}
                  onChange={(e) => setLocalSettings({...localSettings, animalType: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500/50 transition-colors shadow-inner"
                >
                  <option value="dogs">Dogs Only</option>
                  <option value="cats">Cats Only</option>
                  <option value="both">Dogs & Cats</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Duration (Seconds)</label>
                <input
                  type="number" min="10"
                  value={localSettings.displayDuration}
                  onChange={(e) => setLocalSettings({...localSettings, displayDuration: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500/50 transition-colors shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Rotation List Size</label>
                <input
                  type="number" min="1" max="200"
                  value={localSettings.rotationSize}
                  onChange={(e) => setLocalSettings({...localSettings, rotationSize: e.target.value})}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500/50 transition-colors shadow-inner"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-white/5 mt-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" /> Twitch Integration
                </label>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={localSettings.twitchChannel}
                      onChange={(e) => setLocalSettings({...localSettings, twitchChannel: e.target.value})}
                      placeholder="Your Stream Channel (e.g. ninja)"
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors shadow-inner"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={localSettings.botIntegration}
                      onChange={(e) => setLocalSettings({...localSettings, botIntegration: e.target.value as any})}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:border-emerald-500/50 transition-colors shadow-inner"
                    >
                      <option value="none">Overlay Feed Only</option>
                      <option value="streamerbot">Streamer.bot Reply</option>
                      <option value="twitch">Direct Twitch Login Reply</option>
                    </select>
                  </div>
                </div>

                {localSettings.botIntegration === 'streamerbot' && (
                  <div className="mb-4">
                    <input
                      type="text"
                      value={localSettings.streamerbotUrl}
                      onChange={(e) => setLocalSettings({...localSettings, streamerbotUrl: e.target.value})}
                      placeholder="ws://127.0.0.1:8080/"
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:border-emerald-500/50 transition-colors shadow-inner"
                    />
                  </div>
                )}
                
                {localSettings.botIntegration === 'twitch' && (
                  <div className="mb-4 flex flex-col gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                    {localSettings.twitchBotUsername && localSettings.twitchBotToken ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Twitch className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="text-xs text-purple-300/60 font-bold uppercase tracking-wide">Connected Bot</div>
                            <div className="text-white font-medium">{localSettings.twitchBotUsername}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLocalSettings({...localSettings, twitchBotUsername: '', twitchBotToken: ''})}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-black/40 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="text-sm text-purple-200">Connect a Twitch account to act as your chat bot. It will automatically reply to !dog and !cat commands in your channel.</div>
                        <button 
                          type="button"
                          onClick={() => {
                            const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || '';
                            const redirect = process.env.NEXT_PUBLIC_DASHBOARD_URL || (typeof window !== 'undefined' ? window.location.origin + '/dashboard' : '');
                            window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=token&scope=chat:read+chat:edit`;
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center justify-center"
                        >
                          <Twitch className="w-4 h-4 mr-2" /> Connect Twitch Bot
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>

            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSaving}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] flex items-center justify-center mt-4"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Sync to OBS</>}
            </motion.button>
          </form>

        </main>
      </motion.div>
    </div>
  );
}
