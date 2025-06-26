import React, { useContext, useState } from 'react';
import { ForgeERC1155TokenContext } from '../context/ForgeERC1155TokenContext';
import { useBalance, useAccount } from 'wagmi';
const Tokens = () => {
    const {address, mintToken, burnToken, tradeToken, balances, tradeTargets, setTradeTargets, data, isError, isLoading, error} = useContext(ForgeERC1155TokenContext);
    const tradableTokenIds = [0, 1, 2];
    const tokenIds = [0, 1, 2, 3, 4, 5, 6];
    console.log(address);
    console.log("Is loading:", isLoading);
    console.log(data);
    console.log(error);
    return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md border">
            <ul className="space-y-4">
                {tokenIds.map((id) => {
                    const isTradable = tradableTokenIds.includes(id);
                    const tradeTarget = tradeTargets[id] ?? "";

                    return (
                        <li
                            key={id}
                            className="flex flex-col md:flex-row items-start md:items-center justify-between border-b pb-4"
                        >
                            <div className="mb-2 md:mb-0">
                                <p className="text-lg font-semibold">Token {id}</p>
                                <p className="text-sm text-gray-600">
                                    Balance: {balances[id] || 0}
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center">
                                <button
                                    onClick={() => mintToken(id)}
                                    className="px-4 py-1 rounded bg-green-500 text-white hover:bg-green-600"
                                >
                                    Mint
                                </button>
                                <button
                                    onClick={() => burnToken(id)}
                                    className="px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                                >
                                    Burn
                                </button>

                                {isTradable && (
                                    <>
                                        <select
                                            value={tradeTarget}
                                            onChange={(e) =>
                                                setTradeTargets((prev) => ({
                                                    ...prev,
                                                    [id]: Number(e.target.value),
                                                }))
                                            }
                                            className="px-2 py-1 border rounded"
                                        >
                                            <option value="" disabled>
                                                Trade for...
                                            </option>
                                            {tradableTokenIds
                                                .filter((otherId) => otherId !== id)
                                                .map((otherId) => (
                                                    <option key={otherId} value={otherId}>
                                                        Token {otherId}
                                                    </option>
                                                ))}
                                        </select>
                                        <button
                                            onClick={() =>
                                                tradeToken(id, tradeTargets[id])
                                            }
                                            disabled={!tradeTargets[id]}
                                            className="px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                                        >
                                            Trade
                                        </button>
                                    </>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <div className="text-right mt-4 text-sm text-gray-700">
            Balance: {data?.formatted}
            </div>
        </div>
    );
}

export default Tokens;