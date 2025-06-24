import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Wallet, Tokens } from './components';


function App() {
  return (
    <div>
      <Wallet/>
      <div>
        <Tokens/>
      </div>
    </div>
  )
}

export default App
