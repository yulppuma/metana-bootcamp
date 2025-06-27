import React, { useContext, useState } from 'react';
import { ForgeERC1155TokenContext } from '../context/ForgeERC1155TokenContext';
import { useBalance, useAccount } from 'wagmi';
const Tokens = () => {
    const {address, mintToken, burnToken, tradeToken, balances, tradeTargets, setTradeTargets, data, isError, isLoading, error} = useContext(ForgeERC1155TokenContext);
    const tradableTokenIds = [0, 1, 2];
    const tokenIds = [0, 1, 2, 3, 4, 5, 6];
    return (
    <div className="max-w-4xl mx-auto mt-8 p-6 bg-zinc-900 rounded-xl shadow-lg border border-zinc-700">
      <ul className="space-y-6">
        {tokenIds.map((id) => {
          const isTradable = tradableTokenIds.includes(id);
          const tradeTarget = tradeTargets[id] ?? '';

          return (
            <li
              key={id}
              className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-zinc-700 pb-4"
            >
              <div className="mb-4 md:mb-0">
                <p className="text-xl font-semibold text-white">Token {id}</p>
                <p className="text-sm text-zinc-400">Balance: {balances?.[id] ?? 0}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => mintToken(id)}
                  className="px-4 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white"
                >
                  Mint
                </button>
                <button
                  onClick={() => burnToken(id)}
                  className="px-4 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white"
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
                      className="px-2 py-1 rounded-lg bg-zinc-800 text-white border border-zinc-600"
                    >
                      <option value="" disabled hidden>
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
                      onClick={() => tradeToken(id, tradeTargets[id])}
                      disabled={!tradeTargets[id]}
                      className="px-4 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
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

      <div className="text-right mt-6 text-sm text-zinc-400">
        ETH Balance: {data?.formatted ?? '0.00'}
      </div>
    </div>
    );
}

export default Tokens;