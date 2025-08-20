import { createContext, useContext, useState, useEffect } from "react";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null); // { address, privateKey, mnemonic }
  const [balance, setBalance] = useState(null);
  const [nonce, setNonce] = useState(0);

  // Load wallet from localStorage on app start
  useEffect(() => {
    const savedWallet = localStorage.getItem("wallet");
    if (savedWallet) setWallet(JSON.parse(savedWallet));
  }, []);

  // Save wallet whenever it changes
  useEffect(() => {
    if (wallet) localStorage.setItem("wallet", JSON.stringify(wallet));
  }, [wallet]);

  const createWallet = () => {
    // TODO: generate random mnemonic/privateKey
    const newWallet = { address: "0x123...", privateKey: "abc..." };
    setWallet(newWallet);
  };

  const importWallet = (privateKey) => {
    // TODO: derive address from privateKey
    const importedWallet = { address: "0x456...", privateKey };
    setWallet(importedWallet);
  };

  return (
    <WalletContext.Provider
      value={{
        wallet,
        balance,
        nonce,
        createWallet,
        importWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);