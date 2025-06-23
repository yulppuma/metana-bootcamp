import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { ConnectButton } from '@rainbow-me/rainbowkit';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-4">
      <h1 className="text-2xl font-bold mb-4">Forge ERC1155</h1>
      <ConnectButton />
    </div>
  )
}

export default App
