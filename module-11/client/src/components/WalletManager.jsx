// src/components/WalletManager.jsx
import React, { useState } from "react";
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
    mnemonic,
    accounts,
    selectedIndex,
    selectedAccount,
    createNewWallet,
    importFromMnemonic,
    deriveNextAccount,
    setSelectedIndex,
    removeWallet,
  } = useWallet();

  const [mnemonicInput, setMnemonicInput] = useState("");

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
            <CardDescription>HD wallet (BIP39/BIP32). All secrets are in localStorage.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList>
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="import">Import</TabsTrigger>
                <TabsTrigger value="danger">Danger Zone</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Button onClick={() => createNewWallet(128)}>Create 12-word Wallet</Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={() => createNewWallet(256)}>Create 24-word</Button>
                    </TooltipTrigger>
                    <TooltipContent>Uses 256-bit strength</TooltipContent>
                  </Tooltip>
                </div>
                {mnemonic && (
                  <div className="space-y-2">
                    <Label>Secret Recovery Phrase</Label>
                    <div className="rounded-md border bg-muted p-3 text-sm leading-relaxed break-words">
                      {mnemonic}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => copy(mnemonic)}>Copy</Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="import" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="mnemonic">Enter 12/24-word mnemonic</Label>
                  <Input
                    id="mnemonic"
                    placeholder="seed phrase…"
                    value={mnemonicInput}
                    onChange={(e) => setMnemonicInput(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (!mnemonicInput.trim()) return;
                      try {
                        importFromMnemonic(mnemonicInput);
                        setMnemonicInput("");
                      } catch (e) {
                        alert(e.message);
                      }
                    }}
                  >
                    Import
                  </Button>
                  <Button variant="ghost" onClick={() => setMnemonicInput("")}>Clear</Button>
                </div>
              </TabsContent>

              <TabsContent value="danger" className="pt-4">
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="text-destructive">Remove Wallet</CardTitle>
                    <CardDescription>Deletes mnemonic and accounts from localStorage.</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button variant="destructive" onClick={removeWallet}>Remove</Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>Derivation path: m/44’/60’/0’/0/i</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={deriveNextAccount}>+ Derive Next</Button>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No accounts yet. Create or import a wallet.</div>
            ) : (
              <ScrollArea className="h-72 rounded-md border">
                <div className="p-3 space-y-3">
                  {accounts.map((a) => {
                    const isSelected = selectedIndex === a.index;
                    return (
                      <Card key={a.index} className={isSelected ? "border-primary" : ""}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={isSelected ? "default" : "secondary"}>#{a.index}</Badge>
                              <span className="font-mono text-xs md:text-sm break-all">{a.address}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm" onClick={() => copy(a.address)}>Copy Addr</Button>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => copy(a.privateKey)}>Copy PK</Button>
                                </TooltipTrigger>
                                <TooltipContent>Keep private key secret</TooltipContent>
                              </Tooltip>
                              <Button size="sm" onClick={() => setSelectedIndex(a.index)}>
                                {isSelected ? "Selected" : "Select"}
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
          {selectedAccount && (
            <>
              <Separator />
              <CardFooter className="flex-col items-start gap-1">
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
