import { useEffect } from "react";
import { useCurrentAccount, useWallets } from "@mysten/dapp-kit";

export default function WalletSessionManager() {
  const account = useCurrentAccount();
  const wallets = useWallets();

  // Wallet bağlanınca provider adını kaydet (sadece kayıt için)
  useEffect(() => {
    if (account?.address) {
      const activeProvider = wallets.find(w =>
        w.accounts.some(a => a.address === account.address)
      );

      if (activeProvider) {
        localStorage.setItem("connectedWallet", account.address);
        localStorage.setItem("connectedWalletProvider", activeProvider.name);
      }
    }
  }, [account, wallets]);

  return null;
}
