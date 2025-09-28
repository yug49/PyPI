'use client'

import { useAccount, useWriteContract, useReadContract, useChainId } from 'wagmi'
import { CONTRACTS, getContractAddressForNetwork } from './contracts'
import { isAddress, parseUnits, formatUnits, Address } from 'viem'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { getNetworkTypeFromChainId } from './networkUtils'

// Hook to get current network contract addresses
export function useNetworkContracts() {
  const chainId = useChainId()
  const network = getNetworkTypeFromChainId(chainId) || 'flow'
  
  return useMemo(() => ({
    orderProtocol: getContractAddressForNetwork('ORDER_PROTOCOL', network),
    makerRegistry: getContractAddressForNetwork('MAKER_REGISTRY', network),
    resolverRegistry: getContractAddressForNetwork('RESOLVER_REGISTRY', network),
    network
  }), [network])
}

// Common tokens for testing - network aware
export const getCommonTokens = (network: 'flow' | 'arbitrum' = 'flow') => {
  if (network === 'arbitrum') {
    return [
      {
        address: '0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1' as const,
        name: 'PyUSD',
        symbol: 'PYUSD',
        decimals: 6
      }
    ];
  }
  return [
    {
      address: '0xAC49Bd1e5877EAB0529cB9E3beaAAAF3dF67DE9f' as const,
      name: 'Mock USDC',
      symbol: 'USDC',
      decimals: 6
    }
  ];
};

// Backward compatibility
export const COMMON_TOKENS = getCommonTokens('flow');

// Network-aware token hook
export function useNetworkToken() {
  const { chainId } = useAccount()
  
  const getCurrentToken = () => {
    if (chainId === 421614) { // Arbitrum Sepolia
      return getCommonTokens('arbitrum')[0]
    }
    return getCommonTokens('flow')[0] // Default to Flow
  }
  
  return getCurrentToken()
}

interface OrderData {
  amount: string;
  startPrice: string;
  endPrice: string;
  recipientUpiAddress: string;
}

// Hook to read resolver fee from contract
export function useResolverFee() {
  const { orderProtocol } = useNetworkContracts()
  const { data: resolverFee, isLoading, error } = useReadContract({
    address: orderProtocol as Address,
    abi: CONTRACTS.ORDER_PROTOCOL.abi,
    functionName: 'i_resolverFee',
    query: {
      staleTime: 1000 * 60 * 10, // 10 minutes - fee rarely changes
    }
  })

  return {
    resolverFee: resolverFee as number,
    isLoading,
    error
  }
}

// Utility function to calculate the exact token approval amount needed
// This matches the smart contract calculation in createOrder function with proper decimal handling
export function calculateApprovalAmount(
  inrAmount: string,      // Amount in INR (user input)
  endPrice: string,       // End price in INR per token (user input)
  resolverFee: number,    // Resolver fee in basis points (from contract)
  tokenDecimals: number   // Token decimals
): bigint {
  try {
    // Convert inputs to BigInt with proper decimals
    // Amount should be in 18 decimals (INR amount - always 18 decimals in contract)
    const amount = parseUnits(inrAmount, 18)
    
    // End price should be in 18 decimals (INR per token - always 18 decimals in contract)
    const endPriceBig = parseUnits(endPrice, 18)
    
    // Calculate token amount using the new contract logic:
    // tokenAmount = (inrAmount * 10^tokenDecimals) / priceInrPerToken
    const tokenAmount = (amount * (BigInt(10) ** BigInt(tokenDecimals))) / endPriceBig
    
    // Calculate resolver fee on the token amount
    // resolverFeeAmount = (tokenAmount * resolverFee) / 10000
    const feeAmount = (tokenAmount * BigInt(resolverFee)) / BigInt(10000)
    
    // Total amount to approve = tokenAmount + feeAmount
    const totalPayableAmount = tokenAmount + feeAmount
    
    return totalPayableAmount
  } catch (error) {
    console.error('Error calculating approval amount:', error)
    throw new Error('Failed to calculate approval amount')
  }
}

