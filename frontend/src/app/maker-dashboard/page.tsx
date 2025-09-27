'use client'

import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useSearchParams } from 'next/navigation'
import { useMakerDetails } from '@/lib/useContracts'
import CreateOrder from '@/components/CreateOrder'

export default function MakerDashboard() {
  const { address, isConnected } = useAccount()
  const searchParams = useSearchParams()
  const { isRegistered, isForeigner, identityProof, isLoading, error } = useMakerDetails(address || '')

  // Check if coming from QR scanner
  const isFromQRScan = searchParams?.get('upiAddress') && searchParams?.get('tab') === 'create'

  const handleOrderCreated = (orderId?: string) => {
    // Order created successfully - could add notification here if needed
  }

  // Only check wallet connection for normal dashboard access (not from QR scan)
  if (!isConnected && !isFromQRScan) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Maker Dashboard</h1>
            <p className="text-gray-600 mb-8">Connect your wallet to access the maker dashboard</p>
            
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-gray-600">Please connect your wallet to continue</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Skip loading checks when coming from QR scan - go directly to form
  if (isLoading && !isFromQRScan) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Maker Dashboard</h1>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading maker details...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Maker Dashboard</h1>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">Error loading maker details: {error.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Skip registration check when coming from QR scan - allow direct access to create order
  if (!isRegistered && !isFromQRScan) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Maker Dashboard</h1>
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Not Registered as Maker</h2>
              <p className="text-gray-600 mb-6">You need to be registered as a maker to access this dashboard.</p>
              <button
                onClick={() => window.location.href = '/register-maker'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Register as Maker
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {isFromQRScan ? 'Create Your Order' : 'Maker Dashboard'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isFromQRScan ? 'Complete the order for your scanned QR code' : 'Manage your orders and create new ones'}
          </p>
          
          {/* Maker Info - Show different info for QR scan users */}
          {isFromQRScan ? (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-green-800">QR Code Scanned Successfully!</h3>
                  <p className="text-sm text-green-700">UPI Address: <span className="font-mono bg-green-100 px-2 py-1 rounded">{searchParams?.get('upiAddress')}</span></p>
                  {searchParams?.get('amount') && (
                    <p className="text-sm text-green-700">Amount: ₹{searchParams?.get('amount')}</p>
                  )}
                  {searchParams?.get('payeeName') && (
                    <p className="text-sm text-green-700">Payee: {searchParams?.get('payeeName')}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">Ready to Create Order</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Maker Details</h3>
                  <p className="text-sm text-gray-600">Address: {address}</p>
                  <p className="text-sm text-gray-600">
                    Type: {isForeigner ? 'International' : 'Domestic'}
                  </p>
                  {identityProof && (
                    <p className="text-sm text-gray-600">
                      {isForeigner ? 'Identity Proof' : 'UPI Address'}: {identityProof}
                    </p>
                  )}
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-sm text-green-600 font-medium">Verified Maker</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-6">
          <CreateOrder onOrderCreated={handleOrderCreated} />
        </div>
      </div>
    </div>
  )
}