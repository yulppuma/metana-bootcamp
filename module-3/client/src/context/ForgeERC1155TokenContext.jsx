import React, { useEffect, useState} from 'react';
import { ethers } from 'ethers';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal, useAccountModal, useChainModal} from '@rainbow-me/rainbowkit';

export const ForgeERC1155TokenContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = async () => {
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const ForgeERC1155TokenContract = new ethers.Contract(contractAddress, contractABI, signer);
    return ForgeERC1155TokenContract;
}

export const ForgeERC1155TokenProvider = ({ children }) => {
    const [currentAccount, setCurrentAccount] = useState('');
    const chainId = useChainId();
    const { chains, switchChain } = useSwitchChain();
    const { openConnectModal } = useConnectModal();
    const { address, isConnected, chain } = useAccount();

    const connectWallet = async () => {
        try{
            if (!ethereum) return alert ("Please install metamask, or a respective usable wallet");
            if (!address){
                openConnectModal();
            }

        } catch (error){
            console.log(error);
        }
    }

    const checkNetwork = async () => {
        if (isConnected && chain?.id !== 11155111 && switchChain) {
            await switchChain(11155111);
        }
        console.log(chain);
    }

    useEffect(() => {
        checkNetwork();
    }, []);
    return (
        <ForgeERC1155TokenContext.Provider value = {{connectWallet, currentAccount, address, chains, switchChain}}>
            {children}
        </ForgeERC1155TokenContext.Provider>
    );
}