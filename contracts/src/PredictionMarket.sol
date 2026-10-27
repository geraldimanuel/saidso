// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PredictionMarket (v1, ETH)
/// @notice Friend-group yes/no markets. Creator asks a question, friends bet ETH on YES or NO
///         until the deadline, creator resolves, winners split the whole pot pro-rata.
contract PredictionMarket {
    enum Outcome {
        Unresolved,
        Yes,
        No,
        Invalid // nobody wins -> everyone gets their stake back
    }

    struct Market {
        address creator;
        uint64 deadline;
        Outcome outcome;
        uint256 yesPool;
        uint256 noPool;
        string question;
    }

    uint256 public marketCount;
    mapping(uint256 => Market) internal _markets;
    mapping(uint256 => mapping(address => uint256)) public yesStake;
    mapping(uint256 => mapping(address => uint256)) public noStake;
    mapping(uint256 => mapping(address => bool)) public claimed;

    event MarketCreated(uint256 indexed id, address indexed creator, uint64 deadline, string question);
    event BetPlaced(uint256 indexed id, address indexed bettor, bool yes, uint256 amount);
    event MarketResolved(uint256 indexed id, Outcome outcome);
    event Claimed(uint256 indexed id, address indexed bettor, uint256 amount);

    error EmptyQuestion();
    error DeadlineInPast();
    error MarketNotFound();
    error BettingClosed();
    error ZeroAmount();
    error NotCreator();
    error TooEarly();
    error AlreadyResolved();
    error InvalidOutcome();
    error NotResolved();
    error AlreadyClaimed();
    error NothingToClaim();
    error TransferFailed();

    // ---------------------------------------------------------------------
    // Markets
    // ---------------------------------------------------------------------

    function createMarket(string calldata question, uint64 deadline) external returns (uint256 id) {
        if (bytes(question).length == 0) revert EmptyQuestion();
        if (deadline <= block.timestamp) revert DeadlineInPast();

        id = marketCount++;
        Market storage m = _markets[id];
        m.creator = msg.sender;
        m.deadline = deadline;
        m.question = question;

        emit MarketCreated(id, msg.sender, deadline, question);
    }

    function getMarket(uint256 id) external view returns (Market memory) {
        if (id >= marketCount) revert MarketNotFound();
        return _markets[id];
    }

    // ---------------------------------------------------------------------
    // Betting, resolving, claiming
    // ---------------------------------------------------------------------

    /// @notice Stake msg.value on YES (`yes = true`) or NO until the deadline.
    function bet(uint256 id, bool yes) external payable {
        if (id >= marketCount) revert MarketNotFound();
        Market storage m = _markets[id];
        if (block.timestamp >= m.deadline) revert BettingClosed();
        if (msg.value == 0) revert ZeroAmount();

        if (yes) {
            m.yesPool += msg.value;
            yesStake[id][msg.sender] += msg.value;
        } else {
            m.noPool += msg.value;
            noStake[id][msg.sender] += msg.value;
        }

        emit BetPlaced(id, msg.sender, yes, msg.value);
    }

    /// @notice Creator sets the result once betting has closed. One shot, no changes after.
    function resolve(uint256 id, Outcome outcome) external {
        if (id >= marketCount) revert MarketNotFound();
        Market storage m = _markets[id];
        if (msg.sender != m.creator) revert NotCreator();
        if (block.timestamp < m.deadline) revert TooEarly();
        if (m.outcome != Outcome.Unresolved) revert AlreadyResolved();
        if (outcome == Outcome.Unresolved) revert InvalidOutcome();

        m.outcome = outcome;
        emit MarketResolved(id, outcome);
    }

    /// @notice Pull your payout after resolution. Winners split the pot pro-rata;
    ///         Invalid (or nobody on the winning side) refunds everyone.
    function claim(uint256 id) external returns (uint256 payout) {
        // checks
        if (id >= marketCount) revert MarketNotFound();
        Market storage m = _markets[id];
        if (m.outcome == Outcome.Unresolved) revert NotResolved();
        if (claimed[id][msg.sender]) revert AlreadyClaimed();

        uint256 winningPool = m.outcome == Outcome.Yes ? m.yesPool : m.noPool;
        if (m.outcome == Outcome.Invalid || winningPool == 0) {
            payout = yesStake[id][msg.sender] + noStake[id][msg.sender];
        } else {
            uint256 stake = m.outcome == Outcome.Yes ? yesStake[id][msg.sender] : noStake[id][msg.sender];
            payout = (stake * (m.yesPool + m.noPool)) / winningPool; // multiply first, divide last
        }
        if (payout == 0) revert NothingToClaim();

        // effects
        claimed[id][msg.sender] = true;

        // interactions
        (bool ok,) = msg.sender.call{value: payout}("");
        if (!ok) revert TransferFailed();
        emit Claimed(id, msg.sender, payout);
    }
}
