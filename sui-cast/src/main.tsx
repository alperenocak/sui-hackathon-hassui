// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

import '@mysten/dapp-kit/dist/index.css';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

import {
  createNetworkConfig,
  SuiClientProvider,
  WalletProvider,
  lightTheme,
} from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { darkTheme } from './theme';

const { networkConfig } = createNetworkConfig({
  devnet: { url: getFullnodeUrl('devnet') },
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

const queryClient = new QueryClient();

// Kullanıcı manuel logout yapmadıysa autoConnect aktif olsun
const shouldAutoConnect = localStorage.getItem('wallet_logged_out') !== 'true';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider
          autoConnect={shouldAutoConnect}
          theme={[
            // Varsayılan: light (html/body'de 'dark' class yoksa)
            { variables: lightTheme },
            // Eğer html/body '.dark' class'ına sahipse: darkTheme
            {
              selector: '.dark',
              variables: darkTheme,
            },
          ]}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
