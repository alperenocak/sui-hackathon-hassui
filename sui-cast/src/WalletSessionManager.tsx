import { useEffect } from "react";
import { useCurrentAccount, useConnectWallet, useWallets } from "@mysten/dapp-kit";

export default function WalletSessionManager() {
  const account = useCurrentAccount();
  const { mutate: connect } = useConnectWallet();
  const wallets = useWallets();

  // Wallet bağlanınca provider adını kaydet
  useEffect(() => {
    if (account?.address) {
      // Bu adresi yöneten provider'ı bul
      const activeProvider = wallets.find(w =>
        w.accounts.some(a => a.address === account.address)
      );

      if (activeProvider) {
        localStorage.setItem("connectedWallet", account.address);
        localStorage.setItem("connectedWalletProvider", activeProvider.name);
      }
    }
  }, [account, wallets]);

  // Refresh sonrası auto-reconnect
  useEffect(() => {
    const savedAddress = localStorage.getItem("connectedWallet");
    const savedProviderName = localStorage.getItem("connectedWalletProvider");

    if (!savedAddress || !savedProviderName || account) return;

    // Provider nesnesini wallets listesinden bul
    const provider = wallets.find(w => w.name === savedProviderName);

    if (provider) {
      connect({
        wallet: provider,   // <-- doğru olan bu!
      });
    }
  }, [account, wallets]);

  return null;
}
