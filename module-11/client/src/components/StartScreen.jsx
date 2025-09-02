import { useState } from "react";
import { useWallet } from "../context/WalletContext";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function StartScreen() {
  const { createWallet, unlockWithPassword, importWalletFromSeed, recoverWithSeed } = useWallet();
  const [err, setErr] = useState("");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle>Create wallet</CardTitle>
          <CardDescription>New wallet becomes active immediately.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CreateForm onSubmit={async ({ name, password }) => {
            try {
                setErr("");
                await createWallet({ name, password, strength: 128 }); // 12-word default
            } catch (e) {
                setErr(e.message || String(e));
            }
            }} />
        </CardContent>
      </Card>

      {/* Login */}
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter the password for the current active wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <PasswordForm cta="Login" onSubmit={async (pw) => {
            try { setErr(""); await unlockWithPassword(pw); } catch (e) { setErr(e.message || String(e)); }
          }} />
        </CardContent>
      </Card>

      {/* Import (existing only) */}
      <Card>
        <CardHeader>
          <CardTitle>Import Wallet</CardTitle>
          <CardDescription>Switch to a wallet already stored in this browser using its seed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SeedOnlyForm cta="Import" onSubmit={async (seed) => {
            try { setErr(""); await importWalletFromSeed({ seed }); }
            catch (e) { setErr(e.message || String(e)); }
          }} />
        </CardContent>
      </Card>

      {/* Recover password */}
      <Card>
        <CardHeader>
          <CardTitle>Recover Wallet</CardTitle>
          <CardDescription>Recover  current active wallet with seed and change password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RecoverForm onSubmit={async ({ seed, newPassword }) => {
            try { setErr(""); await recoverWithSeed({ seed, newPassword }); }
            catch (e) { setErr(e.message || String(e)); }
          }} />
        </CardContent>
      </Card>

      {err && (
        <div className="md:col-span-2">
          <Alert variant="destructive"><AlertDescription className="whitespace-pre-wrap">{err}</AlertDescription></Alert>
        </div>
      )}
    </div>
  );
}

function PasswordForm({ cta="Submit", onSubmit }) {
  const [pw, setPw] = useState("");
  return (
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); onSubmit(pw); }}>
      <Label>Password</Label>
      <Input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
      <Button disabled={!pw}>{cta}</Button>
    </form>
  );
}

function CreateForm({ onSubmit }) {
  const [name, setName] = useState("My Wallet");
  const [pw, setPw] = useState("");

  return (
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); onSubmit({ name, password: pw }); }}>
      <Label htmlFor="new-name">Wallet name</Label>
      <Input id="new-name" value={name} onChange={e => setName(e.target.value)} />

      <Label htmlFor="new-pw">Password</Label>
      <Input id="new-pw" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />

      <Button disabled={!name.trim() || pw.length < 6}>Create</Button>
    </form>
  );
}
function SeedOnlyForm({ cta="Submit", onSubmit }) {
  const [seed, setSeed] = useState("");
  return (
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); onSubmit(seed); }}>
      <Label>Seed phrase</Label>
      <Textarea value={seed} onChange={e => setSeed(e.target.value)} placeholder="twelve or twenty-four words…" />
      <Button disabled={seed.trim().split(/\s+/).length < 12}>{cta}</Button>
    </form>
  );
}

function RecoverForm({ onSubmit }) {
  const [seed, setSeed] = useState(""); const [pw1, setPw1] = useState(""); const [pw2, setPw2] = useState("");
  const valid = seed.trim().split(/\s+/).length >= 12 && pw1 && pw1 === pw2;
  return (
    <form className="space-y-2" onSubmit={e => { e.preventDefault(); onSubmit({ seed, newPassword: pw1 }); }}>
      <Label>Seed phrase</Label>
      <Textarea value={seed} onChange={e => setSeed(e.target.value)} placeholder="twelve or twenty-four words…" />
      <Label>New password</Label>
      <Input type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="••••••••" />
      <Label>Confirm password</Label>
      <Input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="••••••••" />
      <Button disabled={!valid}>Recover</Button>
    </form>
  );
}