// Hook for reading maker details with optimized queries
export function useMakerDetails(makerAddress: string) {
  const isValidAddress = useMemo(() => isAddress(makerAddress), [makerAddress])
  
  const { makerRegistry } = useNetworkContracts()
  const { data: isRegistered, isLoading: isLoadingRegistered, error: registeredError } = useReadContract({
    address: makerRegistry as Address,
    abi: CONTRACTS.MAKER_REGISTRY.abi,
    functionName: 'isMaker',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: (failureCount, error: Error) => {
        if (error?.message?.includes('rate limit')) {
          return failureCount < 1 // Only retry once for rate limits
        }
        return failureCount < 2
      }
    }
  })

  const { data: isForeigner, isLoading: isLoadingForeigner } = useReadContract({
    address: makerRegistry as Address,
    abi: CONTRACTS.MAKER_REGISTRY.abi,
    functionName: 's_isForiegner',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress && Boolean(isRegistered),
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  })

  const { data: upiAddress, isLoading: isLoadingUpi } = useReadContract({
    address: makerRegistry as Address,
    abi: CONTRACTS.MAKER_REGISTRY.abi,
    functionName: 's_upiAddress',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress && Boolean(isRegistered) && isForeigner === false,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  })

  const { data: proof, isLoading: isLoadingProof } = useReadContract({
    address: makerRegistry as Address,
    abi: CONTRACTS.MAKER_REGISTRY.abi,
    functionName: 's_proof',
    args: isValidAddress ? [makerAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress && Boolean(isRegistered) && isForeigner === true,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  })

  return {
    isRegistered: Boolean(isRegistered),
    isForeigner: Boolean(isForeigner),
    identityProof: isForeigner ? (proof as string) : (upiAddress as string),
    isLoading: isLoadingRegistered || isLoadingForeigner || isLoadingUpi || isLoadingProof,
    error: registeredError
  }
}

// Hook for checking resolver status with better caching
export function useResolverStatus(resolverAddress: string) {
  const isValidAddress = useMemo(() => isAddress(resolverAddress), [resolverAddress])
  const { resolverRegistry } = useNetworkContracts()

  const { data: isResolver, isLoading, error } = useReadContract({
    address: resolverRegistry as Address,
    abi: CONTRACTS.RESOLVER_REGISTRY.abi,
    functionName: 'isResolver',
    args: isValidAddress ? [resolverAddress as `0x${string}`] : undefined,
    query: { 
      enabled: isValidAddress,
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: (failureCount, error: Error) => {
        if (error?.message?.includes('rate limit')) {
          return failureCount < 1
        }
        return failureCount < 2
      }
    }
  })

  return {
    isResolver: Boolean(isResolver),
    isLoading,
    error
  }
}

// Hook for admin contract operations with better error handling
export function useAdminOperations() {
  const { address } = useAccount()
  const { makerRegistry, resolverRegistry } = useNetworkContracts()
  const { writeContract, isPending, error, isSuccess, reset } = useWriteContract()

  const handleContractWrite = async (contractCall: () => void) => {
    try {
      reset() // Clear previous errors
      await contractCall()
    } catch (err: unknown) {
      const error = err as Error
      // Handle rate limiting specifically
      if (error?.message?.includes('rate limit')) {
        throw new Error('Network is busy. Please wait a moment and try again.')
      }
      throw err
    }
  }

  const registerMaker = async (
    makerAddress: string,
    identityProof: string,
    isForeigner: boolean
  ) => {
    if (!isAddress(makerAddress)) {
      throw new Error('Invalid maker address')
    }

    return handleContractWrite(() => 
      writeContract({
        address: makerRegistry as Address,
        abi: CONTRACTS.MAKER_REGISTRY.abi,
        functionName: 'registerMaker',
        args: [identityProof, makerAddress as `0x${string}`, isForeigner]
      })
    )
  }

  const editMaker = async (
    makerAddress: string,
    newProof: string
  ) => {
    if (!isAddress(makerAddress)) {
      throw new Error('Invalid maker address')
    }

    return handleContractWrite(() =>
      writeContract({
        address: makerRegistry as Address,
        abi: CONTRACTS.MAKER_REGISTRY.abi,
        functionName: 'editMaker',
        args: [makerAddress as `0x${string}`, newProof]
      })
    )
  }

  const deleteMaker = async (makerAddress: string) => {
    if (!isAddress(makerAddress)) {
      throw new Error('Invalid maker address')
    }

    return handleContractWrite(() =>
      writeContract({
        address: makerRegistry as Address,
        abi: CONTRACTS.MAKER_REGISTRY.abi,
        functionName: 'editMaker',
        args: [makerAddress as `0x${string}`, ''] // Empty string deletes the maker
      })
    )
  }

  const addResolver = async (resolverAddress: string) => {
    if (!isAddress(resolverAddress)) {
      throw new Error('Invalid resolver address')
    }

    return handleContractWrite(() =>
      writeContract({
        address: resolverRegistry as Address,
        abi: CONTRACTS.RESOLVER_REGISTRY.abi,
        functionName: 'addResolver',
        args: [resolverAddress as `0x${string}`]
      })
    )
  }

  const removeResolver = async (resolverAddress: string) => {
    if (!isAddress(resolverAddress)) {
      throw new Error('Invalid resolver address')
    }

    return handleContractWrite(() =>
      writeContract({
        address: resolverRegistry as Address,
        abi: CONTRACTS.RESOLVER_REGISTRY.abi,
        functionName: 'removeResolver',
        args: [resolverAddress as `0x${string}`]
      })
    )
  }

  // Token management functions removed - MockUSDC is hardcoded in the new contract

  return {
    registerMaker,
    editMaker,
    deleteMaker,
    addResolver,
    removeResolver,
    isPending,
    error,
    isSuccess,
    reset,
    connectedAddress: address
  }
}

