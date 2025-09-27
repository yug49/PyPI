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
        helperConfig = new HelperConfig();

        (
            uint256 maxOrderTime,
            uint256 maxFullfillmentTime,
            address relayerAddress,
            uint256 deployerKey,
            uint16 resolverFee,
            address pyusdContractAddress
        ) = helperConfig.activeNetworkConfig();

        vm.startBroadcast(deployerKey);
        makerRegistry = new MakerRegistry();
        resolverRegistry = new ResolverRegistry(pyusdContractAddress);
        orderProtocol = new OrderProtocol(
            maxOrderTime,
            address(resolverRegistry),
            relayerAddress,
            maxFullfillmentTime,
            resolverFee,
            address(makerRegistry),
            pyusdContractAddress
        );
        vm.stopBroadcast();

        console.log("Order Protocol deployed to:", address(orderProtocol));
        console.log("Maker Registry deployed to:", address(makerRegistry));
        console.log("Resolver Registry deployed to:", address(resolverRegistry));
    }
}
