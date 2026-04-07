'use client';
import React, { useEffect, useState, Component, ErrorInfo, ReactNode, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Heart, Info, Sparkles, Settings, X, SearchX, MessageSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import tmi from 'tmi.js';
import { Animal, fetchAllAnimals } from '../lib/api';
import { createClient } from '../lib/supabase/client';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-8">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-slate-400 mb-4 text-center max-w-md">
            The overlay encountered an error. Please check your settings or refresh the page.
          </p>
          <pre className="bg-black/50 p-4 rounded-lg text-sm text-red-400 max-w-2xl overflow-auto">
            {(this as any).state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
          >
            Reload Overlay
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [accessState, setAccessState] = useState<'verifying' | 'unlocked' | 'locked'>('verifying');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const currentAnimal = animals[currentIndex] || null;
  const nextAnimal = animals[(currentIndex + 1) % animals.length] || null;

  const [pictureIndex, setPictureIndex] = useState(0);
  const [noAnimalsFound, setNoAnimalsFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [locationInput, setLocationInput] = useState('');
  const [animalTypeInput, setAnimalTypeInput] = useState('both');
  const [displayDurationInput, setDisplayDurationInput] = useState('60');
  const [rotationSizeInput, setRotationSizeInput] = useState('50');
  const [twitchChannelInput, setTwitchChannelInput] = useState('');
  const [twitchBotUsernameInput, setTwitchBotUsernameInput] = useState('');
  const [twitchBotTokenInput, setTwitchBotTokenInput] = useState('');
  const [botIntegrationInput, setBotIntegrationInput] = useState<'none' | 'twitch' | 'streamerbot'>('none');
  const [streamerbotUrlInput, setStreamerbotUrlInput] = useState('ws://127.0.0.1:8080/');

  // Active Settings (applied)
  const [activeLocation, setActiveLocation] = useState('');
  const [activeAnimalType, setActiveAnimalType] = useState('both');
  const [activeDisplayDuration, setActiveDisplayDuration] = useState(60);
  const [activeRotationSize, setActiveRotationSize] = useState(50);
  const [activeTwitchChannel, setActiveTwitchChannel] = useState('');
  const [activeTwitchBotUsername, setActiveTwitchBotUsername] = useState('');
  const [activeTwitchBotToken, setActiveTwitchBotToken] = useState('');
  const [activeBotIntegration, setActiveBotIntegration] = useState<'none' | 'twitch' | 'streamerbot'>('none');
  const [activeStreamerbotUrl, setActiveStreamerbotUrl] = useState('ws://127.0.0.1:8080/');

  const twitchClientRef = useRef<tmi.Client | null>(null);
  const sbWsRef = useRef<WebSocket | null>(null);
  const animalsRef = useRef(animals);
  const currentIndexRef = useRef(currentIndex);

  useEffect(() => {
    animalsRef.current = animals;
  }, [animals]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Verify License/Subscription from Supabase based on Widget URL
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const urlParts = window.location.pathname.split('/');
        // e.g. /widget/abc123xyz
        const urlWidgetId = urlParts[urlParts.length - 1];
        
        if (!urlWidgetId || urlWidgetId === 'widget') {
          setAccessState('locked');
          return;
        }

        // 1. MASTER MEMBERSHIP BYPASS
        if (urlWidgetId === 'MEMBERS-MASTER') {
          setAccessState('unlocked');
          return;
        }

        // 2. LIFETIME ETSY VOUCHER VALIDATION
        if (urlWidgetId.startsWith('LIFETIME-')) {
          const etsyCode = urlWidgetId.replace('LIFETIME-', '');
          const supabase = createClient();
          const { data, error } = await supabase
            .from('license_keys')
            .select('is_used')
            .eq('code', etsyCode)
            .single();

          if (!error && data && data.is_used) {
            setAccessState('unlocked');
            return;
          }
        }

        // 3. SECURE FALLBACK 
        setAccessState('locked');
        
      } catch (err) {
        setAccessState('locked');
      }
    };
    
    verifyAccess();
  }, []);

  // Initialize from URL or LocalStorage
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    
    const getVal = (key: string, defaultVal: string) => {
      const urlVal = searchParams.get(key);
      if (urlVal !== null) return urlVal;
      const lsVal = localStorage.getItem(`pet_overlay_${key}`);
      if (lsVal !== null) return lsVal;
      return defaultVal;
    };

    const loc = getVal('location', '');
    const type = getVal('animalType', 'both');
    
    const durationRaw = parseInt(getVal('displayDuration', '60'));
    const duration = isNaN(durationRaw) || durationRaw < 10 ? 60 : durationRaw;
    
    const limitRaw = parseInt(getVal('rotationSize', '50'));
    const limit = isNaN(limitRaw) || limitRaw < 1 ? 50 : limitRaw;
    
    const twitch = getVal('twitchChannel', '');
    const botUser = getVal('twitchBotUsername', '');
    const botToken = getVal('twitchBotToken', '');
    const botInt = getVal('botIntegration', 'none') as any;
    const sbUrl = getVal('streamerbotUrl', 'ws://127.0.0.1:8080/');

    setLocationInput(loc);
    setActiveLocation(loc);
    
    setAnimalTypeInput(type);
    setActiveAnimalType(type);

    setDisplayDurationInput(duration.toString());
    setActiveDisplayDuration(duration);

    setRotationSizeInput(limit.toString());
    setActiveRotationSize(limit);

    setTwitchChannelInput(twitch);
    setActiveTwitchChannel(twitch);

    setTwitchBotUsernameInput(botUser);
    setActiveTwitchBotUsername(botUser);

    setTwitchBotTokenInput(botToken);
    setActiveTwitchBotToken(botToken);

    setBotIntegrationInput(botInt);
    setActiveBotIntegration(botInt);

    setStreamerbotUrlInput(sbUrl);
    setActiveStreamerbotUrl(sbUrl);
  }, []);

  // Update URL when any active setting changes
  useEffect(() => {
    const searchParams = new URLSearchParams();
    if (activeLocation) searchParams.set('location', activeLocation);
    searchParams.set('animalType', activeAnimalType);
    searchParams.set('displayDuration', activeDisplayDuration.toString());
    searchParams.set('rotationSize', activeRotationSize.toString());
    if (activeTwitchChannel) searchParams.set('twitchChannel', activeTwitchChannel.replace('#', '').trim());
    if (activeTwitchBotUsername) searchParams.set('twitchBotUsername', activeTwitchBotUsername.trim());
    if (activeTwitchBotToken) searchParams.set('twitchBotToken', activeTwitchBotToken.trim());
    if (activeBotIntegration !== 'none') searchParams.set('botIntegration', activeBotIntegration);
    if (activeStreamerbotUrl !== 'ws://127.0.0.1:8080/') searchParams.set('streamerbotUrl', activeStreamerbotUrl.trim());
    
    // Update URL so it can be copied if needed
    const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.history.replaceState({}, '', newUrl);
  }, [activeLocation, activeAnimalType, activeDisplayDuration, activeRotationSize, activeTwitchChannel, activeTwitchBotUsername, activeTwitchBotToken, activeBotIntegration, activeStreamerbotUrl]);

  // Fetch Animals
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setNoAnimalsFound(false);

    fetchAllAnimals(
      activeAnimalType,
      activeLocation,
      activeRotationSize
    ).then((fetchedAnimals) => {
      if (!isMounted) return;
      if (fetchedAnimals.length === 0) {
        setAnimals([]);
        setNoAnimalsFound(true);
      } else {
        setAnimals(fetchedAnimals);
        setCurrentIndex(0);
        setPictureIndex(0);
        setNoAnimalsFound(false);
      }
      setIsLoading(false);
    }).catch(e => {
      if (!isMounted) return;
      console.error(e);
      setAnimals([]);
      setNoAnimalsFound(true);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [activeLocation, activeAnimalType, activeRotationSize]);

  // Rotation Timer
  useEffect(() => {
    if (animals.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animals.length);
      setPictureIndex(0);
    }, activeDisplayDuration * 1000);
    return () => clearInterval(timer);
  }, [animals, activeDisplayDuration]);

  // Streamer.bot Connection
  useEffect(() => {
    if (activeBotIntegration === 'streamerbot' && activeStreamerbotUrl) {
      const ws = new WebSocket(activeStreamerbotUrl);
      
      ws.onopen = () => {
        console.log('Connected to Streamer.bot');
      };
      
      ws.onerror = (e) => {
        console.error('Streamer.bot WebSocket error', e);
      };

      sbWsRef.current = ws;

      return () => {
        ws.close();
        sbWsRef.current = null;
      };
    }
  }, [activeBotIntegration, activeStreamerbotUrl]);

  // Twitch Connection
  useEffect(() => {
    if (!activeTwitchChannel) {
      if (twitchClientRef.current) {
        twitchClientRef.current.disconnect();
        twitchClientRef.current = null;
      }
      return;
    }

    const channel = activeTwitchChannel.replace('#', '').trim().toLowerCase();
    
    const clientOptions: tmi.Options = {
      channels: [`#${channel}`]
    };

    if (activeBotIntegration === 'twitch' && activeTwitchBotUsername && activeTwitchBotToken) {
      clientOptions.identity = {
        username: activeTwitchBotUsername,
        password: activeTwitchBotToken
      };
    }

    const client = new tmi.Client(clientOptions);

    client.connect().catch(console.error);
    twitchClientRef.current = client;

    client.on('message', (ch, tags, message, self) => {
      if (self) return;
      const msg = message.toLowerCase().trim();
      
      if (msg.startsWith('!adopt') || msg.startsWith('!dog') || msg.startsWith('!cat')) {
        const parts = msg.split(' ');
        const cmd = parts[0];
        const numStr = parts[1];
        const num = numStr ? parseInt(numStr) : null;

        let targetAnimal: Animal | undefined;
        const currentAnimals = animalsRef.current;
        const currentIdx = currentIndexRef.current;

        if (cmd === '!adopt') {
          if (num) {
            targetAnimal = currentAnimals.find(a => a.dailyNumber === num);
          } else {
            targetAnimal = currentAnimals[currentIdx];
          }
        } else {
          const targetType = cmd === '!dog' ? 'dog' : 'cat';
          if (num) {
            targetAnimal = currentAnimals.find(a => a.type === targetType && a.dailyNumber === num);
          } else {
            targetAnimal = currentAnimals[currentIdx];
            if (targetAnimal?.type !== targetType) {
              targetAnimal = currentAnimals.find(a => a.type === targetType);
            }
          }
        }

        const sendReply = (replyMessage: string) => {
          if (activeBotIntegration === 'streamerbot' && sbWsRef.current?.readyState === WebSocket.OPEN) {
            sbWsRef.current.send(JSON.stringify({
              request: "SendMessage",
              platform: "twitch",
              message: replyMessage,
              id: `msg_${Date.now()}`
            }));
          } else if (activeBotIntegration === 'twitch') {
            client.say(ch, replyMessage).catch((e) => {
              console.warn('Could not send Twitch message (bot not authenticated)', e);
            });
          }
        };

        if (targetAnimal) {
          // Update the overlay to show the requested animal
          const newIndex = currentAnimals.findIndex(a => a.id === targetAnimal!.id);
          if (newIndex !== -1) {
            setCurrentIndex(newIndex);
            setPictureIndex(0);
          }

          const typeLabel = targetAnimal.type === 'dog' ? 'Dog' : 'Cat';
          sendReply(`Meet ${targetAnimal.name} (${typeLabel} #${targetAnimal.dailyNumber})! Adopt here: ${targetAnimal.url}`);
        } else {
          const targetType = cmd === '!dog' ? 'dog' : cmd === '!cat' ? 'cat' : 'animal';
          sendReply(`Couldn't find ${targetType} #${num || 'currently'}.`);
        }
      }
    });

    return () => {
      client.disconnect();
      twitchClientRef.current = null;
    };
  }, [activeTwitchChannel, activeTwitchBotUsername, activeTwitchBotToken, activeBotIntegration]);

  useEffect(() => {
    if (!currentAnimal || !currentAnimal.pictures || currentAnimal.pictures.length <= 1) return;
    
    // Rotate pictures every 5 seconds
    const interval = setInterval(() => {
      setPictureIndex((prev) => (prev + 1) % currentAnimal.pictures.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentAnimal]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedDuration = parseInt(displayDurationInput);
    const finalDuration = isNaN(parsedDuration) || parsedDuration < 10 ? 60 : parsedDuration;
    
    const parsedRotation = parseInt(rotationSizeInput);
    const finalRotation = isNaN(parsedRotation) || parsedRotation < 1 ? 50 : parsedRotation;

    const needsRefetch = 
      activeLocation !== locationInput.trim() ||
      activeAnimalType !== animalTypeInput ||
      activeRotationSize !== finalRotation;

    setActiveLocation(locationInput.trim());
    setActiveAnimalType(animalTypeInput);
    setActiveDisplayDuration(finalDuration);
    setActiveRotationSize(finalRotation);
    setActiveTwitchChannel(twitchChannelInput.trim());
    setActiveTwitchBotUsername(twitchBotUsernameInput.trim());
    setActiveTwitchBotToken(twitchBotTokenInput.trim());
    setActiveBotIntegration(botIntegrationInput);
    setActiveStreamerbotUrl(streamerbotUrlInput.trim());
    
    // Save to LocalStorage
    localStorage.setItem('pet_overlay_location', locationInput.trim());
    localStorage.setItem('pet_overlay_animalType', animalTypeInput);
    localStorage.setItem('pet_overlay_displayDuration', finalDuration.toString());
    localStorage.setItem('pet_overlay_rotationSize', finalRotation.toString());
    localStorage.setItem('pet_overlay_twitchChannel', twitchChannelInput.trim());
    localStorage.setItem('pet_overlay_twitchBotUsername', twitchBotUsernameInput.trim());
    localStorage.setItem('pet_overlay_twitchBotToken', twitchBotTokenInput.trim());
    localStorage.setItem('pet_overlay_botIntegration', botIntegrationInput);
    localStorage.setItem('pet_overlay_streamerbotUrl', streamerbotUrlInput.trim());
    
    // Update inputs to match validated values
    setDisplayDurationInput(finalDuration.toString());
    setRotationSizeInput(finalRotation.toString());
    
    setIsSettingsOpen(false);
    
    if (needsRefetch) {
      setAnimals([]); // Clear current animals while loading new settings
      setNoAnimalsFound(false);
      setIsLoading(true);
    }
  };

  // OBS KILL SWITCH: Securely blocks stream access if subscription/license is invalid
  if (accessState === 'verifying') {
    return <div className="w-screen h-screen bg-transparent" />; // Wait completely invisibly in OBS
  }

  if (accessState === 'locked') {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950 p-12 overflow-hidden relative">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Background" className="w-full h-full object-cover opacity-10 mix-blend-screen grayscale" />
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="relative z-10 flex flex-col items-center bg-slate-900 border border-emerald-500/30 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.2)] max-w-lg w-full text-center"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6 border border-emerald-500/20">
            <Sparkles className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-white">Widget Paused</h2>
          <p className="text-slate-400 mb-2 leading-relaxed">
            To continue using this asset, please reactivate your membership on our website!
          </p>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-6 w-full text-sm text-slate-300 font-medium">
            Once renewed, this overlay will instantly turn back on without you having to change any settings in OBS or Meld Studio.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex items-center justify-center p-12 overflow-hidden relative group">
      
      {/* Settings Button (visible only on hover) */}
      <button 
        onClick={() => setIsSettingsOpen(true)}
        className="absolute top-8 right-8 z-50 p-3 bg-black/50 hover:bg-black/80 text-white/50 hover:text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="absolute top-24 right-8 z-50 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Overlay Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Location Filter
                </label>
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  placeholder="Zip, City, or State..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Animal Type
                </label>
                <select
                  value={animalTypeInput}
                  onChange={(e) => setAnimalTypeInput(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="dogs" className="bg-slate-900 text-white">Dogs Only</option>
                  <option value="cats" className="bg-slate-900 text-white">Cats Only</option>
                  <option value="both" className="bg-slate-900 text-white">Dogs & Cats</option>
                </select>
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Duration (s)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={displayDurationInput}
                    onChange={(e) => setDisplayDurationInput(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Rotation Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={rotationSizeInput}
                    onChange={(e) => setRotationSizeInput(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Twitch Channel
                </label>
                <input
                  type="text"
                  value={twitchChannelInput}
                  onChange={(e) => setTwitchChannelInput(e.target.value)}
                  placeholder="e.g. ninja"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">Connects chatbot for !dog and !cat commands</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Bot Integration
                </label>
                <select
                  value={botIntegrationInput}
                  onChange={(e) => setBotIntegrationInput(e.target.value as any)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="none" className="bg-slate-900 text-white">None (Overlay Only)</option>
                  <option value="streamerbot" className="bg-slate-900 text-white">Streamer.bot</option>
                  <option value="twitch" className="bg-slate-900 text-white">Direct Twitch Auth</option>
                </select>
              </div>

              {botIntegrationInput === 'streamerbot' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Streamer.bot WebSocket URL
                  </label>
                  <input
                    type="text"
                    value={streamerbotUrlInput}
                    onChange={(e) => setStreamerbotUrlInput(e.target.value)}
                    placeholder="ws://127.0.0.1:8080/"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <p className="text-xs text-slate-500 mt-1">Make sure Streamer.bot WebSocket server is running.</p>
                </div>
              )}

              {botIntegrationInput === 'twitch' && (
                <>
                  <div className="flex gap-4">
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Bot Username
                      </label>
                      <input
                        type="text"
                        value={twitchBotUsernameInput}
                        onChange={(e) => setTwitchBotUsernameInput(e.target.value)}
                        placeholder="e.g. mybot"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Bot OAuth Token
                      </label>
                      <input
                        type="password"
                        value={twitchBotTokenInput}
                        onChange={(e) => setTwitchBotTokenInput(e.target.value)}
                        placeholder="oauth:..."
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Requires a Twitch OAuth token (e.g., from twitchapps.com/tmi).</p>
                </>
              )}

              <button 
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2 rounded-xl transition-colors mt-2"
              >
                Apply Settings
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preload next animal's images */}
      <div className="absolute w-0 h-0 overflow-hidden opacity-0 pointer-events-none">
        {nextAnimal?.pictures?.map((pic, i) => (
          <img key={`preload-${i}`} src={pic} alt="" />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!currentAnimal ? (
          <motion.div 
            key="loading-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center font-medium h-full w-full"
          >
            {isLoading ? (
              <div className="flex flex-col items-center bg-black/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <div className="text-xl animate-pulse text-white">
                  {activeLocation ? `Searching for animals near ${activeLocation}...` : 'Loading animals...'}
                </div>
              </div>
            ) : noAnimalsFound ? (
              <div className="flex flex-col items-center bg-black/60 p-8 rounded-3xl backdrop-blur-md border border-white/10 shadow-2xl">
                <SearchX className="w-12 h-12 mb-4 text-white/50" />
                <div className="text-xl text-white">No animals found near {activeLocation}</div>
                <div className="text-sm mt-2 text-white/50">Try a different location or animal type</div>
              </div>
            ) : null}
          </motion.div>
        ) : (
          <motion.div 
            key={currentAnimal.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-5xl flex rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.5)]"
          >
          {/* Ambient Volumetric Glow behind the card */}
          <div className="absolute -inset-1 bg-gradient-to-br from-emerald-400/40 via-white/5 to-sky-400/40 rounded-[2.5rem] blur-2xl opacity-80 -z-10" />
          <div className="absolute -inset-4 bg-black/20 rounded-[3rem] blur-xl -z-20" />

          {/* Main Card Glass */}
          <div className="relative w-full flex bg-gradient-to-br from-slate-800/80 to-zinc-900/80 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] overflow-hidden ring-1 ring-white/10 shadow-2xl">
            
            {/* Inner Light Reflection (Top Edge) */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-white/20 to-transparent opacity-50" />

            {/* Left Side: Slideshow */}
            <div className="w-1/2 relative bg-slate-900 aspect-square overflow-hidden">
              {/* Inner shadow for depth over images */}
              <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)] z-20 pointer-events-none" />
              {/* Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 pointer-events-none" />

              <AnimatePresence mode="wait">
                <motion.img
                  key={currentAnimal.pictures?.[pictureIndex] || 'fallback'}
                  src={currentAnimal.pictures?.[pictureIndex]}
                  alt={currentAnimal.name}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
              
              {/* Picture Indicators */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-30">
                {currentAnimal.pictures?.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${i === pictureIndex ? 'w-8 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : 'w-2 bg-white/30'}`}
                  />
                ))}
              </div>
            </div>

            {/* Right Side: Details */}
            <div className="w-1/2 p-12 flex flex-col justify-between text-white relative">
              {/* Subtle background glow inside the text area */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/20 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400/20 blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold tracking-wide mb-8 shadow-[0_0_20px_rgba(16,185,129,0.2)] backdrop-blur-md">
                  <Sparkles className="w-4 h-4" />
                  Looking for a home
                </div>
                
                <motion.h1 
                  key={currentAnimal.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-7xl font-extrabold tracking-tight mb-2 drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70 flex items-baseline gap-4 overflow-hidden"
                >
                  <span className="truncate">{currentAnimal.name}</span>
                  <span className="text-3xl font-medium text-white/30 shrink-0">#{currentAnimal.dailyNumber}</span>
                </motion.h1>
                
                <motion.div 
                  key={currentAnimal.breed}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-2xl text-emerald-100/80 font-medium mb-10 drop-shadow-md line-clamp-2"
                >
                  {currentAnimal.breed}
                </motion.div>

                <div className="space-y-6">
                  <div className="flex items-center gap-5 text-lg group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors">
                      <Info className="w-6 h-6 text-white/70" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Age</div>
                      <div className="font-semibold drop-shadow-md text-white/90 truncate">{currentAnimal.age}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 text-lg group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors">
                      <MapPin className="w-6 h-6 text-white/70" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Location</div>
                      <div className="font-semibold drop-shadow-md text-white/90 truncate">{currentAnimal.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 text-lg group">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-colors">
                      <Heart className="w-6 h-6 text-white/70" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs text-white/40 uppercase tracking-widest font-bold mb-1">Rescue / Shelter</div>
                      <div className="font-semibold drop-shadow-md text-white/90 truncate">{currentAnimal.shelter}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-white/10 flex items-center gap-8 relative z-10">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-emerald-400/30 rounded-3xl blur-xl group-hover:bg-emerald-400/40 transition-colors duration-500" />
                  <div className="relative bg-white p-3.5 rounded-2xl shrink-0 shadow-[0_10px_20px_rgba(0,0,0,0.3)] ring-1 ring-black/5">
                    <QRCodeSVG value={currentAnimal.url || 'https://rescuegroups.org'} size={100} level="H" className="drop-shadow-sm" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-2 drop-shadow-lg text-white/90">Scan to Adopt</div>
                  <div className="text-white/50 text-base flex items-center gap-2 font-medium">
                    Or type <span className="font-mono bg-black/40 border border-white/10 px-2.5 py-1 rounded-lg text-emerald-300 font-bold shadow-inner">!{currentAnimal.type} {currentAnimal.dailyNumber}</span> in chat
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
