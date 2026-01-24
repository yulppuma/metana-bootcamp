# metana-bootcamp Module-13-14
## Prerequisites
### Before you begin, ensure you are able to run the following tools on your system:
### Node.js & npm (Node.js v16+ recommended) (https://nodejs.org/en)
### Git (https://git-scm.com/)
### VS Code (https://code.visualstudio.com/)
### Hardhat (installed via npm) (https://hardhat.org/)

## MyScan
# MyScan is a decentralized application inspired by social payment apps like Venmo, and 'user-friendly' interfaces like Etherscan. While apps like Venmo, Paypal, or Zelle are centralized and act as 'trusted' intermediaries, they are at the forefront of payment apps for the average user. They are simple to use, and integrate to everyday life. Etherscan, on the other hand, is decentralized and provides in-depth analytics for every transaction. While for the average EVM developer this is user-friendly, the average consumer won't be able to understand half of the details presented by Etherscan. While both apps have their pros and cons they can meet halfway, that is where MyScan comes in. MyScan keeps the social aspect by allowing users to name their friends instead of just seeing an address string on top of leaving a memo and shows their respective cryptocurrency in USD($) as well as the time of the transaction. MyScan also incorporates price feed oracle data and automation tools to detect stale data. User A, George, might have sent $5 worth of ETH to Jesse on a given day, but a week later they see that actually that ETH is now worth $6.

## MyScan Setup for Windows via VS Code terminal
### 1. Clone the repository
``` git clone git@github.com:yulppuma/metana-bootcamp.git```
### 2. Install dependencies
``` cd module-13-14```
#### To run the frontend, cd into client directory. To run smart contract test code, cd into contracts directory
``` cd client ``` 
``` cd contracts ```
```npm install```
### 3. Compile the contracts
``` npx hardhat compile```
### 4. Run Tests (this compiles the contracts in the background as well)
``` npx hardhat test```
### 5. Start the development server in the client folder
``` npm run dev```
### 6. Open preferred browser when ready in the console