// Hook for ERC20 token operations
export function useERC20(tokenAddress?: Address, spender?: Address) {
  const { address: userAddress } = useAccount()
  const { orderProtocol } = useNetworkContracts()
  
  // Default spender is OrderProtocol for backward compatibility
  const spenderAddress = spender || orderProtocol
  
  const balanceResult = useReadContract({
    address: tokenAddress,
    abi: CONTRACTS.ERC20.abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
      staleTime: 10000,
      refetchInterval: 10000
    }
  })

  const allowanceResult = useReadContract({
    address: tokenAddress,
    abi: CONTRACTS.ERC20.abi,
    functionName: 'allowance',
    args: userAddress ? [userAddress, spenderAddress as Address] : undefined,
    query: {
      enabled: !!tokenAddress && !!userAddress,
      staleTime: 5000,
      refetchInterval: 5000
    }
  })

  const decimalsResult = useReadContract({
    address: tokenAddress,
    abi: CONTRACTS.ERC20.abi,
    functionName: 'decimals',
    query: {
      enabled: !!tokenAddress,
      staleTime: 300000 // 5 minutes - decimals don't change
    }
  })

  const { writeContract, error: approveError, isPending: approvePending } = useWriteContract()

  const approve = useCallback(async (amount: bigint) => {
    if (!tokenAddress) throw new Error('Token address not provided')
    
    return writeContract({
      address: tokenAddress,
      abi: CONTRACTS.ERC20.abi,
      functionName: 'approve',
      args: [spenderAddress as Address, amount]
    })
  }, [tokenAddress, writeContract, spenderAddress])

  return {
    balance: balanceResult.data,
    allowance: allowanceResult.data,
    decimals: decimalsResult.data,
    isLoading: balanceResult.isLoading || allowanceResult.isLoading || decimalsResult.isLoading,
    error: balanceResult.error || allowanceResult.error || decimalsResult.error || approveError,
    approve,
    isApproving: approvePending,
    refetch: () => {
      balanceResult.refetch()
      allowanceResult.refetch()
    }
  }
}

