// Contract addresses and ABIs (Flow EVM Testnet)
export const CONTRACTS = {
  MAKER_REGISTRY: {
    address: "0x40F05c21eE1ab02B1Ddc11D327253CEdeE5D7D55" as const,
    abi: [
      {
        "type": "constructor",
        "inputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "editMaker",
        "inputs": [
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "_newProof",
            "type": "string",
            "internalType": "string"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "getProof",
        "inputs": [
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [
          { "name": "", "type": "string", "internalType": "string" },
          { "name": "", "type": "bool", "internalType": "bool" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "isMaker",
        "inputs": [
          {
            "name": "_maker",
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
        "name": "registerMaker",
        "inputs": [
          {
            "name": "_identityProof",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "_isForiegner",
            "type": "bool",
            "internalType": "bool"
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
        "name": "s_isForiegner",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_isRegistered",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_proof",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [
          { "name": "", "type": "string", "internalType": "string" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_upiAddress",
        "inputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [
          { "name": "", "type": "string", "internalType": "string" }
        ],
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
      }
    ] as const
  },
  RESOLVER_REGISTRY: {
    address: "0xB39F0F6eD29B4502c199171E2d483fCe05E0f5b2" as const,
    abi: [
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
    ] as const
  },
  ORDER_PROTOCOL: {
    address: "0x756523eDF6FfC690361Df3c61Ec3719F77e9Aa1a" as const,
    abi: [
      {
        "type": "constructor",
        "inputs": [
          {
            "name": "_maxOrderTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "_resolverRegistry",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "_relayerAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "_maxFullfillmentTime",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "_resolverFee",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "_makerRegistry",
            "type": "address",
            "internalType": "address"
          },
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
        "name": "PRECISION",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "acceptOrder",
        "inputs": [
          {
            "name": "_orderId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "_acceptedPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "_taker",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "createOrder",
        "inputs": [
          {
            "name": "_amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "_startPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "_endPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "_recipientUpiAddress",
            "type": "string",
            "internalType": "string"
          }
        ],
        "outputs": [
          {
            "name": "orderId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "fulfillOrder",
        "inputs": [
          {
            "name": "_orderId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          { "name": "_proof", "type": "string", "internalType": "string" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "getActiveOrders",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "tuple[]",
            "internalType": "struct OrderProtocol.Order[]",
            "components": [
              {
                "name": "maker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "taker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "recipientUpiAddress",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "startPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "acceptedPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "endPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "startTime",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "acceptedTime",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "accepted",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "fullfilled",
                "type": "bool",
                "internalType": "bool"
              }
            ]
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getCurrentPrice",
        "inputs": [
          {
            "name": "_orderId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "outputs": [
          { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getOrder",
        "inputs": [
          {
            "name": "_orderId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "outputs": [
          {
            "name": "",
            "type": "tuple",
            "internalType": "struct OrderProtocol.Order",
            "components": [
              {
                "name": "maker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "taker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "recipientUpiAddress",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "startPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "acceptedPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "endPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "startTime",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "acceptedTime",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "accepted",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "fullfilled",
                "type": "bool",
                "internalType": "bool"
              }
            ]
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "getOrdersByMaker",
        "inputs": [
          {
            "name": "_maker",
            "type": "address",
            "internalType": "address"
          }
        ],
        "outputs": [
          {
            "name": "",
            "type": "tuple[]",
            "internalType": "struct OrderProtocol.Order[]",
            "components": [
              {
                "name": "maker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "taker",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "recipientUpiAddress",
                "type": "string",
                "internalType": "string"
              },
              {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "startPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "acceptedPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "endPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "startTime",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "acceptedTime",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "accepted",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "fullfilled",
                "type": "bool",
                "internalType": "bool"
              }
            ]
          }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_makerRegistry",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_maxFullfillmentTime",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_maxOrderTime",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_relayerAddress",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_resolverFee",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "uint16", "internalType": "uint16" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_resolverRegistry",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "i_usdCoinContract",
        "inputs": [],
        "outputs": [
          { "name": "", "type": "address", "internalType": "address" }
        ],
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
        "name": "renounceOwnership",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "s_orderIds",
        "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "outputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "s_orders",
        "inputs": [{ "name": "", "type": "bytes32", "internalType": "bytes32" }],
        "outputs": [
          { "name": "maker", "type": "address", "internalType": "address" },
          { "name": "taker", "type": "address", "internalType": "address" },
          {
            "name": "recipientUpiAddress",
            "type": "string",
            "internalType": "string"
          },
          { "name": "amount", "type": "uint256", "internalType": "uint256" },
          { "name": "startPrice", "type": "uint256", "internalType": "uint256" },
          {
            "name": "acceptedPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          { "name": "endPrice", "type": "uint256", "internalType": "uint256" },
          { "name": "startTime", "type": "uint256", "internalType": "uint256" },
          { "name": "acceptedTime", "type": "uint256", "internalType": "uint256" },
          { "name": "accepted", "type": "bool", "internalType": "bool" },
          { "name": "fullfilled", "type": "bool", "internalType": "bool" }
        ],
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
        "name": "OrderAccepted",
        "inputs": [
          {
            "name": "orderId",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "taker",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "acceptedPrice",
            "type": "uint256",
            "indexed": false,
            "internalType": "uint256"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OrderCreated",
        "inputs": [
          {
            "name": "orderId",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "maker",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "amount",
            "type": "uint256",
            "indexed": false,
            "internalType": "uint256"
          }
        ],
        "anonymous": false
      },
      {
        "type": "event",
        "name": "OrderFullfilled",
        "inputs": [
          {
            "name": "orderId",
            "type": "bytes32",
            "indexed": true,
            "internalType": "bytes32"
          },
          {
            "name": "taker",
            "type": "address",
            "indexed": true,
            "internalType": "address"
          },
          {
            "name": "proof",
            "type": "string",
            "indexed": false,
            "internalType": "string"
          }
        ],
        "anonymous": false
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
          { "name": "owner", "type": "address", "internalType": "address" }
        ]
      },
      {
        "type": "error",
        "name": "OwnableUnauthorizedAccount",
        "inputs": [
          { "name": "account", "type": "address", "internalType": "address" }
        ]
      },
      {
        "type": "error",
        "name": "OrderProtocol__AlreadyAccepted",
        "inputs": []
      },
      {
        "type": "error",
        "name": "OrderProtocol__AlreadyFullfilled",
        "inputs": []
      },
      {
        "type": "error",
        "name": "OrderProtocol__InvalidAmount",
        "inputs": []
      },
      {
        "type": "error",
        "name": "OrderProtocol__InvalidPrice",
        "inputs": []
      },
      {
        "type": "error",
        "name": "OrderProtocol__InvalidToken",
        "inputs": []
      },
      {
        "type": "error",
        "name": "OrderProtocol__MaxFullfillmentTimeReached",
        "inputs": []
      },
      { "type": "error", "name": "OrderProtocol__NotAMaker", "inputs": [] },
      {
        "type": "error",
        "name": "OrderProtocol__NotAResolver",
        "inputs": []
      },
      { "type": "error", "name": "OrderProtocol__NotRelayer", "inputs": [] },
      {
        "type": "error",
        "name": "OrderProtocol__OrderDoesNotExists",
        "inputs": []
      },
      {
        "type": "error",
        "name": "OrderProtocol__OrderNotAcceptedYet",
        "inputs": []
      }
    ] as const
  },
  ERC20: {
    abi: [
      {
        "type": "function",
        "name": "allowance",
        "inputs": [
          { "name": "owner", "type": "address", "internalType": "address" },
          { "name": "spender", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "approve",
        "inputs": [
          { "name": "spender", "type": "address", "internalType": "address" },
          { "name": "amount", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "nonpayable"
      },
      {
        "type": "function",
        "name": "balanceOf",
        "inputs": [
          { "name": "account", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "decimals",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint8", "internalType": "uint8" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "name",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string", "internalType": "string" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "symbol",
        "inputs": [],
        "outputs": [{ "name": "", "type": "string", "internalType": "string" }],
        "stateMutability": "view"
      },
      {
        "type": "function",
        "name": "totalSupply",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
      }
    ] as const
  }
} as const;