// Network configurations for both Flow EVM Testnet and Arbitrum Sepolia
const networkConfigs = {
    flow: {
        name: "Flow EVM Testnet",
        id: 545,
        rpcUrl: process.env.RPC_URL, // Keep existing variable name
        contracts: {
            OrderProtocol: "0x756523eDF6FfC690361Df3c61Ec3719F77e9Aa1a",
            MakerRegistry: "0x40F05c21eE1ab02B1Ddc11D327253CEdeE5D7D55",
            ResolverRegistry: "0xB39F0F6eD29B4502c199171E2d483fCe05E0f5b2",
            MockUSDC: "0xAC49Bd1e5877EAB0529cB9E3beaAAAF3dF67DE9f",
        },
        nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
        blockExplorer: "https://evm-testnet.flowscan.io",
    },
    arbitrum: {
        name: "Arbitrum Sepolia",
        id: 421614,
        rpcUrl: process.env.ARBITRUM_RPC_URL,
        contracts: {
            OrderProtocol: "0xB39F0F6eD29B4502c199171E2d483fCe05E0f5b2",
            MakerRegistry: "0x40F05c21eE1ab02B1Ddc11D327253CEdeE5D7D55",
            ResolverRegistry: "0xAC49Bd1e5877EAB0529cB9E3beaAAAF3dF67DE9f",
            PyUSD: "0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1",
        },
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        blockExplorer: "https://sepolia.arbiscan.io",
    },
};

// Default to Flow EVM Testnet (maintain backward compatibility)
const DEFAULT_NETWORK = "flow";

/**
 * Get network configuration for a specific network
 * @param {string} networkName - 'flow' or 'arbitrum'
 * @returns {object} Network configuration
 */
function getNetworkConfig(networkName = DEFAULT_NETWORK) {
    const config = networkConfigs[networkName];
    if (!config) {
        throw new Error(`Unknown network: ${networkName}`);
    }
    return config;
}

/**
 * Get the default network configuration (Flow EVM Testnet)
 * Keeps backward compatibility with existing code
 * @returns {object} Default network configuration
 */
function getDefaultNetworkConfig() {
    return getNetworkConfig(DEFAULT_NETWORK);
}

/**
 * Get contract address for a specific network and contract
 * @param {string} contractName - Name of the contract
 * @param {string} networkName - Network name (default: flow)
 * @returns {string} Contract address
 */
function getContractAddress(contractName, networkName = DEFAULT_NETWORK) {
    const config = getNetworkConfig(networkName);
    return config.contracts[contractName];
}

/**
 * Create viem chain configuration for a specific network
 * @param {string} networkName - Network name
 * @returns {object} Viem chain configuration
 */
function createChainConfig(networkName = DEFAULT_NETWORK) {
    const config = getNetworkConfig(networkName);

    return {
        id: config.id,
        name: config.name,
        network: config.name.toLowerCase().replace(/ /g, "-"),
        nativeCurrency: config.nativeCurrency,
        rpcUrls: {
            default: { http: [config.rpcUrl] },
            public: { http: [config.rpcUrl] },
        },
        blockExplorers: {
            default: {
                name: `${config.name} Explorer`,
                url: config.blockExplorer,
            },
        },
    };
}

module.exports = {
    networkConfigs,
    DEFAULT_NETWORK,
    getNetworkConfig,
    getDefaultNetworkConfig,
    getContractAddress,
    createChainConfig,
};
