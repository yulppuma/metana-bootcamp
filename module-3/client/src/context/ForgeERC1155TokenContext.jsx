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
    const [balances, setBalances] = useState({});
    const [tradeTargets, setTradeTargets] = useState({});
    const chainId = useChainId();
    const { chains, switchChain } = useSwitchChain();
    const { openAccountModal } = useAccountModal();
    const { openChainModal } = useChainModal();
    const { address, isConnected, chain } = useAccount();
    const { data, isError, isLoading, error } = useBalance({address: address, chainId: 11155111 });

    const mintToken = async (tokenId) => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ForgeERC1155TokenContract} = await getEthereumContract();
            const tx = await ForgeERC1155TokenContract.mintToken(tokenId, '0x');
            await tx.wait();
            await getAllBalance();
        }
        catch (error){
            console.log(error);
        }
    }

    const burnToken = async (tokenId) => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ForgeERC1155TokenContract} = await getEthereumContract();
            const tx = await ForgeERC1155TokenContract.burnToken(tokenId);
            await tx.wait();
            await getBalance(tokenId);
        }
        catch (error){
            console.log(error);
        }
    }

    const tradeToken = async (tokenId, targetTokenId) => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ForgeERC1155TokenContract} = await getEthereumContract();
            const tx = await ForgeERC1155TokenContract.tradeToken(tokenId, targetTokenId);
            await tx.wait();
            await getBalance(tokenId);
            await getBalance(targetTokenId);
        }
        catch (error){
            console.log(error);
        }
    }

    const getBalance = async (tokenId) => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ERC1155TokenContract} = await getEthereumContract();
            const balanceOf = await ERC1155TokenContract.balanceOf(address, tokenId);
            setBalances(prev => ({...prev, [tokenId]: balanceOf}));
        }
        catch (error){
            console.log(error);
        }
    }
    const getAllBalance = async () => {
        try{
            if (!ethereum) return alert("Please install a compatible wallet");
            const {ERC1155TokenContract} = await getEthereumContract();
            const newBalances = {};
            for (let tokenId = 0; tokenId <= 6; tokenId++) {
                const balance = await ERC1155TokenContract.balanceOf(address, tokenId);
                newBalances[tokenId] = balance;
            }
            setBalances(newBalances);
        }
        catch (error){
            console.log(error);
        }
    }


    useEffect(() => {
        if (isConnected && chain?.id==11155111){
            getAllBalance();
        }
    }, [isConnected, chain?.id]);
    return (
        <ForgeERC1155TokenContext.Provider value = {{address, isConnected, chains, chain, switchChain, chainId, openAccountModal, openChainModal, mintToken, burnToken,
            tradeToken, getAllBalance, balances, tradeTargets, setTradeTargets, data, isError, isLoading, error}}>
            {children}
        </ForgeERC1155TokenContext.Provider>
    );
}