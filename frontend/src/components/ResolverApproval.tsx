'use client'

import React from 'react'
import { useAccount } from 'wagmi'
import { useResolverApproval, usePyusdFaucet, formatTokenAmount } from '@/lib/useContracts'

export default function ResolverApproval() {
  const { address, isConnected } = useAccount()
  const {
    approveStaking,
    formattedStakingAmount,
    hasEnoughBalance,
    needsApproval,
    currentAllowance,
    balance,
    isResolver,
    isLoading,
    error,
    refetch
  } = useResolverApproval()
  
  const {
    claimFromFaucet,
    formattedFaucetAmount,
    isLoading: isFaucetLoading,
    error: faucetError
  } = usePyusdFaucet()

  if (!isConnected) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Wallet to Apply as Resolver</h3>
        <p className="text-gray-600">
          Please connect your wallet to approve PYUSD staking and apply to become a resolver.
        </p>
      </div>
    )
  }

  const isAlreadyApproved = currentAllowance !== undefined && !needsApproval

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Apply to be Resolver</h3>
          <p className="text-sm text-gray-600">Approve PYUSD staking to become eligible as a resolver</p>
        </div>
      </div>

      {/* Staking Requirements */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <h4 className="font-medium text-blue-800 mb-2">Staking Requirements</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-blue-700">Required Stake:</span>
            <span className="font-medium text-blue-800">{formattedStakingAmount} PYUSD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-blue-700">Your Balance:</span>
            <span className={`font-medium ${hasEnoughBalance ? 'text-green-600' : 'text-red-600'}`}>
              {balance ? formatTokenAmount(balance, 6) : '0'} PYUSD
            </span>
          </div>
          {currentAllowance !== undefined && (
            <div className="flex justify-between">
              <span className="text-blue-700">Current Allowance:</span>
              <span className="font-medium text-blue-800">
                {formatTokenAmount(currentAllowance, 6)} PYUSD
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status and Action */}
      {!hasEnoughBalance && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-3">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700 font-medium">Insufficient Balance</span>
          </div>
          <p className="text-red-600 text-sm mb-3">
            You need {formattedStakingAmount} PYUSD to stake as a resolver. 
            Use the test faucet below to get PYUSD tokens.
          </p>
          <button
            onClick={async () => {
              await claimFromFaucet()
              // Wait a moment and refetch balance
              setTimeout(() => refetch(), 3000)
            }}
            disabled={isFaucetLoading}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isFaucetLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting PYUSD...
              </div>
            ) : (
              `🚰 Get ${formattedFaucetAmount} PYUSD from Faucet`
            )}
          </button>
        </div>
      )}

      {isResolver && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-purple-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-purple-700 font-medium">Active Resolver</span>
          </div>
          <p className="text-purple-600 text-sm mt-1">
            🎉 Congratulations! You are already registered as a resolver. Your stake of {formattedStakingAmount} PYUSD is active.
          </p>
        </div>
      )}

      {!isResolver && isAlreadyApproved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-700 font-medium">Approval Complete</span>
          </div>
          <p className="text-green-600 text-sm mt-1">
            You have successfully approved {formattedStakingAmount} PYUSD for staking. 
            An admin can now add you as a resolver, and your stake will be automatically deducted.
          </p>
        </div>
      )}

      {/* Error Display */}
      {(error || faucetError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-red-700 font-medium">Error</span>
          </div>
          <p className="text-red-600 text-sm mt-1">
            {error?.message || faucetError?.message}
          </p>
        </div>
      )}

      {/* Action Button */}
      <div className="flex gap-3">
        {isResolver && (
          <div className="flex-1 bg-purple-100 text-purple-800 py-3 px-6 rounded-lg font-medium text-center">
            🎯 Active Resolver - No Action Needed
          </div>
        )}

        {!isResolver && needsApproval && hasEnoughBalance && (
          <button
            onClick={approveStaking}
            disabled={isLoading}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Approving...
              </div>
            ) : (
              `Approve ${formattedStakingAmount} PYUSD for Staking`
            )}
          </button>
        )}

        {!isResolver && isAlreadyApproved && (
          <div className="flex-1 bg-green-100 text-green-800 py-3 px-6 rounded-lg font-medium text-center">
            ✅ Ready for Admin Approval
          </div>
        )}

        {!isResolver && !hasEnoughBalance && (
          <button
            disabled
            className="flex-1 bg-gray-300 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
          >
            Insufficient PYUSD Balance
          </button>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h5 className="text-sm font-medium text-gray-800 mb-2">How to Become a Resolver:</h5>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li><strong>Get PYUSD:</strong> Use the faucet above to get {formattedStakingAmount} PYUSD tokens</li>
          <li><strong>Approve Staking:</strong> Click the approval button to allow the contract to use your PYUSD</li>
          <li><strong>Wait for Admin:</strong> An administrator will add you as a resolver, automatically deducting the stake</li>
          <li><strong>Start Resolving:</strong> Once approved, you can accept and resolve orders on the platform</li>
        </ol>
        <p className="text-xs text-gray-500 mt-2">
          <strong>Note:</strong> Your tokens remain in your wallet until you are officially registered as a resolver by an admin.
        </p>
      </div>
    </div>
  )
}