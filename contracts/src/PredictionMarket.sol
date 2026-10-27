// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title PredictionMarket (v3, USDC + disputes)
/// @notice Friend-group yes/no markets. Creator asks a question and names a neutral arbiter,
///         friends bet USDC on YES or NO until the deadline, creator resolves, winners split
///         the whole pot pro-rata.
///
///         Lifecycle after the deadline:
///         - Creator has RESOLVE_WINDOW to resolve, otherwise the market voids (everyone refunded).
///         - After resolve, bettors have DISPUTE_WINDOW to dispute. No dispute: the result is final.
///         - On dispute the arbiter has ARBITER_WINDOW to set the final result, otherwise it voids.
///         Once a result is final it never changes, and only final results can be claimed.
/// @dev Assumes a plain ERC-20 (USDC): no fee-on-transfer or rebasing tokens, since pools
///      count the `amount` requested rather than what actually arrived.
contract PredictionMarket {
    using SafeERC20 for IERC20;

    enum Outcome {
        Unresolved,
        Yes,
        No,
        Invalid // nobody wins -> everyone gets their stake back
    }

    struct Market {
        address creator;
        uint64 deadline;
        Outcome outcome; // creator's result, or the arbiter's once arbitrated
        bool arbitrated;
        address arbiter;
        uint64 resolvedAt;
        uint64 disputedAt; // 0 = not disputed
        uint256 yesPool;
        uint256 noPool;
        string question;
    }

    /// @notice How long the creator has to resolve, bettors have to dispute, and the arbiter has
    ///         to rule (seconds). Fixed at deploy: e.g. 7 days / 24 hours / 3 days in production,
    ///         minutes on a local chain so the whole flow can be tested quickly.
    uint64 public immutable RESOLVE_WINDOW;
    uint64 public immutable DISPUTE_WINDOW;
    uint64 public immutable ARBITER_WINDOW;

    /// @notice The token every market is priced in. Fixed at deploy.
    IERC20 public immutable token;

    uint256 public marketCount;
    mapping(uint256 => Market) internal _markets;
    mapping(uint256 => mapping(address => uint256)) public yesStake;
    mapping(uint256 => mapping(address => uint256)) public noStake;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event MarketCreated(uint256 indexed id, address indexed creator, address indexed arbiter, uint64 deadline, string question);
    event BetPlaced(uint256 indexed id, address indexed bettor, bool yes, uint256 amount);
    event MarketResolved(uint256 indexed id, Outcome outcome);
    event Disputed(uint256 indexed id, address indexed by);
    event Arbitrated(uint256 indexed id, Outcome outcome);
    event Claimed(uint256 indexed id, address indexed bettor, uint256 amount);

    error EmptyQuestion();
    error DeadlineInPast();
    error BadArbiter();
    error MarketNotFound();
    error BettingClosed();
    error ZeroAmount();
    error ArbiterCannotBet();
    error NotCreator();
    error NotArbiter();
    error TooEarly();
    error TooLate();
    error AlreadyResolved();
    error InvalidOutcome();
    error NotResolved();
    error AlreadyDisputed();
    error NotDisputed();
    error NotABettor();
    error NotFinal();
    error AlreadyClaimed();
    error NothingToClaim();

    constructor(IERC20 _token, uint64 resolveWindow, uint64 disputeWindow, uint64 arbiterWindow) {
        token = _token;
        RESOLVE_WINDOW = resolveWindow;
        DISPUTE_WINDOW = disputeWindow;
        ARBITER_WINDOW = arbiterWindow;
    }

    // ---------------------------------------------------------------------
    // Markets
    // ---------------------------------------------------------------------

    /// @param arbiter A neutral friend who settles disputes. Can't be the creator and can't bet.
    function createMarket(string calldata question, uint64 deadline, address arbiter) external returns (uint256 id) {
        if (bytes(question).length == 0) revert EmptyQuestion();
        if (deadline <= block.timestamp) revert DeadlineInPast();
        if (arbiter == address(0) || arbiter == msg.sender) revert BadArbiter();

        id = marketCount++;
        Market storage m = _markets[id];
        m.creator = msg.sender;
        m.deadline = deadline;
        m.arbiter = arbiter;
        m.question = question;

        emit MarketCreated(id, msg.sender, arbiter, deadline, question);
    }

    function getMarket(uint256 id) external view returns (Market memory) {
        return _market(id);
    }

    /// @notice The result payouts use, or Unresolved while it can still change.
    function finalOutcome(uint256 id) public view returns (Outcome) {
        Market storage m = _market(id);
        uint256 t = block.timestamp; // uint256 math below so a far-future uint64 deadline can't overflow

        if (m.outcome == Outcome.Unresolved) {
            // creator never resolved: void once their window has passed
            return t >= uint256(m.deadline) + RESOLVE_WINDOW ? Outcome.Invalid : Outcome.Unresolved;
        }
        if (m.disputedAt == 0) {
            // resolved, undisputed: final once nobody disputed in time
            return t >= uint256(m.resolvedAt) + DISPUTE_WINDOW ? m.outcome : Outcome.Unresolved;
        }
        if (m.arbitrated) return m.outcome;
        // disputed, arbiter silent: void once their window has passed
        return t >= uint256(m.disputedAt) + ARBITER_WINDOW ? Outcome.Invalid : Outcome.Unresolved;
    }

    // ---------------------------------------------------------------------
    // Betting, resolving, disputing, claiming
    // ---------------------------------------------------------------------

    /// @notice Stake `amount` tokens on YES (`yes = true`) or NO until the deadline.
    ///         Call `token.approve(address(this), amount)` first.
    function bet(uint256 id, bool yes, uint256 amount) external {
        Market storage m = _market(id);
        if (block.timestamp >= m.deadline) revert BettingClosed();
        if (amount == 0) revert ZeroAmount();
        if (msg.sender == m.arbiter) revert ArbiterCannotBet();

        if (yes) {
            m.yesPool += amount;
            yesStake[id][msg.sender] += amount;
        } else {
            m.noPool += amount;
            noStake[id][msg.sender] += amount;
        }

        token.safeTransferFrom(msg.sender, address(this), amount);
        emit BetPlaced(id, msg.sender, yes, amount);
    }

    /// @notice Creator sets the result after the deadline, within RESOLVE_WINDOW. One shot.
    function resolve(uint256 id, Outcome outcome) external {
        Market storage m = _market(id);
        if (msg.sender != m.creator) revert NotCreator();
        if (block.timestamp < m.deadline) revert TooEarly();
        // after the window the market has already voided and refunds may be paid out
        if (block.timestamp >= uint256(m.deadline) + RESOLVE_WINDOW) revert TooLate();
        if (m.outcome != Outcome.Unresolved) revert AlreadyResolved();
        if (outcome == Outcome.Unresolved) revert InvalidOutcome();

        m.outcome = outcome;
        m.resolvedAt = uint64(block.timestamp);
        emit MarketResolved(id, outcome);
    }

    /// @notice Any bettor can challenge the creator's result within DISPUTE_WINDOW.
    function dispute(uint256 id) external {
        Market storage m = _market(id);
        if (m.outcome == Outcome.Unresolved) revert NotResolved();
        if (m.disputedAt != 0) revert AlreadyDisputed();
        if (block.timestamp >= uint256(m.resolvedAt) + DISPUTE_WINDOW) revert TooLate();
        if (yesStake[id][msg.sender] + noStake[id][msg.sender] == 0) revert NotABettor();

        m.disputedAt = uint64(block.timestamp);
        emit Disputed(id, msg.sender);
    }

    /// @notice The arbiter sets the final result of a disputed market within ARBITER_WINDOW.
    function arbitrate(uint256 id, Outcome outcome) external {
        Market storage m = _market(id);
        if (msg.sender != m.arbiter) revert NotArbiter();
        if (m.disputedAt == 0) revert NotDisputed();
        if (m.arbitrated) revert AlreadyResolved();
        // after the window the market has already voided and refunds may be paid out
        if (block.timestamp >= uint256(m.disputedAt) + ARBITER_WINDOW) revert TooLate();
        if (outcome == Outcome.Unresolved) revert InvalidOutcome();

        m.outcome = outcome;
        m.arbitrated = true;
        emit Arbitrated(id, outcome);
    }

    /// @notice Pull your payout once the result is final. Winners split the pot pro-rata;
    ///         Invalid (or nobody on the winning side) refunds everyone.
    function claim(uint256 id) external returns (uint256 payout) {
        // checks
        Outcome o = finalOutcome(id);
        if (o == Outcome.Unresolved) revert NotFinal();
        if (claimed[id][msg.sender]) revert AlreadyClaimed();

        Market storage m = _markets[id];
        uint256 winningPool = o == Outcome.Yes ? m.yesPool : m.noPool;
        if (o == Outcome.Invalid || winningPool == 0) {
            payout = yesStake[id][msg.sender] + noStake[id][msg.sender];
        } else {
            uint256 stake = o == Outcome.Yes ? yesStake[id][msg.sender] : noStake[id][msg.sender];
            payout = (stake * (m.yesPool + m.noPool)) / winningPool; // multiply first, divide last
        }
        if (payout == 0) revert NothingToClaim();

        // effects
        claimed[id][msg.sender] = true;

        // interactions
        token.safeTransfer(msg.sender, payout);
        emit Claimed(id, msg.sender, payout);
    }

    function _market(uint256 id) internal view returns (Market storage) {
        if (id >= marketCount) revert MarketNotFound();
        return _markets[id];
    }
}
