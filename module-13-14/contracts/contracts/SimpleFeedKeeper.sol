// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (uint80, int256 answer, uint256, uint256 updatedAt, uint80);
}

interface AutomationCompatibleInterface {
    function checkUpkeep(bytes calldata) external returns (bool, bytes memory);
    function performUpkeep(bytes calldata) external;
}

/**
 * @title SimpleFeedKeeper
 * @notice Checks one feed per run (round-robin). Two modes:
 *  - Exception-only: perform only when off-chain check sees a problem
 *  - Cadence: perform every `interval` seconds (still Alert only if problem)
 */
contract SimpleFeedKeeper is AutomationCompatibleInterface {
    event Alert(address indexed feed, string reason, uint256 updatedAt);
    event Tick(uint256 indexed runId, uint256 indexChecked);

    address[] public feeds;
    uint32   public maxStaleness;   // seconds
    uint32   public interval;       // seconds between runs in cadence mode
    bool     public cadenceMode;    // true = run every interval, false = exception-only

    uint256  public cursor;         // which feed index to check next
    uint256  public runCount;
    uint256  public lastTick;       // last performUpkeep timestamp

    constructor(
        address[] memory _feeds,
        uint32 _maxStalenessSeconds,        // e.g. 3600 (1h)
        uint32 _intervalSeconds,            // e.g. 60 (1m) for demos; 0 to disable cadence
        bool   _cadenceMode                 // true=cadence; false=exception-only
    ) {
        require(_feeds.length > 0, "no feeds");
        feeds = _feeds;
        maxStaleness = _maxStalenessSeconds > 0 ? _maxStalenessSeconds : 3600;
        interval     = _intervalSeconds;
        cadenceMode  = _cadenceMode;
    }

    function checkUpkeep(bytes calldata) external view override returns (bool upkeepNeeded, bytes memory performData) {
        uint256 idx = cursor % feeds.length;

        if (cadenceMode) {
            // Run every `interval` seconds (if interval==0, behave like exception-only)
            if (interval > 0 && block.timestamp < lastTick + interval) return (false, "");
            return (true, abi.encode(idx)); // we'll do the health check on-chain
        }
        address feed = feeds[idx];
        try AggregatorV3Interface(feed).latestRoundData() returns (
            uint80, int256 answer, uint256, uint256 updatedAt, uint80
        ) {
            if (answer <= 0 || block.timestamp > updatedAt + maxStaleness) {
                return (true, abi.encode(idx));
            }
            return (false, "");
        } catch {
            return (true, abi.encode(idx));
        }
    }

    function performUpkeep(bytes calldata performData) external override {
        uint256 idx = cursor % feeds.length;
        if (performData.length == 32) {
            uint256 proposed = abi.decode(performData, (uint256));
            if (proposed < feeds.length) idx = proposed;
        }

        address feed = feeds[idx];

        // Recheck on-chain; emit Alert only if there's a real issue now
        try AggregatorV3Interface(feed).latestRoundData() returns (
            uint80, int256 answer, uint256, uint256 updatedAt, uint80
        ) {
            if (answer <= 0) {
                emit Alert(feed, "non-positive-answer", updatedAt);
            } else if (block.timestamp > updatedAt + maxStaleness) {
                emit Alert(feed, "stale", updatedAt);
            }
        } catch {
            emit Alert(feed, "call-reverted", 0);
        }

        runCount += 1;
        emit Tick(runCount, idx);

        cursor = (idx + 1) % feeds.length;
        lastTick = block.timestamp;
    }
}