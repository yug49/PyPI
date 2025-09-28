// Network configurations for contracts
export type Network = 'flow' | 'arbitrum';

export const NETWORK_CONFIGS = {
  flow: {
    name: 'Flow EVM Testnet',
    chainId: 545,
    contracts: {
      MAKER_REGISTRY: '0x40F05c21eE1ab02B1Ddc11D327253CEdeE5D7D55',
      RESOLVER_REGISTRY: '0xB39F0F6eD29B4502c199171E2d483fCe05E0f5b2',
      ORDER_PROTOCOL: '0x756523eDF6FfC690361Df3c61Ec3719F77e9Aa1a',
      MOCK_USDC: '0xAC49Bd1e5877EAB0529cB9E3beaAAAF3dF67DE9f'
    },
    rpcUrl: 'https://testnet.evm.nodes.onflow.org',
    blockExplorer: 'https://evm-testnet.flowscan.io'
  },
  arbitrum: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    contracts: {
      MAKER_REGISTRY: '0x40F05c21eE1ab02B1Ddc11D327253CEdeE5D7D55',
      RESOLVER_REGISTRY: '0xAC49Bd1e5877EAB0529cB9E3beaAAAF3dF67DE9f',
      ORDER_PROTOCOL: '0xB39F0F6eD29B4502c199171E2d483fCe05E0f5b2',
      PYUSD: '0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1'
    },
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    blockExplorer: 'https://sepolia.arbiscan.io'
  }
} as const;

// Default network (Flow for backward compatibility)
export const DEFAULT_NETWORK: Network = 'flow';

/**
 * Get contract address for a specific network and contract
 */
export function getContractAddress(
  contractName: keyof typeof NETWORK_CONFIGS[Network]['contracts'],
  network: Network = DEFAULT_NETWORK
): string {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  
  const address = config.contracts[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} not found for network ${network}`);
  }
  
  return address;
}

/**
 * Get network configuration
 */
export function getNetworkConfig(network: Network = DEFAULT_NETWORK) {
  const config = NETWORK_CONFIGS[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  return config;
}

/**
 * Get all supported networks
 */
export function getSupportedNetworks(): Network[] {
  return Object.keys(NETWORK_CONFIGS) as Network[];
}