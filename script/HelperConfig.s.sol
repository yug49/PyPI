// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";
import {MockUSDC} from "../src/mock/MockUSDC.sol";

contract HelperConfig is Script {
    error HelperConfig__ChainIdNotSupported();

    struct NetworkConfig {
        uint256 _maxOrderTime;
        address _relayerAddress;
        uint256 _maxFullfillmentTime;
        uint16 _resolverFee;
        address _usdCoinContractAddress;
    }

    NetworkConfig public activeNetworkConfig;

    uint256 public DEFAULT_ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 public constant MAX_ORDER_TIME = 15 seconds;
    address public constant RELAYER_ADDRESS = 0xD43f127F91a190CB956Ec25640081a80Df72b8dc;
    uint256 public constant MAX_FULLFILLMENT_TIME = 1 minutes;
    uint16 public constant RESOLVER_FEE = 100; // 1% fee

    constructor() {
        if (block.chainid == 31337) {
            activeNetworkConfig = getOrCreateAnvilNetworkConfig();
        } else if (block.chainid == 421614) {
            activeNetworkConfig = getArbitrumSepoliaNetworkConfig();
        } else {
            revert HelperConfig__ChainIdNotSupported();
        }
        /// @notice For the deployment of flow, instead of scripts we have used manually method, by "forge create" and "forge verify". You can see the deployed contract address in the deployments.md file in the root directory
    }

    function getOrCreateAnvilNetworkConfig() internal returns (NetworkConfig memory _anvilNetworkConfig) {
        vm.startBroadcast(DEFAULT_ANVIL_PRIVATE_KEY);
        MockUSDC mockUSDC = new MockUSDC();
        vm.stopBroadcast();

        _anvilNetworkConfig = NetworkConfig({
            _maxOrderTime: MAX_ORDER_TIME,
            _relayerAddress: RELAYER_ADDRESS,
            _maxFullfillmentTime: MAX_FULLFILLMENT_TIME,
            _resolverFee: RESOLVER_FEE,
            _usdCoinContractAddress: address(mockUSDC)
        });
    }

    function getArbitrumSepoliaNetworkConfig() internal pure returns (NetworkConfig memory _flowNetworkConfig) {
        _flowNetworkConfig = NetworkConfig({
            _maxOrderTime: MAX_ORDER_TIME,
            _relayerAddress: RELAYER_ADDRESS,
            _maxFullfillmentTime: MAX_FULLFILLMENT_TIME,
            _resolverFee: RESOLVER_FEE,
            _usdCoinContractAddress: 0x637A1259C6afd7E3AdF63993cA7E58BB438aB1B1
        });
    }
}
