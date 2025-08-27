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
  const {
    wallets,            // { [id]: wallet }
    activeId,           // string | null
    activeWallet,       // wallet object with .accounts
    createWallet,       // ({ name, password, strength })
    setActiveWallet,    // (walletId)
    checkPassword,      // (walletId, password) -> boolean
    unlockSeed,         // (walletId, password) -> mnemonic (string)
  } = useWallet();

  // ---- Local UI state (thin) ----
  // Create tab
  const [wName, setWName] = useState("My Wallet");
  const [createPw, setCreatePw] = useState("");
  const [creating, setCreating] = useState(false);

  // Reveal seed
  const [revealPw, setRevealPw] = useState("");
  const [revealedSeed, setRevealedSeed] = useState("");

  const walletList = useMemo(() => Object.values(wallets || {}), [wallets]);

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
      setRevealPw(""); // don't keep password in memory
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
            </Tabs>
          </CardContent>
        </Card>

        {/* Accounts (from active wallet) */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Derivation path: m/44’/60’/0’/0/i</CardDescription>
            </div>
            {/* If you later add a deriveNextAccount({ walletId, password }) in context, hook a button here */}
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {!activeWallet || (activeWallet.accounts?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground">No accounts yet for this wallet.</div>
            ) : (
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-3 space-y-3">
                  {activeWallet.accounts.map((a) => (
                    <Card key={a.index}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">#{a.index}</Badge>
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
        </Card>
      </div>
    </TooltipProvider>
  );
}
