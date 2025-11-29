// src/App.tsx
import { useEffect, useState } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';

import { motion, AnimatePresence } from 'framer-motion';
import { Chrome, Wallet, Moon, Sun } from 'lucide-react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
} from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';


// ---------- ENV ---------- //
const GOOGLE_CLIENT_ID = import.meta.env
  .VITE_GOOGLE_CLIENT_ID as string | undefined;

const REDIRECT_URL =
  (import.meta.env.VITE_ZKLOGIN_REDIRECT_URL as string | undefined) ??
  window.location.origin;

// ---------- JWT payload tipi ---------- //
type JwtPayload = {
  email?: string;
  sub?: string;
  name?: string;
  picture?: string;
  aud?: string | string[];
};

// ---------- Salt helper'ları ---------- //
function hashcode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0; // 32-bit'e sıkıştır
  }
  return BigInt(h >>> 0).toString();
}

function getSaltFromJwt(payload: JwtPayload): string {
  const base = payload.email ?? payload.sub ?? 'default-user';
  return hashcode(base);
}

function App() {
  return <LoginPage />;
}

function LoginPage() {
  const suiClient = useSuiClient();

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

  // zkLogin sonucu
  const [zkAddress, setZkAddress] = useState<string | null>(null);
  const [zkUserInfo, setZkUserInfo] = useState<{
    email?: string;
    name?: string;
    picture?: string;
  } | null>(null);
  const [zkStatus, setZkStatus] = useState<string | null>(null);

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

  const isDark = theme === 'dark';

  // 🔁 Google'dan dönüşte URL'deki id_token'ı yakala
  useEffect(() => {
    const url = new URL(window.location.href);
    const idToken = url.searchParams.get('id_token');

    if (!idToken) return;

    // URL'i temizle (id_token vs. görünsün istemiyoruz)
    url.searchParams.delete('id_token');
    url.searchParams.delete('authuser');
    url.searchParams.delete('prompt');
    window.history.replaceState({}, '', url.toString());

    // JWT decode
    let decoded: JwtPayload;
    try {
      decoded = jwtDecode<JwtPayload>(idToken);
    } catch (e) {
      console.error('JWT decode hatası:', e);
      setZkStatus('JWT çözümlenemedi.');
      return;
    }

    // Salt + zkLogin adres hesapla
    const salt = getSaltFromJwt(decoded);
    const address = jwtToAddress(idToken, salt);

    setZkAddress(address);
    setZkUserInfo({
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    });
    setZkStatus('zkLogin oturumu aktif. Bu adresle Sui üzerinde işlem yapabilirsin.');
  }, []);

  // 🔐 zkLogin butonu – Google'a yönlendirme + ephemeral kayıt
  const handleZkLoginClick = async () => {
    if (!GOOGLE_CLIENT_ID) {
      alert(
        'VITE_GOOGLE_CLIENT_ID tanımlı değil. Lütfen .env dosyasını kontrol et.',
      );
      return;
    }

    try {
      setZkLoading(true);

      // 1) Sui sistem durumunu al (epoch bilgisi)
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 2; // Ephemeral key 2 epoch boyunca geçerli olsun

      // 2) Ephemeral key pair üret
      const ephemeralKeyPair = new Ed25519Keypair();

      // 3) Randomness & nonce üret
      const randomness = generateRandomness(); // BigInt
      const nonce = generateNonce(
        ephemeralKeyPair.getPublicKey(),
        maxEpoch,
        randomness,
      );

      // 4) Sonradan kullanmak için gerekli verileri sessionStorage'a yaz
      sessionStorage.setItem(
        'zklogin_ephemeral_data',
        JSON.stringify({
          maxEpoch,
          randomness: randomness.toString(), // BigInt -> string
          ephemeralSecretKey: ephemeralKeyPair.getSecretKey(), // bech32 secret key (suiprivkey...)
        }),
      );

      // 5) Google OAuth URL'ini hazırla
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URL,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      // 6) Kullanıcıyı Google'a yönlendir
      window.location.href = authUrl;
    } catch (err) {
      console.error('zkLogin başlatılırken hata:', err);
      alert('zkLogin başlatılırken bir hata oluştu. Konsolu kontrol et.');
      setZkLoading(false);
    }
  };

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

            {/* zkLogin session info */}
            {zkAddress && (
              <div className="mt-4 space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
                <p className="text-xs font-medium text-emerald-300">
                  zkLogin session
                </p>
                {zkUserInfo && (
                  <div className="flex items-center gap-3">
                    {zkUserInfo.picture && (
                      <img
                        src={zkUserInfo.picture}
                        className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                        alt={zkUserInfo.name ?? zkUserInfo.email ?? 'User'}
                      />
                    )}
                    <div className="text-xs">
                      <p className="text-slate-100">
                        {zkUserInfo.name ?? 'Signed in user'}
                      </p>
                      {zkUserInfo.email && (
                        <p className="text-slate-400">{zkUserInfo.email}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="text-[11px] mt-2">
                  <p className="text-slate-400 mb-1">Sui zkLogin address</p>
                  <p className="font-mono break-all text-emerald-300">
                    {zkAddress}
                  </p>
                </div>
                {zkStatus && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {zkStatus}
                  </p>
                )}
              </div>
            )}

            {/* Connected address + objects (normal wallet) */}
            <div className="pt-4 border-t border-slate-800/60 space-y-3">
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
      <p className="text-xs text-slate-500">No wallet connected yet.</p>
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