// Hook for creating orders
export function useCreateOrder() {
  const { orderProtocol, network } = useNetworkContracts()
  const networkToken = useNetworkToken()
  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const [isLoading, setIsLoading] = useState(false)
  const chainId = useChainId()

  const createOrder = useCallback(async (orderData: OrderData) => {
    try {
      setIsLoading(true)
      
      // Debug network selection
      console.log('🌐 Network Debug Info:')
      console.log(`Chain ID: ${chainId}`)
      console.log(`Detected Network: ${network}`)
      console.log(`OrderProtocol Address: ${orderProtocol}`)
      console.log(`Token: ${networkToken.name} (${networkToken.address})`)
      
      // According to smart contract, all amounts should be in 18 decimals:
      // _amount: INR amount in 18 decimals
      // _startPrice and _endPrice: token prices in INR in 18 decimals
      const amount = parseUnits(orderData.amount, 18) // INR amount in 18 decimals
      const startPrice = parseUnits(orderData.startPrice, 18) // Price in INR per token, 18 decimals
      const endPrice = parseUnits(orderData.endPrice, 18) // Price in INR per token, 18 decimals
      
      await writeContract({
        address: orderProtocol as Address,
        abi: CONTRACTS.ORDER_PROTOCOL.abi,
        functionName: 'createOrder',
        args: [
          amount,
          startPrice,
          endPrice,
          orderData.recipientUpiAddress
        ]
      })
      
      // Return hash from the hook state
      return hash
    } catch (err) {
      console.error('Error creating order:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [writeContract, hash])

  const saveOrderToDatabase = useCallback(async (orderData: {
    orderId: string;
    walletAddress: string;
    amount: string;
    startPrice: string;
    endPrice: string;
    recipientUpiAddress: string;
    transactionHash: string;
    blockNumber: number;
  }) => {
    try {
      const requestBody = {
        ...orderData,
        tokenAddress: networkToken.address, // Network-aware token address
        network: network // Include current network information
      }
      
      // Debug order data before sending to backend
      console.log('💾 Saving Order to Database:')
      console.log(`Network: ${network}`)
      console.log(`Token Address: ${networkToken.address}`)
      console.log(`Order ID: ${orderData.orderId}`)
      console.log('📦 Full Request Body:', requestBody)
      
      // Use the Next.js API route which proxies to the backend
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: 'Unknown error', message: errorText }
        }
        
        console.error('❌ Database save failed:')
        console.error(`Status: ${response.status}`)
        console.error(`Error Data:`, errorData)
        console.error(`Response Text:`, errorText)
        
        // Handle the case where order already exists (race condition with resolver bot)
        if (response.status === 409 && errorData.error === 'Order already exists') {
          console.log(`ℹ️ Order ${orderData.orderId} already exists in database (likely processed by resolver bot)`)
          
          // Try to fetch the existing order to return it
          try {
            const existingOrderResponse = await fetch(`/api/orders/${orderData.orderId}`)
            if (existingOrderResponse.ok) {
              const existingOrder = await existingOrderResponse.json()
              return {
                success: true,
                message: 'Order already exists and was retrieved successfully',
                data: existingOrder.data,
                wasExisting: true
              }
            }
          } catch (fetchError) {
            console.warn('Could not fetch existing order, but creation was successful on blockchain')
          }
          
          // If we can't fetch the existing order, still return success since the blockchain transaction worked
          return {
            success: true,
            message: 'Order created successfully on blockchain (database record already exists)',
            wasExisting: true
          }
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to save order to database`)
      }
      
      return await response.json()
    } catch (err) {
      console.error('Error saving order to database:', err)
      throw err
    }
  }, [])

  return {
    createOrder,
    saveOrderToDatabase,
    isLoading: isLoading || isPending,
    error,
    hash
  }
}

// Hook for resolver approval and staking
export function useResolverApproval() {
  const { address, chainId } = useAccount()
  const { resolverRegistry } = useNetworkContracts()
  const mockUsdcToken = useNetworkToken() // Network-aware token
  
  // STAKING_AMOUNT from contract: 10 MockUSDC (10 * 1e6 with 6 decimals)
  const STAKING_AMOUNT = BigInt(10 * 1e6) // 10 MockUSDC with 6 decimals
  
  const { 
    balance, 
    allowance, 
    decimals, 
    approve, 
    isApproving, 
    error: tokenError,
    refetch: refetchToken
  } = useERC20(mockUsdcToken.address, resolverRegistry as Address)

  // Check if user is already a resolver
  const { data: isResolver, isLoading: isCheckingResolver } = useReadContract({
    address: resolverRegistry as Address,
    abi: CONTRACTS.RESOLVER_REGISTRY.abi,
    functionName: 'isResolver',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      staleTime: 1000 * 30, // 30 seconds
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Check if user has enough balance
  const hasEnoughBalance = balance ? balance >= STAKING_AMOUNT : false
  
  // Check if approval is sufficient
  const needsApproval = allowance !== undefined && allowance < STAKING_AMOUNT

  const approveStaking = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!hasEnoughBalance) {
        throw new Error(`Insufficient MockUSDC balance. You need 10 MockUSDC to become a resolver.`)
      }

      console.log('Approving MockUSDC staking amount:', STAKING_AMOUNT.toString())
      await approve(STAKING_AMOUNT)
      
      // Wait a moment and then refetch to update allowance
      setTimeout(() => {
        refetchToken()
      }, 3000)
      
    } catch (err) {
      console.error('Approval failed:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [approve, hasEnoughBalance, refetchToken])

  return {
    approveStaking,
    stakingAmount: STAKING_AMOUNT,
    formattedStakingAmount: formatTokenAmount(STAKING_AMOUNT, 6), // 6 decimals for MockUSDC
    hasEnoughBalance,
    needsApproval,
    currentAllowance: allowance,
    balance,
    isResolver: Boolean(isResolver),
    isLoading: isLoading || isApproving || isCheckingResolver,
    error: error || tokenError,
    refetch: refetchToken
  }
}

// Hook for MockUSDC faucet functionality
export function useMockUsdcFaucet() {
  const { writeContract, error, isPending } = useWriteContract()
  const [isLoading, setIsLoading] = useState(false)
  const [localError, setLocalError] = useState<Error | null>(null)
  
  const mockUsdcToken = useNetworkToken() // Network-aware token
  
  // Faucet amount: 1000 MockUSDC (enough for multiple stakings)
  const FAUCET_AMOUNT = BigInt(1000 * 1e6) // 1000 MockUSDC with 6 decimals

  const claimFromFaucet = useCallback(async () => {
    try {
      setIsLoading(true)
      setLocalError(null)
      
      console.log('Claiming from MockUSDC faucet:', FAUCET_AMOUNT.toString())
      
      await writeContract({
        address: mockUsdcToken.address,
        abi: [
          {
            "type": "function",
            "name": "faucet",
            "inputs": [
              {
                "name": "amount",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          }
        ],
        functionName: 'faucet',
        args: [FAUCET_AMOUNT]
      })
      
    } catch (err) {
      console.error('Faucet claim failed:', err)
      setLocalError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [writeContract, mockUsdcToken.address])

  return {
    claimFromFaucet,
    faucetAmount: FAUCET_AMOUNT,
    formattedFaucetAmount: formatTokenAmount(FAUCET_AMOUNT, 6), // 6 decimals for MockUSDC
    isLoading: isLoading || isPending,
    error: localError || error
  }
}

// Hook for fetching orders from database
export function useOrders(walletAddress?: Address) {
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!walletAddress) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Use the Next.js API route which proxies to the backend
      const response = await fetch(`/api/orders/wallet/${walletAddress}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders from database')
      }
      
      const data = await response.json()
      setOrders(data.data?.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setIsLoading(false)
    }
  }, [walletAddress])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders
  }
}

// Hook for fetching order details from the smart contract
export function useOrderDetails(orderId: string | null) {
  const { orderProtocol } = useNetworkContracts()
  const networkToken = useNetworkToken()
  const { data: orderData, isLoading, error, refetch } = useReadContract({
    address: orderProtocol as Address,
    abi: CONTRACTS.ORDER_PROTOCOL.abi,
    functionName: 'getOrder',
    args: orderId ? [orderId as `0x${string}`] : undefined,
    query: {
      enabled: !!orderId,
      staleTime: 1000 * 30, // 30 seconds
    }
  })

  const parsedOrder = useMemo(() => {
    if (!orderData || !Array.isArray(orderData)) return null
    
    // Parse the order struct returned from contract (without token field)
    const [
      maker,
      taker,
      recipientUpiAddress,
      amount,
      startPrice,
      acceptedPrice,
      endPrice,
      startTime,
      acceptedTime,
      accepted,
      fullfilled
    ] = orderData

    return {
      maker: maker as string,
      taker: taker as string,
      recipientUpiAddress: recipientUpiAddress as string,
      amount: formatUnits(amount as bigint, 18), // INR amount is in 18 decimals
      token: networkToken.address, // Network-aware token
      startPrice: formatUnits(startPrice as bigint, 18),
      acceptedPrice: acceptedPrice ? formatUnits(acceptedPrice as bigint, 18) : '0',
      endPrice: formatUnits(endPrice as bigint, 18),
      startTime: Number(startTime),
      acceptedTime: Number(acceptedTime),
      accepted: accepted as boolean,
      fullfilled: fullfilled as boolean
    }
  }, [orderData])

  return {
    orderDetails: parsedOrder,
    isLoading,
    error,
    refetch
  }
}

// Utility functions
export function formatTokenAmount(amount: bigint | undefined, decimals: number = 18): string {
  if (!amount) return '0'
  return formatUnits(amount, decimals)
}

export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  return parseUnits(amount, decimals)
}