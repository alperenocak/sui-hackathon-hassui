// src/App.tsx
import { useEffect, useState } from 'react';
import {
  ConnectButton,
  useCurrentAccount,
  useSuiClient,
  useSuiClientQuery,
} from '@mysten/dapp-kit';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
} from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';
import { motion } from 'framer-motion';
import { Chrome, Wallet } from 'lucide-react';

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

  // Tailwind + dApp Kit için ortak 'dark' class'ı
  useEffect(() => {
    const root = document.documentElement; // <html>
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
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
      className={`min-h-screen w-full font-sans transition-colors ${
        isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Tema switcher - sağ üst */}
      <div className="flex justify-end p-4">
        <div className="flex items-center gap-2 text-[11px]">
          <button
            className={`px-2 py-1 rounded-md border text-xs ${
              !isDark
                ? 'border-slate-300 bg-slate-100 text-slate-900'
                : 'border-slate-600 bg-transparent text-slate-400'
            }`}
            onClick={() => setTheme('light')}
          >
            Light
          </button>
          <button
            className={`px-2 py-1 rounded-md border text-xs ${
              isDark
                ? 'border-slate-300 bg-slate-900 text-slate-100'
                : 'border-slate-400 bg-transparent text-slate-500'
            }`}
            onClick={() => setTheme('dark')}
          >
            Dark
          </button>
        </div>
      </div>

      <div className="flex">
        {/* LEFT: logo + short description */}
        <div
          className={
            `hidden lg:flex w-1/2 flex-col justify-between p-10 relative ` +
            (isDark
              ? 'bg-gradient-to-br from-indigo-950 via-slate-950 to-black'
              : 'bg-gradient-to-br from-slate-100 via-white to-slate-200')
          }
        >
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_top,_#4f46e5_0,_transparent_55%)]" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold">
                42
              </div>
              <span className="text-lg font-semibold tracking-wide">
                Pedagogy dApp
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="text-4xl font-bold">
                <span>Simple and secure sign-in</span> <br />
                <span className="text-indigo-400">on Sui.</span>
              </h1>
              <p className="text-sm text-slate-300 max-w-md">
                Choose: a normal wallet or zkLogin (Google). Everything in one
                clean screen.
              </p>
            </div>
          </div>

          <div className="relative z-10 text-xs text-slate-400">
            Built on Sui • Tailwind + dApp Kit Dynamic Theme
          </div>
        </div>

        {/* RIGHT: login card + connected account */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 border ${
              isDark
                ? 'bg-slate-900/80 border-slate-800'
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Title */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-semibold">Sign in</h2>
              <p className="text-xs text-slate-400">
                Choose a sign-in method below.
              </p>
            </div>

            {/* Buttons */}
            <div className="space-y-4">
              {/* zkLogin (Google) */}
              <button
                onClick={handleZkLoginClick}
                disabled={zkLoading}
                className="w-full inline-flex items-center justify-center gap-3 rounded-xl bg-white text-slate-900 py-3 px-4 text-sm font-medium hover:bg-slate-100 transition disabled:opacity-70"
              >
                {zkLoading ? (
                  <span className="h-4 w-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Chrome className="w-5 h-5 text-indigo-600" />
                )}
                <span>Continue with Google (zkLogin)</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <div className="flex-1 h-px bg-slate-700/60" />
                <span>or</span>
                <div className="flex-1 h-px bg-slate-700/60" />
              </div>

              {/* Normal wallet */}
              <div
                className={`w-full flex flex-col gap-2 rounded-xl p-3 border ${
                  isDark
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    Wallet connect
                  </span>
                  <span className="uppercase tracking-wide text-[10px] text-slate-500">
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
    <div className="space-y-3 text-xs">
      <div>
        <p className="text-slate-400 mb-1">Connected address</p>
        <div
          className={
            `font-mono break-all rounded-md px-2 py-1 text-[11px] ` +
            (isDark
              ? 'bg-slate-950 text-slate-100'
              : 'bg-slate-100 text-slate-900 border border-slate-200')
          }
        >
          {account.address}
        </div>
      </div>

      <OwnedObjects address={account.address} isDark={isDark} />
    </div>
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
      <p className="text-slate-500 text-[11px]">Loading objects…</p>
    );
  }

  if (error) {
    return (
      <p className="text-[11px] text-red-400">
        Error: {(error as Error).message}
      </p>
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
      <p className="text-slate-400 text-[11px]">
        Owned objects ({objects.length})
      </p>
      <ul className="max-h-24 overflow-auto space-y-1">
        {objects.map((obj: any) => (
          <li
            key={obj.data?.objectId ?? obj.objectId}
            className={
              `font-mono text-[11px] break-all rounded px-2 py-1 ` +
              (isDark
                ? 'bg-slate-950 text-slate-100'
                : 'bg-slate-100 text-slate-900 border border-slate-200')
            }
          >
            {obj.data?.objectId ?? obj.objectId}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
