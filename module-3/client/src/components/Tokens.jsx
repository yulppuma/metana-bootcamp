import React, { useContext, useState } from 'react';
import { ForgeERC1155TokenContext } from '../context/ForgeERC1155TokenContext';
const Tokens = () => {
    const {connectWallet, getBalance, balanceOf6, isConnected, address, chain, chains, chainId, switchChain, openAccountModal, openChainModal} = useContext(ForgeERC1155TokenContext);
    return (
    <div>
        {balanceOf6}
    </div>
    );
}

export default Tokens;