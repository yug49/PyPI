import { useState, useEffect } from 'react'

interface CoinGeckoResponse {
  'usd-coin': {
    inr: number
  }
}

export function useCoinPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchPrice = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=inr'
      )
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data: CoinGeckoResponse = await response.json()
      
      if (data['usd-coin'] && data['usd-coin'].inr) {
        setPrice(data['usd-coin'].inr)
        setLastUpdated(new Date())
      } else {
        throw new Error('Invalid API response format')
      }
    } catch (err) {
      console.error('Error fetching USD Coin price:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch price')
      // Fallback to a default price if API fails
      setPrice(85) // Default fallback price
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrice()
    
    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const refresh = () => {
    fetchPrice()
  }

  return {
    price,
    loading,
    error,
    lastUpdated,
    refresh
  }
}