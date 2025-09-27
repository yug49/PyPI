import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'

export interface MakerSettings {
  defaultStartPricePercentage: string
  defaultEndPricePercentage: string
}

const DEFAULT_SETTINGS: MakerSettings = {
  defaultStartPricePercentage: '5',
  defaultEndPricePercentage: '2'
}

export function useMakerSettings() {
  const { address } = useAccount()
  const [settings, setSettings] = useState<MakerSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    if (address) {
      const savedSettings = localStorage.getItem(`makerSettings_${address}`)
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings))
        } catch (error) {
          console.error('Failed to load maker settings:', error)
          setSettings(DEFAULT_SETTINGS)
        }
      }
    }
  }, [address])

  const updateSettings = async (newSettings: Partial<MakerSettings>) => {
    if (!address) return false

    setLoading(true)
    try {
      const updatedSettings = { ...settings, ...newSettings }
      localStorage.setItem(`makerSettings_${address}`, JSON.stringify(updatedSettings))
      setSettings(updatedSettings)
      return true
    } catch (error) {
      console.error('Failed to save maker settings:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const resetSettings = async () => {
    if (!address) return false

    setLoading(true)
    try {
      localStorage.removeItem(`makerSettings_${address}`)
      setSettings(DEFAULT_SETTINGS)
      return true
    } catch (error) {
      console.error('Failed to reset maker settings:', error)
      return false
    } finally {
      setLoading(false)
    }
  }

  const getDefaultValues = () => {
    return {
      defaultStartPricePercentage: settings.defaultStartPricePercentage || '',
      defaultEndPricePercentage: settings.defaultEndPricePercentage || ''
    }
  }

  return {
    settings,
    loading,
    updateSettings,
    resetSettings,
    getDefaultValues
  }
}