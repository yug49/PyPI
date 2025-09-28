// Network detection and utility functions
import { flowEvmTestnet, arbitrumSepolia } from '../components/Providers';

export type NetworkType = 'flow' | 'arbitrum';

/**
 * Get network type from chain ID
 */
export function getNetworkTypeFromChainId(chainId: number): NetworkType | null {
  switch (chainId) {
    case flowEvmTestnet.id:
      return 'flow';
    case arbitrumSepolia.id:
      return 'arbitrum';
    default:
      return null;
  }
}

/**
 * Get chain configuration from network type
 */
export function getChainFromNetworkType(networkType: NetworkType) {
  switch (networkType) {
    case 'flow':
      return flowEvmTestnet;
    case 'arbitrum':
      return arbitrumSepolia;
    default:
      throw new Error(`Unknown network type: ${networkType}`);
  }
}

/**
 * Check if chainId is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return getNetworkTypeFromChainId(chainId) !== null;
}