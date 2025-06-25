import React, { useContext, useState } from 'react';
import { ForgeERC1155TokenContext } from '../context/ForgeERC1155TokenContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
const Wallet = () => {

    const {isConnected, address, chain, chains, chainId, switchChain, openAccountModal, openChainModal} = useContext(ForgeERC1155TokenContext);
    const shortenAddress = (addr) => addr.slice(0, 6) + '...' + addr.slice(-4);
    const isOnSepolia = chain?.id === 11155111;
    return (
    <div className="flex flex-row w-full justify-between items-center">
        <div className="w-full relative py-4 px-6">
        {!isConnected && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <ConnectButton />
            </div>
        )}
        {isConnected && (
            <div className="absolute top-4 left-4 text-sm font-mono text-gray-700">
                <div className="flex items-center gap-2 px-3 py-1 rounded-xl border
                 border-gray-300 bg-white hover:bg-gray-100 shadow-sm text-sm font-medium
                 text-gray-800 transition">
                    {shortenAddress(address)}
                </div>
            </div>
        )}
        {isConnected && (
            <div className="absolute top-4 right-4">
                <button
                    onClick={openChainModal}
                    className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-sm font-medium shadow-sm transition
                    ${isOnSepolia
                        ? 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200'
                        : 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'}`}
                >
                    {isOnSepolia ? 'Sepolia' : 'Wrong Network: Click Here'}
                </button>
            </div>
        )}
        </div>
    </div>
    );
}

export default Wallet;