import React, { useContext, useState } from 'react';
import { ForgeERC1155TokenContext } from '../context/ForgeERC1155TokenContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
const Wallet = () => {

    const {isConnected, address, chain, chains, chainId, switchChain, openAccountModal, openChainModal} = useContext(ForgeERC1155TokenContext);
    const shortenAddress = (addr) => addr.slice(0, 6) + '...' + addr.slice(-4);
    const isOnSepolia = chain?.id === 11155111;
    return (
    <div className="flex flex-row w-full justify-between items-center bg-zinc-900 p-6 border-b border-zinc-700 relative">
        {!isConnected && (
        <div className="absolute left-1/2 top-4 transform -translate-x-1/2">
            <ConnectButton />
        </div>
        )}
        {isConnected && (
        <div>
            <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 px-4 py-1 rounded-xl border border-zinc-700 bg-zinc-800 shadow-sm text-sm font-mono text-white" onClick={openAccountModal}>
                {shortenAddress(address)}
            </div>
            </div>
            <div className="absolute top-4 right-4">
            <button
                onClick={openChainModal}
                className={`flex items-center gap-2 px-4 py-1 rounded-xl border text-sm font-medium shadow-sm transition
                ${
                    isOnSepolia
                    ? 'bg-green-700 border-green-500 text-white hover:bg-green-600'
                    : 'bg-red-700 border-red-500 text-white hover:bg-red-600'
                }`}
            >
                {isOnSepolia ? 'Sepolia' : 'Wrong Network'}
            </button>
            </div>
        </div>
        )}
    </div>
    );
}

export default Wallet;