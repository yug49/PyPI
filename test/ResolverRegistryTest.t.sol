// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "../lib/forge-std/src/Test.sol";
import {ResolverRegistry} from "../src/ResolverRegistry.sol";
import {MockUSDC} from "../src/mock/MockUSDC.sol";
import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract ResolverRegistryTest is Test {
    ResolverRegistry public resolverRegistry;
    MockUSDC public usdCoinToken;
    address public owner;
    address public user1;
    address public user2;
    address public resolver1;
    address public resolver2;

    uint256 public constant STAKING_AMOUNT = 10 * 1e6; // 10 USD Coin (6 decimals)
    uint256 public constant TOKEN_SUPPLY = 1_000_000 * 1e6; // 1 million USD Coin (6 decimals)

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        resolver1 = makeAddr("resolver1");
        resolver2 = makeAddr("resolver2");

        // Deploy mock USD Coin token
        usdCoinToken = new MockUSDC();

        // Deploy resolver registry with USD Coin token address
        resolverRegistry = new ResolverRegistry(address(usdCoinToken));

        // Mint tokens to resolvers for staking
        usdCoinToken.mint(resolver1, TOKEN_SUPPLY);
        usdCoinToken.mint(resolver2, TOKEN_SUPPLY);
        usdCoinToken.mint(user1, TOKEN_SUPPLY);
        usdCoinToken.mint(user2, TOKEN_SUPPLY);

        // Approve staking amount for resolvers
        vm.prank(resolver1);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);
        vm.prank(resolver2);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);
        vm.prank(user1);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);
        vm.prank(user2);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);
    }

    //////////////////////////////////////////////
    //               Constructor Tests          //
    //////////////////////////////////////////////

    function test_Constructor_SetsOwnerCorrectly() public view {
        assertEq(resolverRegistry.owner(), owner);
    }

    function test_Constructor_InitialResolverStateFalse() public view {
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertFalse(resolverRegistry.isResolver(resolver2));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    //////////////////////////////////////////////
    //               addResolver Tests          //
    //////////////////////////////////////////////

    function test_AddResolver_Success() public {
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);
        uint256 contractInitialBalance = usdCoinToken.balanceOf(address(resolverRegistry));

        // Add resolver1
        resolverRegistry.addResolver(resolver1);

        // Verify resolver1 is now valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.s_resolvers(resolver1));

        // Verify tokens were transferred for staking
        assertEq(usdCoinToken.balanceOf(resolver1), resolverInitialBalance - STAKING_AMOUNT);
        assertEq(usdCoinToken.balanceOf(address(resolverRegistry)), contractInitialBalance + STAKING_AMOUNT);
    }

    function test_AddResolver_MultipleResolvers() public {
        uint256 contractInitialBalance = usdCoinToken.balanceOf(address(resolverRegistry));

        // Add multiple resolvers
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.addResolver(resolver2);

        // Verify both are valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));

        // Verify correct total staking amount was transferred
        assertEq(usdCoinToken.balanceOf(address(resolverRegistry)), contractInitialBalance + (STAKING_AMOUNT * 2));
    }

    function test_AddResolver_ZeroAddress() public {
        // Should revert when trying to add zero address due to token transfer failure
        vm.expectRevert();
        resolverRegistry.addResolver(address(0));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    function test_AddResolver_SameResolverTwice() public {
        // Add same resolver first time
        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.isResolver(resolver1));

        // Try to add same resolver again - should revert
        vm.expectRevert(ResolverRegistry.ResolverRegistry__ResolverAlreadyExists.selector);
        resolverRegistry.addResolver(resolver1);

        // Should still be valid
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_AddResolver_OnlyOwner() public {
        // Try to add resolver as non-owner
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.addResolver(resolver1);

        // Verify resolver was not added
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    function test_AddResolver_InsufficientBalance() public {
        // Create a resolver with insufficient balance
        address poorResolver = makeAddr("poorResolver");
        usdCoinToken.mint(poorResolver, STAKING_AMOUNT - 1); // Less than required

        vm.prank(poorResolver);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);

        // Should revert due to insufficient balance
        vm.expectRevert();
        resolverRegistry.addResolver(poorResolver);

        assertFalse(resolverRegistry.isResolver(poorResolver));
    }

    function test_AddResolver_InsufficientAllowance() public {
        // Create a resolver with balance but no allowance
        address resolverNoAllowance = makeAddr("resolverNoAllowance");
        usdCoinToken.mint(resolverNoAllowance, TOKEN_SUPPLY);
        // Don't approve tokens

        // Should revert due to insufficient allowance
        vm.expectRevert();
        resolverRegistry.addResolver(resolverNoAllowance);

        assertFalse(resolverRegistry.isResolver(resolverNoAllowance));
    }

    //////////////////////////////////////////////
    //             removeResolver Tests         //
    //////////////////////////////////////////////

    function test_RemoveResolver_Success() public {
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);

        // Add resolver first
        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.isResolver(resolver1));

        uint256 resolverBalanceAfterStaking = usdCoinToken.balanceOf(resolver1);
        assertEq(resolverBalanceAfterStaking, resolverInitialBalance - STAKING_AMOUNT);

        // Remove resolver
        resolverRegistry.removeResolver(resolver1);

        // Verify resolver is no longer valid
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertFalse(resolverRegistry.s_resolvers(resolver1));

        // Verify stake was returned
        assertEq(usdCoinToken.balanceOf(resolver1), resolverInitialBalance);
    }

    function test_RemoveResolver_NonExistentResolver() public {
        // Try to remove a resolver that was never added - should revert
        vm.expectRevert(ResolverRegistry.ResolverRegistry__ResolverDoesNotExists.selector);
        resolverRegistry.removeResolver(resolver1);

        // Should still be false
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    function test_RemoveResolver_ZeroAddress() public {
        // Try to remove zero address without adding - should revert
        vm.expectRevert(ResolverRegistry.ResolverRegistry__ResolverDoesNotExists.selector);
        resolverRegistry.removeResolver(address(0));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    function test_RemoveResolver_OnlyOwner() public {
        // Add resolver as owner
        resolverRegistry.addResolver(resolver1);

        // Try to remove resolver as non-owner
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.removeResolver(resolver1);

        // Verify resolver is still valid
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_RemoveResolver_MultipleTimes() public {
        // Add resolver
        resolverRegistry.addResolver(resolver1);

        // Remove first time
        resolverRegistry.removeResolver(resolver1);
        assertFalse(resolverRegistry.isResolver(resolver1));

        // Try to remove again - should revert
        vm.expectRevert(ResolverRegistry.ResolverRegistry__ResolverDoesNotExists.selector);
        resolverRegistry.removeResolver(resolver1);

        // Should still be false
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    //////////////////////////////////////////////
    //             resolveDispute Tests         //
    //////////////////////////////////////////////

    function test_ResolveDispute_Success() public {
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);
        uint256 disputeRecipientInitialBalance = usdCoinToken.balanceOf(user1);

        // Add resolver first
        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.isResolver(resolver1));

        // Resolve dispute with partial amount
        uint256 disputeAmount = STAKING_AMOUNT / 2;
        resolverRegistry.resolveDispute(resolver1, disputeAmount, user1);

        // Verify resolver is removed
        assertFalse(resolverRegistry.isResolver(resolver1));

        // Verify tokens were distributed correctly
        // Dispute recipient gets the dispute amount
        assertEq(usdCoinToken.balanceOf(user1), disputeRecipientInitialBalance + disputeAmount);
        // Resolver gets remaining stake
        assertEq(usdCoinToken.balanceOf(resolver1), resolverInitialBalance - disputeAmount);
    }

    function test_ResolveDispute_FullAmount() public {
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);
        uint256 disputeRecipientInitialBalance = usdCoinToken.balanceOf(user1);

        // Add resolver first
        resolverRegistry.addResolver(resolver1);

        // Resolve dispute with full stake amount
        resolverRegistry.resolveDispute(resolver1, STAKING_AMOUNT, user1);

        // Verify resolver is removed
        assertFalse(resolverRegistry.isResolver(resolver1));

        // Verify all stake went to dispute recipient
        assertEq(usdCoinToken.balanceOf(user1), disputeRecipientInitialBalance + STAKING_AMOUNT);
        // Resolver gets nothing back
        assertEq(usdCoinToken.balanceOf(resolver1), resolverInitialBalance - STAKING_AMOUNT);
    }

    function test_ResolveDispute_AmountExceedsStake() public {
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);
        uint256 disputeRecipientInitialBalance = usdCoinToken.balanceOf(user1);

        // Add resolver first
        resolverRegistry.addResolver(resolver1);

        // Try to resolve dispute with amount greater than stake
        uint256 excessiveAmount = STAKING_AMOUNT * 2;
        resolverRegistry.resolveDispute(resolver1, excessiveAmount, user1);

        // Should cap at stake amount
        assertEq(usdCoinToken.balanceOf(user1), disputeRecipientInitialBalance + STAKING_AMOUNT);
        assertEq(usdCoinToken.balanceOf(resolver1), resolverInitialBalance - STAKING_AMOUNT);
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    function test_ResolveDispute_NonExistentResolver() public {
        // Try to resolve dispute for non-existent resolver
        vm.expectRevert(ResolverRegistry.ResolverRegistry__ResolverDoesNotExists.selector);
        resolverRegistry.resolveDispute(resolver1, STAKING_AMOUNT, user1);
    }

    function test_ResolveDispute_OnlyOwner() public {
        // Add resolver first
        resolverRegistry.addResolver(resolver1);

        // Try to resolve dispute as non-owner
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.resolveDispute(resolver1, STAKING_AMOUNT, user2);

        // Resolver should still be valid
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_ResolveDispute_ZeroAmount() public {
        uint256 resolverInitialBalance = usdCoinToken.balanceOf(resolver1);
        uint256 disputeRecipientInitialBalance = usdCoinToken.balanceOf(user1);

        // Add resolver first
        resolverRegistry.addResolver(resolver1);

        // Resolve dispute with zero amount
        resolverRegistry.resolveDispute(resolver1, 0, user1);

        // Dispute recipient gets nothing
        assertEq(usdCoinToken.balanceOf(user1), disputeRecipientInitialBalance);
        // Resolver gets full stake back
        assertEq(usdCoinToken.balanceOf(resolver1), resolverInitialBalance);
        // Resolver is still removed
        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    //////////////////////////////////////////////
    //               isResolver Tests           //
    //////////////////////////////////////////////

    function test_IsResolver_DefaultFalse() public view {
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertFalse(resolverRegistry.isResolver(resolver2));
        assertFalse(resolverRegistry.isResolver(user1));
        assertFalse(resolverRegistry.isResolver(address(0)));
    }

    function test_IsResolver_AfterAddition() public {
        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.isResolver(resolver1));

        // Other addresses should still be false
        assertFalse(resolverRegistry.isResolver(resolver2));
    }

    function test_IsResolver_AfterRemoval() public {
        // Add then remove
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.removeResolver(resolver1);

        assertFalse(resolverRegistry.isResolver(resolver1));
    }

    function test_IsResolver_PublicMapping() public {
        // Test direct access to s_resolvers mapping
        assertFalse(resolverRegistry.s_resolvers(resolver1));

        resolverRegistry.addResolver(resolver1);
        assertTrue(resolverRegistry.s_resolvers(resolver1));

        resolverRegistry.removeResolver(resolver1);
        assertFalse(resolverRegistry.s_resolvers(resolver1));
    }

    //////////////////////////////////////////////
    //            Ownership Tests               //
    //////////////////////////////////////////////

    function test_Ownership_TransferOwnership() public {
        // Transfer ownership to user1
        resolverRegistry.transferOwnership(user1);

        // user1 should now be able to add resolvers
        vm.prank(user1);
        resolverRegistry.addResolver(resolver1);

        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_Ownership_RenounceOwnership() public {
        // Renounce ownership
        resolverRegistry.renounceOwnership();

        // No one should be able to add resolvers now
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        resolverRegistry.addResolver(resolver1);
    }

    function test_Ownership_OnlyOwnerCanTransfer() public {
        // Non-owner tries to transfer ownership
        vm.prank(user1);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user1));
        resolverRegistry.transferOwnership(user2);
    }

    //////////////////////////////////////////////
    //            Integration Tests             //
    //////////////////////////////////////////////

    function test_Integration_CompleteWorkflow() public {
        uint256 resolver1InitialBalance = usdCoinToken.balanceOf(resolver1);
        uint256 contractInitialBalance = usdCoinToken.balanceOf(address(resolverRegistry));

        // Add multiple resolvers
        resolverRegistry.addResolver(resolver1);
        resolverRegistry.addResolver(resolver2);

        // Verify both are valid and stakes were taken
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));
        assertEq(usdCoinToken.balanceOf(address(resolverRegistry)), contractInitialBalance + (STAKING_AMOUNT * 2));

        // Remove one resolver
        resolverRegistry.removeResolver(resolver1);

        // Verify states and stake return
        assertFalse(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));
        assertEq(usdCoinToken.balanceOf(resolver1), resolver1InitialBalance); // Full refund
        assertEq(usdCoinToken.balanceOf(address(resolverRegistry)), contractInitialBalance + STAKING_AMOUNT); // Only one stake remains

        // Re-add the removed resolver
        resolverRegistry.addResolver(resolver1);

        // Both should be valid again with correct stakes
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));
        assertEq(usdCoinToken.balanceOf(address(resolverRegistry)), contractInitialBalance + (STAKING_AMOUNT * 2));
    }

    function test_Integration_OwnershipAndResolverManagement() public {
        // Add resolver as original owner
        resolverRegistry.addResolver(resolver1);

        // Transfer ownership
        resolverRegistry.transferOwnership(user1);

        // New owner adds another resolver
        vm.prank(user1);
        resolverRegistry.addResolver(resolver2);

        // Both resolvers should be valid
        assertTrue(resolverRegistry.isResolver(resolver1));
        assertTrue(resolverRegistry.isResolver(resolver2));

        // Original owner can no longer add resolvers
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        resolverRegistry.addResolver(makeAddr("resolver3"));
    }

    //////////////////////////////////////////////
    //              Fuzz Tests                  //
    //////////////////////////////////////////////

    function testFuzz_AddAndRemoveResolver(address resolver) public {
        // Skip problematic addresses
        vm.assume(resolver != address(resolverRegistry));
        vm.assume(resolver != address(0));
        vm.assume(resolver != address(usdCoinToken));

        // Give resolver tokens and approval
        usdCoinToken.mint(resolver, TOKEN_SUPPLY);
        vm.prank(resolver);
        usdCoinToken.approve(address(resolverRegistry), type(uint256).max);

        // Initially should be false
        assertFalse(resolverRegistry.isResolver(resolver));

        // Add resolver
        resolverRegistry.addResolver(resolver);
        assertTrue(resolverRegistry.isResolver(resolver));

        // Remove resolver
        resolverRegistry.removeResolver(resolver);
        assertFalse(resolverRegistry.isResolver(resolver));
    }

    function testFuzz_OnlyOwnerCanModify(address nonOwner, address resolver) public {
        vm.assume(nonOwner != owner && nonOwner != address(0));
        vm.assume(resolver != address(0));

        // Non-owner cannot add resolver
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        resolverRegistry.addResolver(resolver);

        // Non-owner cannot remove resolver
        vm.prank(nonOwner);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, nonOwner));
        resolverRegistry.removeResolver(resolver);

        // Resolver should still be false
        assertFalse(resolverRegistry.isResolver(resolver));
    }

    //////////////////////////////////////////////
    //              Event Tests                 //
    //////////////////////////////////////////////

    // Note: The current ResolverRegistry contract doesn't emit events,
    // but if events were added, they would be tested here

    //////////////////////////////////////////////
    //              Gas Tests                   //
    //////////////////////////////////////////////

    function test_Gas_AddResolver() public {
        uint256 gasBefore = gasleft();
        resolverRegistry.addResolver(resolver1);
        uint256 gasUsed = gasBefore - gasleft();

        // Log gas usage for reference
        console.log("Gas used for addResolver:", gasUsed);

        // Verify the operation succeeded
        assertTrue(resolverRegistry.isResolver(resolver1));
    }

    function test_Gas_RemoveResolver() public {
        // Setup: add resolver first
        resolverRegistry.addResolver(resolver1);

        uint256 gasBefore = gasleft();
        resolverRegistry.removeResolver(resolver1);
        uint256 gasUsed = gasBefore - gasleft();

        // Log gas usage for reference
        console.log("Gas used for removeResolver:", gasUsed);

        // Verify the operation succeeded
        assertFalse(resolverRegistry.isResolver(resolver1));
    }
}
