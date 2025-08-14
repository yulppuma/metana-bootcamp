// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract String {

    /*Add following test cases for String contract:
    charAt(“abcdef”, 2) should return 0x6300
    charAt(“”, 0) should return 0x0000
    charAt(“george”, 10) should return 0x0000*/
   function charAt(string memory input, uint index) public pure returns(bytes2) {

        assembly{
            /* More Readable code:
            let strLength := mload(input)
            if iszero(lt(index, strLength)){
                return(0x00, 0x20)
            }
            let word := mload(add(add(input, 0x20), index))
            let b := byte(0, word)
            let char := shl(8, b)
            mstore(0x00, char)
            return(0x1e, 0x20)*/

            //Covers logic if index is not less than input length (out of bounds), or if empty string(0<0)
            if iszero(lt(index, mload(input))){
                return(0x00, 0x20)
            }
            /*Logic in order of most right instruction
                input = location in memory of variable
                1st add - input + 0x20 (since the first slot will be the length of the string)
                2nd add - the above result + index (this way we know where the character we want is located in memory)
                mload - will read from memory starting at the above result
                byte - since mload will return 32 bytes, we only want 1 which is the character at the start
                shl - after isolating the character, since we are returning bytes2, we shift it 1 byte (8 bits)
            */
            mstore(0x00, shl(8, byte(0, mload(add(add(input, 0x20), index)))))
            //returns the character at offset 30
            return(0x1e, 0x20)
        }
   }

}