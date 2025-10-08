import React from "react";
import ReactDOM from "react-dom/client";
import WalletProvider from "./context/WalletProvider.jsx";
import App from "./App.jsx";

// Load RainbowKit CSS safely
import rainbowCssUrl from "@rainbow-me/rainbowkit/styles.css?url";
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = rainbowCssUrl;
document.head.appendChild(link);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
