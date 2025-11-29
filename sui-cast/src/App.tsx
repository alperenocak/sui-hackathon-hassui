// src/App.tsx
import { useEffect, useState } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
} from '@mysten/dapp-kit';
import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, Wallet, Moon, Sun } from 'lucide-react';

function App() {
  return <LoginPage />;
}

function LoginPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) return savedTheme;

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [zkLoading, setZkLoading] = useState(false);

  // Apply dark class and save to localStorage
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleZkLoginClick = () => {
    setZkLoading(true);
    setTimeout(() => {
      console.log('zkLogin button clicked – plug your real flow here.');
      setZkLoading(false);
      alert('zkLogin integration is not wired yet. This is a placeholder for your real flow.');
    }, 1200);
  };

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen w-full font-sans transition-colors duration-300 flex flex-col relative overflow-hidden ${
        isDark ? 'text-slate-50' : 'bg-[#F5F1DC] text-slate-900'
      }`}
      style={isDark ? { backgroundColor: '#211832' } : undefined}
    >
      {/* Animated gradient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute top-0 -left-20 w-96 h-96 rounded-full blur-3xl ${
            isDark 
              ? 'opacity-25'
              : 'opacity-40'
          }`}
          style={isDark ? {
            background: 'radial-gradient(circle, #5C3E94, #F25912)'
          } : {
            background: 'radial-gradient(circle, #0046FF, #73C8D2)'
          }}
        />
        <motion.div
          animate={{
            x: [0, -100, 0],
            y: [0, 100, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute bottom-0 -right-20 w-96 h-96 rounded-full blur-3xl ${
            isDark
              ? 'opacity-20'
              : 'opacity-35'
          }`}
          style={isDark ? {
            background: 'radial-gradient(circle, #412B6B, #F25912)'
          } : {
            background: 'radial-gradient(circle, #FF9013, #73C8D2)'
          }}
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, 50, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${
            isDark
              ? 'opacity-15'
              : 'opacity-30'
          }`}
          style={isDark ? {
            background: 'radial-gradient(circle, #5C3E94, #412B6B)'
          } : {
            background: 'radial-gradient(circle, #0046FF, #FF9013)'
          }}
        />
      </div>

      {/* Toggle theme switcher */}
      <div className="flex justify-end p-4 relative z-10">
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className={`relative w-16 h-8 rounded-full p-1 transition-colors duration-300 backdrop-blur-sm border ${
            isDark 
              ? 'border-[#5C3E94]/40' 
              : 'border-[#73C8D2]/40'
          }`}
          style={isDark 
            ? { backgroundColor: '#412B6B' } 
            : { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
          }
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {/* Toggle circle with icon */}
          <motion.div
            layout
            transition={{
              type: "spring",
              stiffness: 700,
              damping: 30
            }}
            className={`absolute top-1 w-6 h-6 rounded-full shadow-md flex items-center justify-center ${
              isDark ? 'left-9' : 'left-1'
            }`}
            style={isDark 
              ? { backgroundColor: '#5C3E94' } 
              : { background: 'linear-gradient(135deg, #0046FF 0%, #73C8D2 100%)' }
            }
          >
            <AnimatePresence mode="wait">
              {isDark ? (
                <motion.div
                  key="moon"
                  initial={{ rotate: -180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 180, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Moon className="w-3.5 h-3.5 text-white" />
                </motion.div>
              ) : (
                <motion.div
                  key="sun"
                  initial={{ rotate: 180, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -180, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Sun className="w-3.5 h-3.5 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Background icons */}
          <div className="flex items-center justify-between h-full px-1.5">
            <Sun className={`w-3 h-3 transition-opacity ${isDark ? 'opacity-30' : 'opacity-50'}`} style={isDark ? { color: '#F25912' } : { color: '#0046FF' }} />
            <Moon className={`w-3 h-3 transition-opacity ${isDark ? 'opacity-50' : 'opacity-30'}`} style={isDark ? { color: '#F25912' } : { color: '#0046FF' }} />
          </div>
        </motion.button>
      </div>

      {/* Centered content with header */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Header text */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <h1 
              className={`text-4xl font-bold tracking-tight ${
                !isDark ? 'text-[#0046FF]' : ''
              }`}
              style={isDark ? {
                background: 'linear-gradient(135deg, #F25912 0%, #5C3E94 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              } : undefined}
            >
              42 Pedagogy dApp
            </h1>
            <p className={`text-lg ${isDark ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
              Simple and secure sign-in on Sui.
            </p>
          </motion.div>

          {/* Login card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={`w-full rounded-2xl p-6 shadow-2xl space-y-5 border backdrop-blur-sm ${
              !isDark
                ? 'bg-white/90 border-[#73C8D2]/30 shadow-xl'
                : 'border-[#5C3E94]/30'
            }`}
            style={isDark ? {
              backgroundColor: '#412B6Bcc',
              boxShadow: '0 20px 25px -5px rgba(92, 62, 148, 0.3), 0 10px 10px -5px rgba(242, 89, 18, 0.1)'
            } : {
              boxShadow: '0 20px 25px -5px rgba(0, 70, 255, 0.1), 0 10px 10px -5px rgba(115, 200, 210, 0.08)'
            }}
          >
            {/* Title */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Choose a sign-in method below.
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              {/* zkLogin (Google) */}
              <button
                onClick={handleZkLoginClick}
                disabled={zkLoading}
                className={`w-full inline-flex items-center justify-center gap-3 rounded-xl py-3 px-4 text-sm font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed ${
                  isDark
                    ? 'text-white hover:opacity-90 active:scale-95 shadow-lg'
                    : 'text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg'
                }`}
                style={isDark ? {
                  background: 'linear-gradient(135deg, #F25912 0%, #5C3E94 100%)',
                  boxShadow: '0 10px 15px -3px rgba(242, 89, 18, 0.4)'
                } : {
                  background: 'linear-gradient(135deg, #0046FF 0%, #73C8D2 100%)',
                  boxShadow: '0 10px 15px -3px rgba(0, 70, 255, 0.3)'
                }}
              >
                <AnimatePresence mode="wait">
                  {zkLoading ? (
                    <motion.span
                      key="spinner"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="h-4 w-4 border-2 border-t-transparent rounded-full animate-spin border-white"
                    />
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Chrome className="w-5 h-5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <span>Continue with Google (zkLogin)</span>
              </button>

              {/* Divider */}
              <div className={`flex items-center gap-3 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <div 
                  className="flex-1 h-px"
                  style={isDark ? { backgroundColor: '#5C3E9460' } : { backgroundColor: 'rgba(115, 200, 210, 0.4)' }}
                />
                <span>or</span>
                <div 
                  className="flex-1 h-px"
                  style={isDark ? { backgroundColor: '#5C3E9460' } : { backgroundColor: 'rgba(115, 200, 210, 0.4)' }}
                />
              </div>

              {/* Normal wallet */}
              <div
                className={`w-full flex flex-col gap-2 rounded-xl p-3 border transition-colors ${
                  !isDark
                    ? 'bg-[#73C8D2]/10 border-[#73C8D2]/30'
                    : 'border-[#5C3E94]/40'
                }`}
                style={isDark ? { backgroundColor: '#211832' } : undefined}
              >
                <div className={`flex items-center justify-between text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Wallet connect
                  </span>
                  <span className={`uppercase tracking-wide text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    dApp Kit
                  </span>
                </div>
                <ConnectButton />
              </div>
            </div>

            {/* Connected address + objects */}
            <div 
              className="pt-4 border-t space-y-3"
              style={isDark ? { borderColor: '#5C3E9440' } : { borderColor: 'rgba(115, 200, 210, 0.2)' }}
            >
              <ConnectedAccountSection isDark={isDark} />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ConnectedAccountSection({ isDark }: { isDark: boolean }) {
  const account = useCurrentAccount();

  if (!account) {
    return (
      <p className="text-xs text-slate-500">
        No wallet connected yet.
      </p>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 text-xs"
    >
      <div>
        <p className={isDark ? 'text-slate-300 mb-1' : 'text-slate-400 mb-1'}>Connected address</p>
        <div
          className={`font-mono break-all rounded-md px-2 py-1 text-[11px] ${
            !isDark
              ? 'bg-slate-100 text-slate-900 border border-slate-200'
              : 'text-slate-100'
          }`}
          style={isDark ? { backgroundColor: '#211832' } : undefined}
        >
          {account.address}
        </div>
      </div>

      <OwnedObjects address={account.address} isDark={isDark} />
    </motion.div>
  );
}

type OwnedObjectsProps = {
  address: string;
  isDark: boolean;
};

function OwnedObjects({ address, isDark }: OwnedObjectsProps) {
  const { data, isPending, error } = useSuiClientQuery('getOwnedObjects', {
    owner: address,
  });

  if (isPending) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 text-slate-500 text-[11px]"
      >
        <span 
          className="h-3 w-3 border-2 border-t-transparent rounded-full animate-spin"
          style={isDark ? { borderColor: '#F25912' } : { borderColor: 'rgb(100 116 139)' }}
        />
        Loading objects…
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-[11px] text-red-400"
      >
        Error: {(error as Error).message}
      </motion.p>
    );
  }

  const objects = data?.data ?? [];

  if (!objects.length) {
    return (
      <p className="text-[11px] text-slate-500">
        No objects found for this address.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-400'}`}>
        Owned objects ({objects.length})
      </p>
      <ul className="max-h-24 overflow-auto space-y-1 scrollbar-thin">
        {objects.map((obj: any, index: number) => (
          <motion.li
            key={obj.data?.objectId ?? obj.objectId ?? index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`font-mono text-[11px] break-all rounded px-2 py-1 ${
              !isDark
                ? 'bg-slate-100 text-slate-900 border border-slate-200'
                : 'text-slate-100'
            }`}
            style={isDark ? { backgroundColor: '#211832' } : undefined}
          >
            {obj.data?.objectId ?? obj.objectId}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default App;
