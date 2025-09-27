const ResolverRegistryAddress = "0xB39F0F6eD29B4502c199171E2d483fCe05E0f5b2";

const ResolverRegistryABI = [
        {
            "type": "constructor",
            "inputs": [
                {
                    "name": "_usdCoinContractAddress",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "addResolver",
            "inputs": [
                {
                    "name": "resolver",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "isResolver",
            "inputs": [
                {
                    "name": "resolver",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "owner",
            "inputs": [],
            "outputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "removeResolver",
            "inputs": [
                {
                    "name": "resolver",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "renounceOwnership",
            "inputs": [],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "resolveDispute",
            "inputs": [
                {
                    "name": "resolver",
                    "type": "address",
                    "internalType": "address"
                },
                {
                    "name": "amount",
                    "type": "uint256",
                    "internalType": "uint256"
                },
                { "name": "to", "type": "address", "internalType": "address" }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "function",
            "name": "s_resolvers",
            "inputs": [
                { "name": "", "type": "address", "internalType": "address" }
            ],
            "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
            "stateMutability": "view"
        },
        {
            "type": "function",
            "name": "transferOwnership",
            "inputs": [
                {
                    "name": "newOwner",
                    "type": "address",
                    "internalType": "address"
                }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
        },
        {
            "type": "event",
            "name": "OwnershipTransferred",
            "inputs": [
                {
                    "name": "previousOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                },
                {
                    "name": "newOwner",
                    "type": "address",
                    "indexed": true,
                    "internalType": "address"
                }
            ],
            "anonymous": false
        },
        {
            "type": "error",
            "name": "OwnableInvalidOwner",
            "inputs": [
                {
                    "name": "owner",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "OwnableUnauthorizedAccount",
            "inputs": [
                {
                    "name": "account",
                    "type": "address",
                    "internalType": "address"
                }
            ]
        },
        {
            "type": "error",
            "name": "ResolverRegistry__ResolverAlreadyExists",
            "inputs": []
        },
        {
            "type": "error",
            "name": "ResolverRegistry__ResolverDoesNotExists",
            "inputs": []
        }
    ];

export { ResolverRegistryAddress, ResolverRegistryABI };