import React, { useEffect, useState} from 'react';
import { ethers } from 'ethers';
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { useConnectModal, useAccountModal, useChainModal} from '@rainbow-me/rainbowkit';
import { forgeContractABI, tokenContractABI, forgeContractAddress, tokenContractAddress } from '../utils/constants';

export const ForgeERC1155TokenContext = React.createContext();

const { ethereum } = window;

const getEthereumContract = async () => {
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();

    const ERC1155TokenContract = new ethers.Contract(tokenContractAddress, tokenContractABI, signer);
    const ForgeERC1155TokenContract = new ethers.Contract(forgeContractAddress, forgeContractABI, signer);
    return {ERC1155TokenContract, ForgeERC1155TokenContract};
}

export const ForgeERC1155TokenProvider = ({ children }) => {
    const [balanceOf6, setBalanceOf6] = useState(0);
    const chainId = useChainId();
    const { chains, switchChain } = useSwitchChain();
    const { openConnectModal } = useConnectModal();
    const { openAccountModal } = useAccountModal();
    const { openChainModal } = useChainModal();
    const { address, isConnected, chain } = useAccount();

    const mintToken = async () => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ForgeERC1155TokenContract} = await getEthereumContract();
            
        }
        catch (error){
            console.log(error);
        }
    }

    const getBalance = async (id) => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ERC1155TokenContract} = await getEthereumContract();
            const balanceOf6 = await ERC1155TokenContract.balanceOf(address, id);
            setBalanceOf6(balanceOf6);
        }
        catch (error){
            console.log(error);
        }
    }

    useEffect(() => {
        getBalance(6);
    }, []);
    return (
        <ForgeERC1155TokenContext.Provider value = {{address, isConnected, chains, chain, switchChain, chainId, openAccountModal, openChainModal, getBalance, balanceOf6}}>
            {children}
        </ForgeERC1155TokenContext.Provider>
    );
}