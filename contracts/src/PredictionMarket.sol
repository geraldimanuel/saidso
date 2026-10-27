// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title PredictionMarket (v1, ETH)
/// @notice Friend-group yes/no markets. Creator asks a question, friends bet ETH on YES or NO
///         until the deadline, creator resolves, winners split the whole pot pro-rata.
/// @dev Learning scaffold: createMarket + views are done as a worked example.
///      bet / resolve / claim are yours — make `forge test` go green.
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
    error NotImplemented();

    // ---------------------------------------------------------------------
    // Done for you
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
    // Your turn. Each TODO lists the rules the tests check.
    // ---------------------------------------------------------------------

    /// TODO:
    /// - revert MarketNotFound if id doesn't exist
    /// - revert BettingClosed if block.timestamp >= deadline
    /// - revert ZeroAmount if msg.value == 0
    /// - add msg.value to the right pool + the sender's stake, emit BetPlaced
    function bet(uint256 id, bool yes) external payable {
        id; yes;
        revert NotImplemented();
    }

    /// TODO:
    /// - revert MarketNotFound / NotCreator / TooEarly (before deadline) / AlreadyResolved
    /// - revert InvalidOutcome if outcome == Unresolved
    /// - store outcome, emit MarketResolved
    function resolve(uint256 id, Outcome outcome) external {
        id; outcome;
        revert NotImplemented();
    }

    /// TODO (pull payments — winners withdraw, contract never pushes):
    /// - revert NotResolved / AlreadyClaimed
    /// - payout:
    ///     Invalid, or winning side's pool is 0  -> refund yesStake + noStake
    ///     otherwise -> winnerStake * (yesPool + noPool) / winningPool
    /// - revert NothingToClaim if payout == 0
    /// - mark claimed BEFORE sending ETH (checks-effects-interactions), then send, emit Claimed
    /// - returns the payout
    function claim(uint256 id) external returns (uint256 payout) {
        id;
        payout;
        revert NotImplemented();
    }
}
