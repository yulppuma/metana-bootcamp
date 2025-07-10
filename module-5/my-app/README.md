# metana-bootcamp Module-5
## Prerequisites
### Before you begin, ensure you are able to run the following tools on your system:
### Node.js & npm/pnpm (Node.js v16+ recommended) (https://nodejs.org/en)
### Git (https://git-scm.com/)
### VS Code (https://code.visualstudio.com/)
### 

## Setup for Windows via VS Code terminal
### 1. Clone the repository
``` git clone git@github.com:yulppuma/metana-bootcamp.git```
### 2. Install dependencies
``` cd module-5```
``` cd my-app```
```pnpm install```
### 3. Start the development server
``` pnpm dev```

### Base Fee vs Gas Usage %
While plotting the base fee of each block, and the gas used over gas limit as a percentage, the relationship they have is almost mirrored.
While one increases, the other decreases vice versa. To put it into perspective, when gas used is closer to the gas limit or rather when 
the gas usage percentage is high, base fee was low. This also implies that the following block will have a higher base fee.