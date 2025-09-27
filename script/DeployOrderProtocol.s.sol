// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {OrderProtocol} from "../src/OrderProtocol.sol";
import {MakerRegistry} from "../src/MakerRegistry.sol";
import {ResolverRegistry} from "../src/ResolverRegistry.sol";

contract DeployOrderProtocol is Script {
    constructor() {}

    function run()
        external
        returns (
            OrderProtocol orderProtocol,
            MakerRegistry makerRegistry,
            ResolverRegistry resolverRegistry,
            HelperConfig helperConfig
        )
    {
        /// @notice For the deployment of flow, instead of scripts we have used manually method, by "forge create" and "forge verify". You can see the deployed contract address in the deployments.md file in the root directory

        helperConfig = new HelperConfig();
        (
            uint256 maxOrderTime,
            address relayerAddress,
            uint256 maxFullfillmentTime,
            uint16 resolverFee,
            address usdCoinContractAddress
        ) = helperConfig.activeNetworkConfig();

        vm.startBroadcast();
        makerRegistry = new MakerRegistry();
        resolverRegistry = new ResolverRegistry(usdCoinContractAddress);
        
        orderProtocol = new OrderProtocol(
            maxOrderTime,
            address(resolverRegistry),
            relayerAddress,
            maxFullfillmentTime,
            resolverFee,
            address(makerRegistry),
            usdCoinContractAddress
        );
        vm.stopBroadcast();

        console.log("Order Protocol deployed to:", address(orderProtocol));
        console.log("Maker Registry deployed to:", address(makerRegistry));
        console.log("Resolver Registry deployed to:", address(resolverRegistry));
    }
}
