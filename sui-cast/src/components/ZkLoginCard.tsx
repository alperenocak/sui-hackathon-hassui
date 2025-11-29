/* src/components/ZkLoginCard.tsx */
import React, { useEffect, useState } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import {
  generateNonce,
  generateRandomness,
  jwtToAddress,
  getExtendedEphemeralPublicKey,
  type ZkLoginSignatureInputs,
} from '@mysten/sui/zklogin';
import { jwtDecode } from 'jwt-decode';

// -------------------- ENV & SABİTLER -------------------- //
const FULLNODE_URL =
  import.meta.env.VITE_SUI_RPC_URL ?? getFullnodeUrl('testnet');

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URL =
  import.meta.env.VITE_ZKLOGIN_REDIRECT_URL ?? window.location.origin;
const PROVER_URL =
  import.meta.env.VITE_ZK_PROVER_URL ?? 'https://prover-dev.mystenlabs.com/v1';

const client = new SuiClient({ url: FULLNODE_URL });

// SessionStorage key'leri
const SESSION_JWT_KEY = 'sui_jwt_token';
const SESSION_ZKLOGIN_DATA_KEY = 'zklogin_ephemeral_data';

// JWT payload tipini basit tutuyoruz
type JwtPayload = {
  email?: string;
  sub?: string;
  aud?: string | string[];
};

// login sırasında saklayacağımız veriler
type StoredZkLoginData = {
  maxEpoch: number;
  randomness: string; // BigInt string
  ephemeralSecretKey: string; // Bech32 secret key (suiprivkey...)
};

// Prover'dan dönen partial signature tipi
type PartialZkLoginSignatureInputs = Omit<
  ZkLoginSignatureInputs,
  'addressSeed'
>;

// -------------------- KÜÇÜK YARDIMCI FONKSİYONLAR -------------------- //

// Basit bir string -> number hash (tutorial'deki gibi)
function hashcode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return BigInt(h >>> 0).toString();
}

// JWT içinden salt üret (demo için e-mail / sub kullanıyoruz)
function getSaltFromJwt(payload: JwtPayload): string {
  const base = payload.email ?? payload.sub ?? 'default-user';
  return hashcode(base);
}

// Google OAuth'a yönlendiren fonksiyon
async function startGoogleLogin() {
  if (!GOOGLE_CLIENT_ID) {
    alert('VITE_GOOGLE_CLIENT_ID tanımlı değil!');
    return;
  }

  const { epoch } = await client.getLatestSuiSystemState();
  const maxEpoch = Number(epoch) + 2;

  const ephemeralKeyPair = Ed25519Keypair.generate();
  const randomness = generateRandomness();
  const randomnessStr = randomness.toString();

  const nonce = generateNonce(
    ephemeralKeyPair.getPublicKey(),
    maxEpoch,
    randomness,
  );

  const data: StoredZkLoginData = {
    maxEpoch,
    randomness: randomnessStr,
    ephemeralSecretKey: ephemeralKeyPair.getSecretKey(),
  };
  sessionStorage.setItem(SESSION_ZKLOGIN_DATA_KEY, JSON.stringify(data));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URL,
    response_type: 'id_token',
    scope: 'openid email profile',
    nonce,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  window.location.href = authUrl;
}

// ZK prover'a istek atan fonksiyon
async function requestZkProof(opts: {
  jwt: string;
  salt: string;
  maxEpoch: number;
  randomness: string;
  ephemeralSecretKey: string;
}): Promise<PartialZkLoginSignatureInputs> {
  const keypair = Ed25519Keypair.fromSecretKey(opts.ephemeralSecretKey);

  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
    keypair.getPublicKey(),
  );

  const body = {
    jwt: opts.jwt,
    extendedEphemeralPublicKey: extendedEphemeralPublicKey.toString(),
    maxEpoch: opts.maxEpoch.toString(),
    jwtRandomness: opts.randomness,
    salt: opts.salt,
    keyClaimName: 'sub',
  };

  const res = await fetch(PROVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Prover error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as PartialZkLoginSignatureInputs;
  return data;
}

// -------------------- KOMPONENT -------------------- //

