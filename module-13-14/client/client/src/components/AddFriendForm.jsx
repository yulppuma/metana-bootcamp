import React, { useState } from "react";
import { useFriends } from "../context/FriendsProvider";
import { isAddress } from "viem";

const INPUT = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "8px 12px",
  height: 40,
  boxSizing: "border-box",
  background: "white",
};

export default function AddFriendForm() {
  const { addFriend } = useFriends();
  const [addr, setAddr] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");

  async function save() {
    setStatus("");
    const a = addr.trim();
    const n = name.trim();
    if (!isAddress(a)) { setStatus("Enter a valid 0x address."); return; }
    if (!n) { setStatus("Enter a name."); return; }
    addFriend(a, n);
    setAddr("");
    setName("");
    setStatus("Saved ✔");
    setTimeout(() => setStatus(""), 1200);
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Add Friend</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr auto", gap: 8 }}>
        <input
          placeholder="Address (0x…)"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          spellCheck={false}
          style={INPUT}
        />
        <input
          placeholder="Name (e.g., George)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={INPUT}
        />
        <button
          onClick={save}
          style={{
            padding: "8px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "white",
            height: 40,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition: "box-shadow 120ms ease, border-color 120ms ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)")}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
        >
          Save
        </button>
      </div>
      {status ? <div style={{ marginTop: 8, fontSize: 12, color: "#374151" }}>{status}</div> : null}
    </div>
  );
}
