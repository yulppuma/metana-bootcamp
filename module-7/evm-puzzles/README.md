# EVM puzzles

A collection of EVM puzzles. Each puzzle consists on sending a successful transaction to a contract. The bytecode of the contract is provided, and you need to fill the transaction data that won't revert the execution.

## How to play

Clone this repository and install its dependencies (`npm install` or `yarn`). Then run:

```
npx hardhat play
```

And the game will start.

In some puzzles you only need to provide the value that will be sent to the contract, in others the calldata, and in others both values.

You can use [`evm.codes`](https://www.evm.codes/)'s reference and playground to work through this.

## Solutions/Explanations

Puzzle 1: CALLVALUE returns the ether (in wei) sent and pushes it onto the stack. I then need to make sure JUMP will skip all the REVERT opcodes and reach JUMPDEST which is in byte offset 0x08. **ANSWER:** 8

Puzzle 2: Again CALLVALUE returns the value sent and pushes onto the stack. CODESIZE returns the size of the code, being 10 and pushes it onto the stack. This is calculated by the number of bytes each instruction occupies. We have 10 instructions total, and each one occupies one byte. So the stack is looking as such [a, X]. Then SUB is called, which subtracts a - b, where a is the top of the stack and b is the integer following it. So we have a - X = ? at the top of the stack, the next instruction is JUMP, referring back to the previous puzzle we need the value of the top of the stack to be the byte offset where the JUMPDEST instruction will be at. In this case, it is 0x06, so we now know that 0a - X = 06, meaning that the value input should be 4 wei. **ANSWER:** 4

Puzzle 3: CALLDATASIZE returns the byte size of the calldata and pushes it onto the stack, and since we know where JUMPDEST is, we need to have our calldata with a byte size of 4 (0x00000000). JUMP will then read this value and continue execution from JUMPDEST. **ANSWER:** 0x00000000

Puzzle 4: The main concern here is XOR, which is the bitwise operator. To start, we have CALLVALUE and we should know what CODESIZE will return, 12, and from the previous puzzles we know that JUMP will read the top of the stack and it should return the where to begin execution (JUMPDEST instruction or 0x0a). So know we know that X ^ 12 = a, but we need to convert 12 and 'a' into binary. Understanding how XOR works, also lets us imply that if X ^ 12 = a then a ^ 12 = X, X being the input CALLVALUE returns. If we re-write this it will look as such 1100 ^ 1010 = X. XOR rules dictate if the values are the same return 0 otherwise return 1.
 1100
^1010
-------
 0110
We then convert this value back and we get 6 (in hexadecimal). **ANSWER:** 6

Puzzle 5: Going through it line by line, CALLVALUE will be the ether (in wei) sent, X. we then DUP1 it, meaning duplicate what is currently at the top of the stack being X, so the stack is currently [X,X]. We then MUL and push the new value to the top of the stack, [X**X]. PUSH2 then pushes 0100 onto the stack, [100, X*X], which is followed by EQ checking the 2 topmost integers in the stack, 100 == X*X, and returns 0 or 1 and pushes it onto the stack. Finally, one last PUSH1 instruction is made pushing 0C into the stack which will now look as such, [C, 0 or 1] until it reaches JUMPI which checks the top of the stack as the path to start execution only if the the value after is not 0. To reach JUMPDEST and skip the REVERT instructions the stack should look as such [C,1]. This means that we want 100 == X*X => 1. To make things easier we convert 100 into decimal which is 256, and the square root of 256 is 16.
**ANSWER:** 16

Puzzle 6: PUSH1 pushes 0 to top of the stack, then CALLDATALOAD will read the calldata input by starting from the given offset, the top of the stack which is 0. Since the instruction expects a 32-byte value output, and it will start reading from the 0 offset, 0x000000000000000000000000000000000000000000000000000000000000000a will read 'a' which is the point where JUMPDEST instruction occurs.
**ANSWER:** 0x000000000000000000000000000000000000000000000000000000000000000a

Puzzle 7: To pass this puzzle, I need to understand how the CREATE instruction works. CALLDATACOPY will copy the calldata into memory based off the 3 top-most integers on the stack. Since CREATE will have 3 stack inputs as well (the value, byte offset in memory, and byte size to copy), we can control this by the calldata we pass, as long as anything that eventually ends up with the byte size code in the second top-most integer after the RETURN instruction. EXTCODESIZE will return the byte size of the code, which if we look at RETURN will have 2 inputs (offset, size). The calldata I chose was simple, 0x60016001F3 => PUSH1 01, PUSH1 01, RETURN which will end up having the byte size of the code as 01.
**ANSWER:** 0x60016001F3

Puzzle 8: This puzzle was a bit more complex, and required the understanding of how CALL works when executing smart contract code. In this case, we want CALL to return 0 to pass the EQ instruction. To do this the calldata needs to have instructions that would make the runtime code of the contract to always revert.
**ANSWER:** 0x6700000000000000fd6000526001601ff3
PUSH8 0x00000000000000fd
PUSH1 0x00
MSTORE
PUSH1 0x01
PUSH1 0x1f
RETURN

Puzzle 9: We have to make sure 3 < CALLDATASIZE, AND CALLVALUE * CALLDATASIZE = 8. 
**ANSWER:** Calldata 0x00000001
			Value 2 Wei

Bonus Puzzle 10: Similar to Puzzle 9, in this puzzle we have GT and ISZERO instructions and expecting them to return true for both. Calldata of byte size 3 should suffic in this case (0x000003), after passing these instructions, we need to make sure that 0x0A + CALLVALUE = JUMPDEST PC. To do this we count up the byte offset until we reach JUMPDEST in the code, knowing this we convert back to decimal, same with 0x0A and subtract 1A-0A => 26 - 10 => 16 (decimal) but since PC starts at 0 we subtract 1. 
**ANSWER:** Calldata 0x000003
		    Value 15 Wei