const ZkLoginCard: React.FC = () => {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debug: Tüm URL bilgisini logla


    // Google OAuth id_token'ı URL fragment (#) içinde döndürür, query string (?) içinde değil
    // Örnek: https://site.com/#id_token=xxx&authuser=0
    const hash = window.location.hash.substring(1); // # işaretini kaldır
    
    const hashParams = new URLSearchParams(hash);
    const idToken = hashParams.get('id_token');

    // Session storage'da ephemeral data var mı kontrol et
    const existingZkData = sessionStorage.getItem(SESSION_ZKLOGIN_DATA_KEY);

    if (!idToken) {
      // Belki query string'de gelmiştir (bazı konfigürasyonlarda)
      const url = new URL(window.location.href);
      const queryToken = url.searchParams.get('id_token');
      
      if (!queryToken) {
        return;
      }
      // Query string'den geldiyse onu kullan
      processToken(queryToken);
      return;
    }

    // Hash'i temizle
    window.history.replaceState({}, '', window.location.pathname + window.location.search);

    processToken(idToken);
  }, []);

  const processToken = (idToken: string) => {
    
    sessionStorage.setItem(SESSION_JWT_KEY, idToken);

    let decoded: JwtPayload;
    try {
      decoded = jwtDecode<JwtPayload>(idToken);
    } catch (e) {
      console.error('JWT decode hatası:', e);
      setStatus('JWT çözümlenemedi.');
      return;
    }

    const stored = sessionStorage.getItem(SESSION_ZKLOGIN_DATA_KEY);
    if (!stored) {
      setStatus('Ephemeral anahtar bulunamadı. Lütfen tekrar giriş yap.');
      return;
    }

    const zkData: StoredZkLoginData = JSON.parse(stored);

    const salt = getSaltFromJwt(decoded);
    const zkAddress = jwtToAddress(idToken, salt);
    setAddress(zkAddress);

    setLoading(true);
    setStatus('ZK proof üretiliyor (prover çağrılıyor)...');

    requestZkProof({
      jwt: idToken,
      salt,
      maxEpoch: zkData.maxEpoch,
      randomness: zkData.randomness,
      ephemeralSecretKey: zkData.ephemeralSecretKey,
    })
      .then((proof) => {
        setStatus(
          'zkLogin hazır! Bu oturumda bu adresle işlem imzalayabilirsin (proof + ephemeral key elinde).',
        );
      })
      .catch((err) => {
        console.error('Prover isteği hata verdi:', err);
        setStatus(
          `Prover isteğinde hata oluştu: ${(err as Error).message}. Yine de adresin üretildi.`,
        );
      })
      .finally(() => setLoading(false));
  };

  const handleLoginClick = async () => {
    try {
      setStatus('');
      setLoading(true);
      await startGoogleLogin();
    } catch (e) {
      console.error(e);
      setStatus('Google login başlatılırken hata oluştu.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50">
      <div className="w-full max-w-md">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-xl p-8 backdrop-blur">
          <h1 className="text-2xl font-semibold text-center mb-2">
            42 zkLogin Portal
          </h1>
          <p className="text-sm text-slate-400 text-center mb-6">
            Öğrenci ürettiği içeriğin sahibi olsun. Google hesabınla giriş yap,
            senin için Sui üstünde zkLogin cüzdanı oluşturulsun.
          </p>

          <button
            onClick={handleLoginClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 transition-colors py-3 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold text-slate-900">
              G
            </span>
            <span>Google ile Devam Et</span>
          </button>

          {loading && (
            <p className="mt-4 text-xs text-sky-300">
              İşlem devam ediyor... (redirect veya prover çağrısı olabilir)
            </p>
          )}

          {status && (
            <p className="mt-4 text-xs text-slate-300 whitespace-pre-line">
              {status}
            </p>
          )}

          {address && (
            <div className="mt-6 border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-400 mb-1">
                Sui zkLogin adresin:
              </p>
              <p className="font-mono text-xs break-all text-sky-300">
                {address}
              </p>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          Bu sadece demo akışı. Production için kendi prover servisini ve salt
          yönetimini kurman gerekiyor.
        </p>
      </div>
    </div>
  );
};

export default ZkLoginCard;
