// src/components/WalletManager.jsx
import React, { useMemo, useState } from "react";
import { useWallet } from "../context/WalletContext.jsx";

// shadcn/ui
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export default function WalletManager() {
  const { wallets, activeId, activeWallet, createWallet, setActiveWallet, checkPassword, unlockSeed, unlockAccountPrivateKey, deriveNextAccount,
    setActiveAccount, selectedAccount, appendSessionIntoActive, ephemeralWallet, importMnemonicSession, importPrivateKeySession, recoverWalletSession, 
    appendMnemonicAllToActive, appendPrivateKeyToActive } = useWallet();

  // ---- Local UI state (thin) ----
  // Create tab
  const [wName, setWName] = useState("My Wallet");
  const [createPw, setCreatePw] = useState("");
  const [creating, setCreating] = useState(false);
  // Reveal seed
  const [revealPw, setRevealPw] = useState("");
  const [derivePw, setDerivePw] = useState("");
  const [revealedSeed, setRevealedSeed] = useState("");
  const [impSeed, setImpSeed] = useState("");
  const [impPk, setImpPk] = useState("");
  const [impPwSeed, setImpPwSeed] = useState("");
  const [impPwPk, setImpPwPk] = useState("");
  const [isImportingSeed, setIsImportingSeed] = useState(false);
  const [isImportingPk, setIsImportingPk] = useState(false);

  const walletList = useMemo(() => Object.values(wallets || {}), [wallets]);

  const normalizeMnemonic = (m) => m.trim().toLowerCase().replace(/\s+/g, " ");
  const isValidPk = (pk) => {
    let h = pk.trim();
    if (h.startsWith("0x")) h = h.slice(2);
    return /^[0-9a-fA-F]+$/.test(h) && h.length === 64;
  };
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };
  async function handleCreate(strengthBits) {
    if (!createPw || createPw.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setCreating(true);
    try {
      await createWallet({
        name: (wName || "").trim() || "Wallet",
        password: createPw,
        strength: strengthBits, // 128 => 12 words, 256 => 24 words
      });
      setCreatePw(""); // clear the password field after creating
    } catch (e) {
      alert(e.message || "Failed to create wallet");
    } finally {
      setCreating(false);
    }
  }

  async function handleReveal() {
    if (!activeId) { alert("Select a wallet first."); return; }
    try {
      const ok = await checkPassword(activeId, revealPw);
      if (!ok) { alert("Wrong password"); return; }
      const seed = await unlockSeed(activeId, revealPw);
      setRevealedSeed(seed);
      setRevealPw("");
    } catch (e) {
      alert(e.message || "Unable to decrypt seed");
    }
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-6">
        {/* Wallet (Create / Switch / Security) */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>
              Create password-gated HD wallet; seed is encrypted and stored. Multiple wallets supported.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList>
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="switch">Switch</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="import">Import Wallet</TabsTrigger>
              </TabsList>

              {/* CREATE */}
              <TabsContent value="create" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wname">Wallet Name</Label>
                    <Input id="wname" value={wName} onChange={(e) => setWName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw">Password</Label>
                    <Input
                      id="pw"
                      type="password"
                      value={createPw}
                      onChange={(e) => setCreatePw(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button disabled={creating} onClick={() => handleCreate(128)}>
                    {creating ? "Creating…" : "Create 12-word Wallet"}
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button disabled={creating} variant="outline" onClick={() => handleCreate(256)}>
                        {creating ? "Creating…" : "Create 24-word"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Uses 256-bit entropy</TooltipContent>
                  </Tooltip>
                </div>

                {/* (Note: we do NOT display the mnemonic here; it's stored encrypted.) */}
              </TabsContent>

              {/* SWITCH (choose active wallet) */}
              <TabsContent value="switch" className="space-y-4 pt-4">
                {walletList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No wallets yet. Create one above.</div>
                ) : (
                  <div className="space-y-2">
                    {walletList.map((w) => (
                      <div key={w.id} className="flex items-center justify-between rounded border p-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{w.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Created {new Date(w.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Button size="sm" onClick={() => setActiveWallet(w.id)}>
                          {activeId === w.id ? "Active" : "Select"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* SECURITY (reveal seed with password) */}
              <TabsContent value="security" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="reveal-pw">Reveal Seed (requires password)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="reveal-pw"
                      type="password"
                      placeholder="Enter password"
                      value={revealPw}
                      onChange={(e) => setRevealPw(e.target.value)}
                      className="max-w-sm"
                    />
                    <Button variant="secondary" onClick={handleReveal}>Reveal</Button>
                    {revealedSeed && (
                      <Button variant="outline" onClick={() => setRevealedSeed("")}>Clear</Button>
                    )}
                  </div>
                </div>

                {revealedSeed && (
                  <div className="rounded-md border bg-muted p-3 text-sm leading-relaxed break-words">
                    {revealedSeed}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="import" className="space-y-6 pt-4">
                {/* Import by Seed (HD) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Import Wallet from Seed (All Accounts)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="imp-seed">Seed phrase</Label>
                        <Input
                          id="imp-seed"
                          placeholder="twelve or twenty-four words…"
                          value={impSeed}
                          onChange={(e) => setImpSeed(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="imp-pw">Active wallet password</Label>
                        <Input
                          id="imp-pw"
                          type="password"
                          placeholder="Used to encrypt & save the imported seed"
                          value={impPwSeed}
                          onChange={(e) => setImpPwSeed(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        disabled={isImportingSeed}
                        onClick={async () => {
                          if (!activeId) return alert("Create or select a wallet first.");
                          const m = normalizeMnemonic(impSeed);
                          if (!m) return alert("Enter seed");
                          if (impPwSeed.length < 6) return alert("Password must be at least 6 chars.");
                          try {
                            setIsImportingSeed(true);

                            const res = await appendMnemonicAllToActive({
                              password: impPwSeed,
                              mnemonic: m,
                              label: "Imported HD",
                            });

                            if (!res?.appended) {
                              alert("No accounts imported (wallet not found in this browser).");
                            } else {
                              alert(`Imported ${res.appended} account(s).`);
                            }

                            setImpSeed("");
                            setImpPwSeed("");
                          } catch (e) {
                            alert(e?.message ?? "Import failed");
                          } finally {
                            setIsImportingSeed(false);
                          }
                        }}
                      >
                        {isImportingSeed ? "Importing…" : "Import"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Import by Private Key */}
                <Card>
                  <CardHeader>
                    <CardTitle>Import from Private Key</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="imp-pk">Private key (0x… or hex)</Label>
                        <Input
                          id="imp-pk"
                          placeholder="0x…"
                          value={impPk}
                          onChange={(e) => setImpPk(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="imp-pw2">Active wallet password</Label>
                        <Input
                          id="imp-pw2"
                          type="password"
                          placeholder="Used to encrypt & save the imported key"
                          value={impPwPk}
                          onChange={(e) => setImpPwPk(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        disabled={isImportingPk}
                        onClick={async () => {
                          if (!activeId) return alert("Create or select a wallet first.");
                          if (!isValidPk(impPk)) return alert("Private key must be 32-byte hex.");
                          if (impPwPk.length < 6) return alert("Password must be at least 6 chars.");
                          try {
                            setIsImportingPk(true);
                            const res = await appendPrivateKeyToActive({
                              password: impPwPk,
                              privateKey: impPk.trim(),
                              label: "Imported PK",
                            });
                            if (!res?.appended) {
                              alert("That address is already in this wallet.");
                            } else {
                              alert(`Imported ${res.address}`);
                            }
                            setImpPk("");
                            setImpPwPk("");
                          } catch (e) {
                            alert(e?.message ?? "Import failed");
                          } finally {
                            setIsImportingPk(false);
                          }
                        }}
                      >
                        {isImportingPk ? "Importing…" : "Import Account"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Accounts (from active wallet) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                type="password"
                placeholder="Password to derive"
                value={derivePw}
                onChange={(e) => setDerivePw(e.target.value)}
                className="w-44"
              />
              <Button
                onClick={async () => {
                  if (!activeId) { alert("Select a wallet first."); return; }
                  if (!derivePw) { alert("Enter password"); return; }
                  try {
                    // optional quick check before doing work
                    const ok = await checkPassword(activeId, derivePw);
                    if (!ok) { alert("Wrong password"); return; }
                    await deriveNextAccount({ walletId: activeId, password: derivePw });
                    setDerivePw(""); // clear after success
                  } catch (e) {
                    alert(e.message || "Failed to derive account");
                  }
                }}
              >
                Add account
              </Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {!activeWallet || (activeWallet.accounts?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">No accounts yet for this wallet.</div>
            ) : (
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-3 space-y-3">
                  {activeWallet.accounts.map((a, idx) => {
                    const isActive = idx === activeWallet.activeAccountIndex;
                    return (
                      <Card key={(a.address ?? `${a.origin?.id || "local"}:${idx}`)}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {(typeof a.origin === "string" ? a.origin : a.origin?.label) ?? (activeWallet?.name || "Local")}{" "}#
                                {Number.isFinite(a.origin?.index) ? a.origin.index : a.index}
                              </Badge>
                              <span className="font-mono text-xs md:text-sm break-all">{a.address}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => copy(a.address)}>Copy Addr</Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => copy(a.publicKey)}>Copy PubKey</Button>
                                </TooltipTrigger>
                                <TooltipContent>Uncompressed public key</TooltipContent>
                              </Tooltip>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  const pw = window.prompt("Enter wallet password to reveal this private key");
                                  if (!pw) return;
                                  try {
                                    const pk = await unlockAccountPrivateKey({ walletId: activeId, index: idx, password: pw });
                                    await navigator.clipboard.writeText(pk);
                                    alert("Private key copied to clipboard.\nHandle with care!");
                                  } catch (e) {
                                    alert(e?.message ?? "Failed to reveal private key");
                                  }
                                }}
                              >
                                Reveal PK
                              </Button>
                              <Button
                                size="sm"
                                variant={isActive ? "default" : "secondary"}
                                onClick={() => setActiveAccount({ walletId: activeId, index: idx })}
                              >
                                {isActive ? "Selected" : "Select"}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
          {activeWallet && (
            <>
              <Separator />
              <CardFooter className="flex-col items-start gap-1">
                <div className="text-xs text-muted-foreground">Active Wallet</div>
                <div className="font-mono text-sm break-all">{activeWallet.name}</div>
              </CardFooter>
            </>
          )}
          {selectedAccount && (
          <>
            <Separator />
            <CardFooter className="flex-col items-start gap-2">
              <div className="text-xs text-muted-foreground">Selected Account</div>
              <div className="font-mono text-sm break-all">{selectedAccount.address}</div>
            </CardFooter>
          </>
        )}
        </Card>
      </div>
    </TooltipProvider>
  );
}
