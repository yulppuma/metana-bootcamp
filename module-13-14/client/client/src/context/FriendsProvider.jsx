import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";

const Fctx = createContext({
  owner: null,
  getName: (_addr) => null,
  setName: (_addr, _name) => {},
  addFriend: (_addr, _name) => {},     // <— added alias
  removeName: (_addr) => {},
  removeFriend: (_addr) => {},         // <— added alias
  listFriends: () => [],               // [{ address, name }]
});

export const useFriends = () => useContext(Fctx);

const lc = (addr) => (typeof addr === "string" ? addr.toLowerCase() : "");

export function FriendsProvider({ children }) {
  const { address } = useAccount();
  const owner = address || null;
  const ownerLc = owner ? lc(owner) : null;

  // Current owner's nickname book: { [otherAddrLc]: "Nickname" }
  const [book, setBook] = useState({});
  const hasLoadedRef = useRef(false);

  // Load the current owner's book on owner change
  useEffect(() => {
    hasLoadedRef.current = false;

    if (!ownerLc) {
      setBook({});
      return;
    }

    try {
      const raw = localStorage.getItem(`friends:${ownerLc}`);
      const parsed = raw ? JSON.parse(raw) : {};
      setBook(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setBook({});
    } finally {
      hasLoadedRef.current = true;
    }
  }, [ownerLc]);
  const persist = (next) => {
    if (!ownerLc || !hasLoadedRef.current) return;
    try {
      localStorage.setItem(`friends:${ownerLc}`, JSON.stringify(next || {}));
    } catch { }
  };

  const getName = (addr) => {
    const key = lc(addr);
    if (!key) return null;
    return book[key] || null;
  };

  const setName = (addr, name) => {
    const key = lc(addr);
    if (!ownerLc || !key) return;
    const trimmed = (name || "").trim();

    setBook((prev) => {
      const next = { ...prev };
      if (trimmed) next[key] = trimmed;
      else delete next[key];
      persist(next);
      return next;
    });
  };

  const removeName = (addr) => {
    const key = lc(addr);
    if (!ownerLc || !key) return;

    setBook((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      persist(next);
      return next;
    });
  };

  const addFriend = (addr, name) => setName(addr, name);
  const removeFriend = (addr) => removeName(addr);

  const listFriends = () =>
    Object.entries(book).map(([address, name]) => ({ address, name }));

  const value = useMemo(
    () => ({
      owner,
      getName,
      setName,
      addFriend,
      removeName,
      removeFriend,
      listFriends,
    }),
    [owner, JSON.stringify(book)]
  );

  return <Fctx.Provider value={value}>{children}</Fctx.Provider>;
}
