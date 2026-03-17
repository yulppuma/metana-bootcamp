# MyScan

MyScan is a decentralized transaction visualization platform that combines the usability of traditional payment applications with the transparency of blockchain explorers.

The application enables users to analyze cryptocurrency transactions through a social-style interface while integrating real-time oracle data and automated monitoring systems.

🔗 Live Demo  
https://myscan-alpha.vercel.app/

---

# Overview

Traditional blockchain explorers like Etherscan provide detailed analytics but can be difficult for non-technical users to interpret.

Conversely, consumer payment platforms such as Venmo or PayPal provide intuitive transaction interfaces but rely on centralized infrastructure.

MyScan bridges this gap by providing:

• A **user-friendly transaction interface**  
• **Blockchain transparency** through on-chain data  
• **Real-time price data** using Chainlink oracles  
• **Automated monitoring** to detect stale or deprecated data feeds  

The goal is to make blockchain transaction analysis accessible to everyday users while maintaining decentralized trust guarantees.

---

# Key Features

## Social-style Transaction History

Users can:

- Attach **memos** to transactions
- Assign **contact names** to wallet addresses
- View **transaction timestamps**
- Track historical transaction values

---

## Real-Time Oracle Price Integration

MyScan integrates **Chainlink Price Feeds** to convert cryptocurrency values into USD at the time of the transaction.

This enables users to compare:

- **Value at time of transaction**
- **Current asset value**

Example scenario:

George sends $5 worth of ETH to Jesse.

One week later the same ETH may now be worth $6.

MyScan highlights this change directly within the transaction history.

---

## Automated Oracle Monitoring

The system includes a smart contract compatible with **Chainlink Keepers (Automation)** to detect:

- Stale price feeds
- Deprecated oracle data
- Invalid or outdated pricing

Automated upkeep ensures the application continues to operate using reliable data sources.

---

# Architecture

The platform consists of four primary layers:

Frontend (React + Vite)  
↓  
Web3 Interface (Ethers.js)  
↓  
Smart Contracts (Solidity)  
↓  
Chainlink Infrastructure  
• Price Feed Oracles  
• Chainlink Keepers (Automation)

---

# Smart Contract System

The backend architecture consists of **three smart contracts working together**.

## Transaction Contract

Responsible for:

- Recording ETH and ERC20 transactions
- Storing transaction metadata (memo, timestamp)
- Mapping wallet addresses to user-friendly contact names

---

## Oracle Price Feed Contract

Responsible for:

- Fetching asset pricing from Chainlink Price Feeds
- Converting cryptocurrency values to USD
- Maintaining price references used for transaction comparisons

---

## Automation Monitoring Contract

Responsible for:

- Detecting stale oracle data
- Triggering upkeep logic
- Ensuring price feeds remain valid and reliable

---

# Tech Stack

## Blockchain

- Solidity  
- Ethereum (Sepolia Testnet)  
- Chainlink Price Feeds  
- Chainlink Keepers (Automation)

---

## Smart Contract Tooling

- Hardhat  
- OpenZeppelin  
- Mocha / Chai

---

## Frontend

- React  
- Vite  
- Ethers.js  
- TailwindCSS

---

## Development Tools

- MetaMask  
- Git  
- VS Code

---

# Project Structure

module-13-14

client  
• React frontend application

contracts  
• Solidity smart contracts  
• deployment scripts  
• test suite

README.md

---

# Local Development Setup

## Prerequisites

Ensure the following tools are installed:

- Node.js (v16+ recommended)
- npm
- Git
- VS Code
- Hardhat

---

# Installation

Clone the repository:

git clone https://github.com/yulppuma/metana-bootcamp.git

Navigate to the project directory:

cd module-13-14

---

# Install Dependencies

Install dependencies in both the frontend and smart contract directories.

Frontend:

cd client  
npm install

Smart Contracts:

cd ../contracts  
npm install

---

# Compile Smart Contracts

npx hardhat compile

---

# Run Tests

npx hardhat test

---

# Start the Frontend

From the client directory:

npm run dev

Open the local development URL shown in the terminal.

---

# Future Improvements

Potential improvements include:

- Drastically improve the UI
- Multi-chain support
- Advanced transaction analytics
- Expanded wallet activity visualization
- Layer 2 compatibility
- Historical price analytics dashboard