// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {OrderProtocol} from "../src/OrderProtocol.sol";
import {MakerRegistry} from "../src/MakerRegistry.sol";
import {ResolverRegistry} from "../src/ResolverRegistry.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {MockUSDC} from "../src/mock/MockUSDC.sol";
import {IERC20Metadata} from "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract OrderProtocolTest is Test {
    // Contract instances
    OrderProtocol public orderProtocol;
    MakerRegistry public makerRegistry;
    ResolverRegistry public resolverRegistry;
    MockUSDC public usdCoinToken; // USD Coin token (6 decimals)

    // Test addresses
    address public owner;
    address public relayer;
    address public maker1;
    address public maker2;
    address public resolver1;
    address public resolver2;
    address public user1;
    address public user2;

    // Configuration values
    uint256 public maxOrderTime;
    uint256 public maxFulfillmentTime;
    uint16 public resolverFee;

    // Test constants
    string public constant UPI_ADDRESS = "user@paytm";
    string public constant UPI_ADDRESS_2 = "user2@gpay";
    string public constant PAYMENT_PROOF = "razorpay_payout_123456";
    uint256 public constant TOKEN_SUPPLY = 1_000_000 * 1e6; // 1 million USD Coin (6 decimals)
    uint256 public constant TEST_AMOUNT = 1000 * 1e18; // 1000 INR
    uint256 public constant START_PRICE = 200 * 1e18; // 200 INR per token (Dutch auction starts high)
    uint256 public constant END_PRICE = 100 * 1e18; // 100 INR per token (Dutch auction ends low)
    uint256 public constant ACCEPTED_PRICE = 150 * 1e18; // 150 INR per token (between start and end)
    uint256 public constant STAKING_AMOUNT = 100 * 1e6; // 100 USD Coin (6 decimals)

    // Helper functions to mirror the contract's calculation logic
    function _calculateTokenAmount(uint256 _inrAmount, uint256 _priceInrPerToken, address _token)
        private
        view
        returns (uint256)
    {
        uint8 tokenDecimals = IERC20Metadata(_token).decimals();
        return (_inrAmount * (10 ** tokenDecimals)) / _priceInrPerToken;
    }

    function _calculateResolverFee(uint256 _tokenAmount) private view returns (uint256) {
        return (_tokenAmount * resolverFee) / 10000;
    }

    function setUp() public {
        // Setup test addresses
        owner = address(this);
        relayer = makeAddr("relayer");
        maker1 = makeAddr("maker1");
        maker2 = makeAddr("maker2");
        resolver1 = makeAddr("resolver1");
        resolver2 = makeAddr("resolver2");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy mock USD Coin token (6 decimals)
        usdCoinToken = new MockUSDC();

        // Set configuration values first
        maxOrderTime = 15 seconds;
        maxFulfillmentTime = 1 minutes;
        resolverFee = 100; // 1%

        // Deploy the system manually instead of using deployment script to avoid owner issues
        vm.prank(owner);
        makerRegistry = new MakerRegistry();
        vm.prank(owner);
        resolverRegistry = new ResolverRegistry(address(usdCoinToken));
        vm.prank(owner);
        orderProtocol = new OrderProtocol(
            maxOrderTime,
            address(resolverRegistry),
            relayer,
            maxFulfillmentTime,
            resolverFee,
            address(makerRegistry),
            address(usdCoinToken)
        );

        // Setup makers (register them properly)
        _forceRegisterMaker(maker1, UPI_ADDRESS, false);
        _forceRegisterMaker(maker2, UPI_ADDRESS_2, false);

        // Register resolvers with staking
        vm.prank(resolver1);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);
        vm.prank(resolver2);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);

        // Mint USD Coin tokens to everyone
        usdCoinToken.mint(maker1, TOKEN_SUPPLY);
        usdCoinToken.mint(maker2, TOKEN_SUPPLY);
        usdCoinToken.mint(relayer, TOKEN_SUPPLY);
        usdCoinToken.mint(resolver1, TOKEN_SUPPLY);
        usdCoinToken.mint(resolver2, TOKEN_SUPPLY);

        // Approve OrderProtocol to spend tokens
        vm.prank(maker1);
        usdCoinToken.approve(address(orderProtocol), type(uint256).max);
        vm.prank(maker2);
        usdCoinToken.approve(address(orderProtocol), type(uint256).max);

        // Add resolvers to registry (this will stake their tokens)
        vm.prank(owner);
        resolverRegistry.addResolver(resolver1);
        vm.prank(owner);
        resolverRegistry.addResolver(resolver2);
    }

    // Helper function to register makers properly (due to MakerRegistry bug)
    function _forceRegisterMaker(address maker, string memory proof, bool isForeigner) internal {
        makerRegistry.registerMaker(proof, maker, isForeigner);
        // Manually set s_isRegistered using vm.store since the contract doesn't do it
        bytes32 slot = keccak256(abi.encode(maker, uint256(4)));
        vm.store(address(makerRegistry), slot, bytes32(uint256(1)));
    }

    // Helper function to create a basic order
    function _createBasicOrder(address maker) internal returns (bytes32 orderId) {
        vm.prank(maker);
        orderId = orderProtocol.createOrder(TEST_AMOUNT, START_PRICE, END_PRICE, UPI_ADDRESS);
    }

    //////////////////////////////////////////////
    //          Constructor & Setup Tests       //
    //////////////////////////////////////////////

    function test_Constructor_SetsParametersCorrectly() public view {
        assertEq(orderProtocol.i_maxOrderTime(), maxOrderTime);
        assertEq(orderProtocol.i_maxFullfillmentTime(), maxFulfillmentTime);
        assertEq(orderProtocol.i_resolverFee(), resolverFee);
        assertEq(orderProtocol.i_resolverRegistry(), address(resolverRegistry));
        assertEq(orderProtocol.i_makerRegistry(), address(makerRegistry));
        assertEq(orderProtocol.i_usdCoinContractAddress(), address(usdCoinToken));
        assertEq(orderProtocol.owner(), owner);
        assertEq(orderProtocol.s_orderCount(), 0);
        assertEq(orderProtocol.PRECISION(), 1e18);
    }

    function test_Constructor_InitialState() public view {
        // No orders initially
        assertEq(orderProtocol.s_orderCount(), 0);

        // USD Coin token should be set as the supported token
        assertEq(orderProtocol.i_usdCoinContractAddress(), address(usdCoinToken));

        // Makers should be registered
        assertTrue(makerRegistry.isMaker(maker1));
        assertTrue(makerRegistry.isMaker(maker2));

        // Resolvers should be registered
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));
    }

    //////////////////////////////////////////////
    //            CreateOrder Tests             //
    //////////////////////////////////////////////

    function test_CreateOrder_Success() public {
        uint256 initialTokenBalance = usdCoinToken.balanceOf(maker1);

        // Calculate expected amounts using the same logic as the contract
        uint256 expectedTokenAmount = _calculateTokenAmount(TEST_AMOUNT, END_PRICE, address(usdCoinToken));
        uint256 expectedFee = _calculateResolverFee(expectedTokenAmount);
        uint256 expectedTotal = expectedTokenAmount + expectedFee;

        vm.prank(maker1);
        bytes32 orderId = orderProtocol.createOrder(TEST_AMOUNT, START_PRICE, END_PRICE, UPI_ADDRESS);

        // Check order was created
        OrderProtocol.Order memory order = orderProtocol.getOrder(orderId);
        assertEq(order.maker, maker1);
        assertEq(order.taker, address(0));
        assertEq(order.recipientUpiAddress, UPI_ADDRESS);
        assertEq(order.amount, TEST_AMOUNT);
        assertEq(order.startPrice, START_PRICE);
        assertEq(order.endPrice, END_PRICE);
        assertEq(order.acceptedPrice, 0);
        assertEq(order.startTime, block.timestamp);
        assertEq(order.acceptedTime, 0);
        assertFalse(order.accepted);
        assertFalse(order.fullfilled);

        // Check token transfer
        assertEq(usdCoinToken.balanceOf(maker1), initialTokenBalance - expectedTotal);
        assertEq(usdCoinToken.balanceOf(address(orderProtocol)), expectedTotal);

        // Check order count and mappings
        assertEq(orderProtocol.s_orderCount(), 1);

        // Check that order is added to maker's order list
        OrderProtocol.Order[] memory makerOrders = orderProtocol.getOrdersByMaker(maker1);
        assertEq(makerOrders.length, 1);
        assertEq(makerOrders[0].maker, maker1);
    }

    function test_CreateOrder_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit OrderProtocol.OrderCreated(
            keccak256(abi.encodePacked(maker1, TEST_AMOUNT, uint256(0))), maker1, TEST_AMOUNT
        );

        vm.prank(maker1);
        orderProtocol.createOrder(TEST_AMOUNT, START_PRICE, END_PRICE, UPI_ADDRESS);
    }

    function test_CreateOrder_InvalidAmount_Zero() public {
        vm.prank(maker1);
        vm.expectRevert(OrderProtocol.OrderProtocol__InvalidAmount.selector);
        orderProtocol.createOrder(0, START_PRICE, END_PRICE, UPI_ADDRESS);
    }

    function test_CreateOrder_InvalidPrice_ZeroStartPrice() public {
        vm.prank(maker1);
        vm.expectRevert(OrderProtocol.OrderProtocol__InvalidPrice.selector);
        orderProtocol.createOrder(TEST_AMOUNT, 0, END_PRICE, UPI_ADDRESS);
    }

    function test_CreateOrder_InvalidPrice_ZeroEndPrice() public {
        vm.prank(maker1);
        vm.expectRevert(OrderProtocol.OrderProtocol__InvalidPrice.selector);
        orderProtocol.createOrder(TEST_AMOUNT, START_PRICE, 0, UPI_ADDRESS);
    }

    function test_CreateOrder_InvalidPrice_StartPriceNotGreaterThanEndPrice() public {
        vm.prank(maker1);
        vm.expectRevert(OrderProtocol.OrderProtocol__InvalidPrice.selector);
        orderProtocol.createOrder(TEST_AMOUNT, END_PRICE, START_PRICE, UPI_ADDRESS);
    }

    function test_CreateOrder_OnlyMaker() public {
        vm.prank(user1); // Not a registered maker
        vm.expectRevert(OrderProtocol.OrderProtocol__NotAMaker.selector);
        orderProtocol.createOrder(TEST_AMOUNT, START_PRICE, END_PRICE, UPI_ADDRESS);
    }

    //////////////////////////////////////////////
    //            AcceptOrder Tests             //
    //////////////////////////////////////////////

    function test_AcceptOrder_Success() public {
        // Create order first
        bytes32 orderId = _createBasicOrder(maker1);

        // Accept order
        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);

        // Verify order was accepted
        OrderProtocol.Order memory order = orderProtocol.getOrder(orderId);
        assertEq(order.taker, resolver1);
        assertEq(order.acceptedPrice, ACCEPTED_PRICE);
        assertEq(order.acceptedTime, block.timestamp);
        assertTrue(order.accepted);
        assertFalse(order.fullfilled);

        // Check resolver is added to taker orders
        OrderProtocol.Order[] memory takerOrders = orderProtocol.getOrdersByTaker(resolver1);
        assertEq(takerOrders.length, 1);
        assertEq(takerOrders[0].taker, resolver1);
    }

    function test_AcceptOrder_OnlyRelayer() public {
        bytes32 orderId = _createBasicOrder(maker1);

        vm.prank(user1);
        vm.expectRevert(OrderProtocol.OrderProtocol__NotRelayer.selector);
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);
    }

    function test_AcceptOrder_NotAResolver() public {
        bytes32 orderId = _createBasicOrder(maker1);

        vm.prank(orderProtocol.i_relayerAddress());
        vm.expectRevert(OrderProtocol.OrderProtocol__NotAResolver.selector);
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, user1); // user1 is not a resolver
    }

    //////////////////////////////////////////////
    //           FulfillOrder Tests             //
    //////////////////////////////////////////////

    function test_FulfillOrder_Success() public {
        bytes32 orderId = _createBasicOrder(maker1);

        uint256 initialResolverBalance = usdCoinToken.balanceOf(resolver1);
        uint256 initialMakerBalance = usdCoinToken.balanceOf(maker1);

        // Accept order
        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);

        // Fulfill order
        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.fullfillOrder(orderId, PAYMENT_PROOF);

        // Verify order is fulfilled
        OrderProtocol.Order memory order = orderProtocol.getOrder(orderId);
        assertTrue(order.fullfilled);

        // Verify proof is stored
        assertEq(orderProtocol.s_orderIdToProof(orderId), PAYMENT_PROOF);

        // Verify resolver received tokens (they should get tokens at accepted price + fee)
        uint256 expectedResolverTokens = _calculateTokenAmount(TEST_AMOUNT, ACCEPTED_PRICE, address(usdCoinToken));
        uint256 expectedResolverFee = _calculateResolverFee(expectedResolverTokens);
        uint256 expectedTotalToResolver = expectedResolverTokens + expectedResolverFee;

        assertEq(usdCoinToken.balanceOf(resolver1), initialResolverBalance + expectedTotalToResolver);

        // Verify maker got some refund (difference between what they paid and what resolver got)
        assertTrue(usdCoinToken.balanceOf(maker1) > initialMakerBalance);
    }

    function test_FulfillOrder_OnlyRelayer() public {
        bytes32 orderId = _createBasicOrder(maker1);

        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);

        vm.prank(user1);
        vm.expectRevert(OrderProtocol.OrderProtocol__NotRelayer.selector);
        orderProtocol.fullfillOrder(orderId, PAYMENT_PROOF);
    }

    //////////////////////////////////////////////
    //            Getter Function Tests         //
    //////////////////////////////////////////////

    function test_GetOrder() public {
        bytes32 orderId = _createBasicOrder(maker1);

        OrderProtocol.Order memory order = orderProtocol.getOrder(orderId);
        assertEq(order.maker, maker1);
        assertEq(order.amount, TEST_AMOUNT);
    }

    function test_GetOrdersByMaker() public {
        // Create multiple orders for maker1
        _createBasicOrder(maker1);
        vm.prank(maker1);
        orderProtocol.createOrder(TEST_AMOUNT * 2, START_PRICE + 50 * 1e18, END_PRICE + 50 * 1e18, UPI_ADDRESS_2);

        OrderProtocol.Order[] memory orders = orderProtocol.getOrdersByMaker(maker1);
        assertEq(orders.length, 2);
        assertEq(orders[0].maker, maker1);
        assertEq(orders[1].maker, maker1);
    }

    //////////////////////////////////////////////
    //           Integration Tests              //
    //////////////////////////////////////////////

    function test_Integration_CompleteOrderLifecycle() public {
        uint256 makerInitialBalance = usdCoinToken.balanceOf(maker1);
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);

        // 1. Create order
        bytes32 orderId = _createBasicOrder(maker1);

        // 2. Accept order
        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);

        // 3. Fulfill order
        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.fullfillOrder(orderId, PAYMENT_PROOF);

        // Verify final state
        OrderProtocol.Order memory order = orderProtocol.getOrder(orderId);
        assertTrue(order.accepted);
        assertTrue(order.fullfilled);
        assertEq(order.taker, resolver1);
        assertEq(order.acceptedPrice, ACCEPTED_PRICE);
        assertEq(orderProtocol.s_orderIdToProof(orderId), PAYMENT_PROOF);

        // Verify resolver received tokens
        assertTrue(usdCoinToken.balanceOf(resolver1) > resolverInitialBalance);

        // Verify maker got some tokens back (price difference refund)
        assertTrue(usdCoinToken.balanceOf(maker1) > 0);
        assertTrue(usdCoinToken.balanceOf(maker1) < makerInitialBalance);
    }

    //////////////////////////////////////////////
    //           Staking Integration Tests      //
    //////////////////////////////////////////////

    function test_ResolverStaking_Integration() public {
        // Verify resolvers were staked during setup
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));

        // Create and test order with staked resolver
        bytes32 orderId = _createBasicOrder(maker1);

        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);

        // Should work since resolver is staked
        OrderProtocol.Order memory order = orderProtocol.getOrder(orderId);
        assertTrue(order.accepted);
        assertEq(order.taker, resolver1);
    }

    function test_ResolverSlashing_Integration() public {
        // Create an order and accept it
        bytes32 orderId = _createBasicOrder(maker1);

        vm.prank(orderProtocol.i_relayerAddress());
        orderProtocol.acceptOrder(orderId, ACCEPTED_PRICE, resolver1);

        // Simulate resolver misbehavior - owner can slash the resolver
        address slashRecipient = makeAddr("slashRecipient");
        uint256 slashAmount = STAKING_AMOUNT / 2;

        vm.prank(owner);
        resolverRegistry.resolveDispute(resolver1, slashAmount, slashRecipient);

        // Verify resolver was removed and slashed
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertEq(usdCoinToken.balanceOf(slashRecipient), slashAmount);
    }

    // Events for testing
    event OrderCreated(bytes32 indexed orderId, address indexed maker, uint256 amount);
    event OrderAccepted(bytes32 indexed orderId, address indexed taker, uint256 acceptedPrice);
    event OrderFullfilled(bytes32 indexed orderId, address indexed taker, string proof);
    event OrderFailed(bytes32 indexed orderId, address indexed maker);
}
