// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../lib/forge-std/src/Script.sol";
import {MockPYUSD} from "../src/mock/MockPYUSD.sol";

contract HelperConfig is Script {
    error HelperConfig__ChainIdNotSupported();

    struct NetworkConfig {
        uint256 _deployerKey;
        uint256 _maxOrderTime;
        address _relayerAddress;
        uint256 _maxFullfillmentTime;
        uint16 _resolverFee;
        address _pyusdContractAddress;
    }

    NetworkConfig public activeNetworkConfig;

    uint256 public DEFAULT_ANVIL_PRIVATE_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 public constant MAX_ORDER_TIME = 15 seconds;
    address public constant RELAYER_ADDRESS = address(0x123);
    uint256 public constant MAX_FULLFILLMENT_TIME = 1 minutes;
    uint16 public constant RESOLVER_FEE = 100; // 1% fee

    constructor() {
        if (block.chainid == 31337) {
            activeNetworkConfig = getOrCreateAnvilNetworkConfig();
        } else if (block.chainid == 4801) {
            activeNetworkConfig = getFlowNetworkConfig();
        } else {
            revert HelperConfig__ChainIdNotSupported();
        }
    }

    function getOrCreateAnvilNetworkConfig() internal returns (NetworkConfig memory _anvilNetworkConfig) {
        // Check to see if we set an active network config
        if (activeNetworkConfig._deployerKey == DEFAULT_ANVIL_PRIVATE_KEY) {
            return activeNetworkConfig;
        }

        // Deploy mock PYUSD for local testing
        vm.startBroadcast(DEFAULT_ANVIL_PRIVATE_KEY);
        MockPYUSD mockPyusd = new MockPYUSD();
        vm.stopBroadcast();

        _anvilNetworkConfig = NetworkConfig({
            _deployerKey: DEFAULT_ANVIL_PRIVATE_KEY,
            _maxOrderTime: MAX_ORDER_TIME,
            _relayerAddress: RELAYER_ADDRESS,
            _maxFullfillmentTime: MAX_FULLFILLMENT_TIME,
            _resolverFee: RESOLVER_FEE,
            _pyusdContractAddress: address(mockPyusd)
        });
    }

    function getFlowNetworkConfig() internal view returns (NetworkConfig memory _flowNetworkConfig) {
        _flowNetworkConfig = NetworkConfig({
            _deployerKey: vm.envUint("PRIVATE_KEY"),
            _maxOrderTime: MAX_ORDER_TIME,
            _relayerAddress: RELAYER_ADDRESS,
            _maxFullfillmentTime: MAX_FULLFILLMENT_TIME,
            _resolverFee: RESOLVER_FEE,
            _pyusdContractAddress: 0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE // Real PYUSD address on Flow
        });
    }
}
