// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

contract BitWise {

    // count the number of bit set in data.  i.e. data = 7, result = 3

    function countBitSet(uint8 data) public pure returns (uint8 result) {

        for( uint i = 0; i < 8; i += 1) {

            if( ((data >> i) & 1) == 1) {

                result += 1;

            }

        }

    }

    function countBitSetAsm(uint8 data ) public pure returns (uint8 result) {

        // replace following line with inline assembly code

        assembly{
            
            for{ let i := 0 } lt(i, 8) { i := add(i, 1) }
            {
                switch and(shr(i, data), 1)
                case 1 {
                    result := add(result, 1)
                }
            }
        }

    }

}

/*Add following test cases for String contract:
charAt(“abcdef”, 2) should return 0x6300
charAt(“”, 0) should return 0x0000
charAt(“george”, 10) should return 0x0000*/
contract String {

   function charAt(string memory input, uint index) public pure returns(bytes2) {

        bytes32 char;
        assembly{

            // add logic here

            // return the character from input at the given 

            // index

            // where index is base 0
            let ptr := mload(0x40)
            mstore(0x40, add(ptr, input))
             


        }

   }

}