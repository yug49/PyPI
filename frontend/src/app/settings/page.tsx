'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMakerDetails } from '@/lib/useContracts'
import { useMakerSettings } from '@/lib/useMakerSettings'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const { address, isConnected } = useAccount()
  const { isRegistered } = useMakerDetails(address || '')
  const { settings, loading, updateSettings, resetSettings } = useMakerSettings()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    defaultStartPricePercentage: '5',
    defaultEndPricePercentage: '2'
  })
  const [saved, setSaved] = useState(false)

  // Redirect if not connected or not registered
  useEffect(() => {
    if (!isConnected || (isConnected && !isRegistered)) {
      router.push('/')
    }
  }, [isConnected, isRegistered, router])

  // Update form data when settings change
  useEffect(() => {
    setFormData({
      defaultStartPricePercentage: settings.defaultStartPricePercentage,
      defaultEndPricePercentage: settings.defaultEndPricePercentage
    })
  }, [settings])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setSaved(false)
  }

  const handleSave = async () => {
    if (!address || !isRegistered) return

    const success = await updateSettings(formData)
    if (success) {
      setSaved(true)
      // Auto-hide the saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    }
  }

  const handleReset = async () => {
    await resetSettings()
    setSaved(false)
  }

  if (!isConnected || !isRegistered) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Maker Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure your default premium percentages for order pricing
            </p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Start Price Percentage */}
            <div>
              <label htmlFor="defaultStartPricePercentage" className="block text-sm font-medium text-gray-700 mb-2">
                Start Price Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="defaultStartPricePercentage"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="5"
                  value={formData.defaultStartPricePercentage}
                  onChange={(e) => handleInputChange('defaultStartPricePercentage', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-1">
                Percentage above market rate for starting price (Dutch auction starts high)
              </p>
            </div>

            {/* End Price Percentage */}
            <div>
              <label htmlFor="defaultEndPricePercentage" className="block text-sm font-medium text-gray-700 mb-2">
                End Price Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="defaultEndPricePercentage"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="2"
                  value={formData.defaultEndPricePercentage}
                  onChange={(e) => handleInputChange('defaultEndPricePercentage', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="text-xs text-blue-500 mt-1">
                Percentage below market rate for ending price (Dutch auction ends lower)
              </p>
              <p className="text-xs text-red-500 mt-1">
                <strong>Note:</strong> Start premium must be higher than end premium for Dutch auction
              </p>
            </div>

            {/* Price Validation */}
            {formData.defaultStartPricePercentage && formData.defaultEndPricePercentage && 
             parseFloat(formData.defaultStartPricePercentage) <= parseFloat(formData.defaultEndPricePercentage) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Start premium should be higher than end premium for Dutch auctions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {saved && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">
                      Settings saved successfully!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Reset to Default
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">About Premium Percentages</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>These percentages will be added to the current market rate when creating orders</li>
                  <li>Example: If market rate is ₹85 and start premium is 5%, start price = ₹89.25</li>
                  <li>You can always modify the calculated prices when creating individual orders</li>
                  <li>Settings are stored locally in your browser and tied to your wallet address</li>
                  <li>For Dutch auctions, start premium should be higher than end premium</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}