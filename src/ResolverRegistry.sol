// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {Ownable} from "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title ResolverRegistry
 * @author Yug Agarwal
 * @dev Registry that maintains valid resolvers for the OrderProtocol.
 *
 *                          .            .                                   .#                        
 *                        +#####+---+###+#############+-                  -+###.                       
 *                        +###+++####+##-+++++##+++##++####+-.         -+###+++                        
 *                        +#########.-#+--+####++###- -########+---+++#####+++                         
 *                        +#######+#+++--+####+-..-+-.###+++########+-++###++.                         
 *                       +######.     +#-#####+-.-------+############+++####-                          
 *                      +####++...     ########-++-        +##########++++++.                          
 *                     -#######-+.    .########+++          -++######+++-                               
 *                     #++########--+-+####++++-- . ..    .-#++--+##+####.                              
 *                    -+++++++++#####---###---.----###+-+########..-+#++##-                            
 *                    ++###+++++#####-..---.. .+##++++#++#++-+--.   .-++++#                             
 *                   .###+.  .+#+-+###+ ..    +##+##+#++----...---.  .-+--+.                            
 *                   ###+---------+####+   -####+-.......    ...--++.  .---.                           
 *                  -#++++-----#######+-  .-+###+.... .....      .-+##-.  .                            
 *                  ##+++###++######++-.   .--+---++---........  ...---.  .                            
 *                 -####+-+#++###++-.        .--.--...-----.......--..... .                            
 *                 +######+++###+--..---.....  ...---------------.. .. .  .                            
 *                .-#########+#+++--++--------......----++--.--.  .--+---.                             
 *                 -+++########++--++++----------------------.--+++--+++--                             
 *            .######-.-++++###+----------------------..---++--++-+++---..                             
 *            -##########-------+-----------------------+-++-++----..----+----+#####++--..             
 *            -#############+..  ..--..----------.....-+++++++++++++++++##################+.           
 *            --+++++#########+-   . ....  ....... -+++++++++++++++++++############-.----+##-          
 *            -----....-+#######+-             .. -+++++++++++++++++++++##+######+.       +++.         
 *            --------.....---+#####+--......----.+++++++++++++++++++++##+-+++##+.        -++-         
 *            -------...   .--++++++---.....-----.+++++++++++++++++++++++. -+++##-        .---         
 *            #################+--.....-------.  .+++++++++++++++++++++-       -+-.       .---         
 *            +#########++++-.. .......-+--..--++-++++++++++++++++++++-         .-... ....----         
 *            -#####++---..   .--       -+++-.  ..+++++++++++++++++++--        .-+-......-+---         
 *            +####+---...    -+#-   .  --++++-. .+++++++++++++++++++---        --        -+--         
 *            ++++++++++--....-++.--++--.--+++++-.+++++++++++++++++++---. .......         ----         
 *           .--++#########++-.--.+++++--++++###+-++++++++++++++++++++----   .-++-        ----         
 *            .-+#############+-.++#+-+-++#######-++++++++++++++++++++----   -++++-      ..---         
 *           .---+############+.+###++--++#####++-+++++++++++++++++++++-------++++-........-+-         
 *            --+-+##########-+######+++++-++++++-++++++++++++++++++++++-----.----.......---+-         
 *           .--+---#######..+#######+++++++--+++-+++++++++++++++++++++++-----------------+++-         
 *           .++--..-+##-.-########+++++---++ .+-.+++++++++++++++++++++++++++++++++++---+++++-         
 *           -+++. ..-..-+#########++-++--..--....+++++++++++++++++++++++++++++++++++++++++++-         
 *           -++-......-+++############++++----- .+++++++++++++++++++++++++++++++++++++++++++-         
 *           +##-.....---+#######+####+####+--++-.+++++++++++++++++++++++++++++++++++++++++++-         
 *          .#+++-...-++######++-+-----..----++##-+++++++++++++++++++++++++++++++++++++++++++-         
 *          .+++--------+##----+------+-..----+++-+++++++++++++++++++++++++++++++++++++++++++-         
 *           ----.-----+++-+-...------++-----...--+++++++++++++++++++++++++++++++++++++++++++-         
 *          .-..-.--.----..--.... ....++--.  ....-+++++++++++++++++++++++++++++++++++++++++++-         
 *           -----------.---..--..   ..+.  . ... .+++++++++++++++++++++++++++++++++++++++++++-         
 *         .+#+#+---####+-.    .....--...   .    .+++++++++++++++++++++++++++++++++++++++++++-         
 *         -+++++#++++++++.    ..-...--.. ..     .+++++++++++++++++++++++++++++++++++++++++++-         
 *         ++++++-------++--   . ....--.. . . .. .+++++++++++++++++++++++++-+----------...             
 *         -++++--++++.------......-- ...  ..  . .---------------...                                   
 *         -++-+####+++---..-.........                                                                  
 *           .....
 */
contract ResolverRegistry is Ownable {
    error ResolverRegistry__ResolverAlreadyExists();
    error ResolverRegistry__ResolverDoesNotExists();

    uint256 private constant STAKING_AMOUNT = 100 * 1e6; // 100 PYUSD (6 decimals)
    IERC20 private immutable i_pyusdContractAddress;
    mapping(address => uint256) private s_stakes;
    // mapping of resolver address to whether it's valid
    mapping(address => bool) public s_resolvers;

    constructor(address _pyusdContractAddress) Ownable(msg.sender) {
        i_pyusdContractAddress = IERC20(_pyusdContractAddress);
    }

    /**
     *
     * @param resolver The address of the resolver to be added
     * Assumes that the resolver has already approved the staking amoun to this contract before the admin calls this function to approve him
     */
    function addResolver(address resolver) external onlyOwner {
        if (s_resolvers[resolver]) {
            revert ResolverRegistry__ResolverAlreadyExists();
        }
        i_pyusdContractAddress.transferFrom(resolver, address(this), STAKING_AMOUNT);
        s_stakes[resolver] += STAKING_AMOUNT;
        s_resolvers[resolver] = true;
    }

    /**
     *
     * @param resolver The address of the resolver to be removed
     */
    function removeResolver(address resolver) external onlyOwner {
        if (!s_resolvers[resolver]) {
            revert ResolverRegistry__ResolverDoesNotExists();
        }
        i_pyusdContractAddress.transfer(resolver, s_stakes[resolver]);
        s_stakes[resolver] = 0;
        s_resolvers[resolver] = false;
    }

    /**
     * @dev Resolve a dispute by transferring the stake of the resolver to the specified address
     * @param resolver The address of the resolver
     * @param amount The amount to be transferred
     * @param to The address to which the amount is to be transferred
     */
    function resolveDispute(address resolver, uint256 amount, address to) external onlyOwner {
        if (!s_resolvers[resolver]) {
            revert ResolverRegistry__ResolverDoesNotExists();
        }
        if (amount > s_stakes[resolver]) {
            amount = s_stakes[resolver];
        }
        i_pyusdContractAddress.transfer(to, amount);
        i_pyusdContractAddress.transfer(resolver, s_stakes[resolver] - amount);
        s_stakes[resolver] = 0;
        s_resolvers[resolver] = false;
    }

    /**
     *
     * @param resolver The address of the resolver to be checked
     * @return bool Whether the resolver is valid
     */
    function isResolver(address resolver) public view returns (bool) {
        return s_resolvers[resolver];
    }
}
