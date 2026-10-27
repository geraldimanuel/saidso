#!/usr/bin/env bash
# Seed a local anvil deployment with open, closed and settled markets.
# Bets are in the market's token (MockUSDC on anvil); each account gets 1,000 USDC first.
# Usage: script/seed-local.sh <PredictionMarket address>
set -euo pipefail

PM=${1:?usage: seed-local.sh <PredictionMarket address>}
export ETH_RPC_URL=${ETH_RPC_URL:-http://127.0.0.1:8545}
MNEMONIC="test test test test test test test test test test test junk" # anvil default
key() { cast wallet private-key "$MNEMONIC" "$1"; }

USDC=$(cast call "$PM" "token()(address)")
usdc() { cast to-unit "${1}ether" 12 | cut -d. -f1; } # "0.3" -> 300000 (6 decimals)

create() { cast send -q "$PM" "createMarket(string,uint64)" "$2" "$3" --private-key "$(key "$1")"; }
# approve exactly the bet, then bet: the same two transactions the frontend sends
bet() {
  cast send -q "$USDC" "approve(address,uint256)" "$PM" "$(usdc "$4")" --private-key "$(key "$1")"
  cast send -q "$PM" "bet(uint256,bool,uint256)" "$2" "$3" "$(usdc "$4")" --private-key "$(key "$1")"
}
resolve() { cast send -q "$PM" "resolve(uint256,uint8)" "$2" "$3" --private-key "$(key "$1")"; }

for i in 1 2 3 4; do
  cast send -q "$USDC" "mint(address,uint256)" "$(cast wallet address "$(key $i)")" "$(usdc 1000)" --private-key "$(key 0)"
done

now=$(date +%s)
soon=$((now + 60)) # these close in 60s (approve+bet doubles the txs) so we can settle them below

# 0-2: short-lived, settled / left closed
create 1 "Will Kevin reply to the group chat within an hour?" $soon
create 2 "Will Mira beat everyone at karaoke night?" $soon
create 3 "Will Tom keep his gym streak for 30 days?" $soon
bet 2 0 true 30; bet 3 0 false 50; bet 4 0 false 20
bet 1 1 true 80; bet 4 1 false 20
bet 1 2 true 15; bet 2 2 false 45

# 3-6: open
create 1 "Will Budi be late to dinner on Friday?" $((now + 30 * 3600))
create 2 "Will Sarah finish the marathon under 4 hours?" $((now + 70 * 3600))
create 3 "Will the group trip actually happen this year?" $((now + 140 * 3600))
create 4 "Will Andre's startup ship v1 before December?" $((now + 300 * 3600))
bet 2 3 true 42; bet 3 3 false 18
bet 1 4 true 60; bet 3 4 false 90
bet 1 5 true 25; bet 4 5 false 110
bet 2 6 true 140; bet 3 6 false 35

echo "waiting for the short markets to close..."
until [ "$(cast block latest --field timestamp)" -ge $soon ]; do
  sleep 2
  cast rpc -q evm_mine >/dev/null
done

resolve 1 0 2 # NO
resolve 2 1 1 # YES
# market 2 stays closed + unresolved so you can resolve it from the UI as account #3

echo "seeded $(cast call "$PM" "marketCount()(uint256)") markets"
