import React, { useContext, useState } from 'react';
import { ForgeERC1155TokenContext } from '../context/ForgeERC1155TokenContext';
const Wallet = () => {

    const {connectWallet, currentAccount, address, chains, switchChain} = useContext(ForgeERC1155TokenContext);
    return (
    <div>
        {!address &&
            <button onClick={connectWallet}>
                Connect Wallet
            </button>
        }
        <p>{address}</p>
        <div>
            {chains.map((chain) => (
                <button key={chain.id} onClick={() => switchChain({ chainId: 11155111})}>
                    Sepolia
                </button>
            ))}
        </div>
    </div>
    );
}

export default Wallet;