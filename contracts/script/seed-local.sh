#!/usr/bin/env bash
# Seed a local anvil deployment with open, closed and settled markets.
# Usage: script/seed-local.sh <PredictionMarket address>
set -euo pipefail

PM=${1:?usage: seed-local.sh <PredictionMarket address>}
export ETH_RPC_URL=${ETH_RPC_URL:-http://127.0.0.1:8545}
MNEMONIC="test test test test test test test test test test test junk" # anvil default
key() { cast wallet private-key "$MNEMONIC" "$1"; }

create() { cast send -q "$PM" "createMarket(string,uint64)" "$2" "$3" --private-key "$(key "$1")"; }
bet() { cast send -q "$PM" "bet(uint256,bool)" "$2" "$3" --value "$4" --private-key "$(key "$1")"; }
resolve() { cast send -q "$PM" "resolve(uint256,uint8)" "$2" "$3" --private-key "$(key "$1")"; }

now=$(date +%s)
soon=$((now + 30)) # these close in 30s so we can settle them below

# 0-2: short-lived, settled / left closed
create 1 "Will Kevin reply to the group chat within an hour?" $soon
create 2 "Will Mira beat everyone at karaoke night?" $soon
create 3 "Will Tom keep his gym streak for 30 days?" $soon
bet 2 0 true 0.3ether; bet 3 0 false 0.5ether; bet 4 0 false 0.2ether
bet 1 1 true 0.8ether; bet 4 1 false 0.2ether
bet 1 2 true 0.15ether; bet 2 2 false 0.45ether

# 3-6: open
create 1 "Will Budi be late to dinner on Friday?" $((now + 30 * 3600))
create 2 "Will Sarah finish the marathon under 4 hours?" $((now + 70 * 3600))
create 3 "Will the group trip actually happen this year?" $((now + 140 * 3600))
create 4 "Will Andre's startup ship v1 before December?" $((now + 300 * 3600))
bet 2 3 true 0.42ether; bet 3 3 false 0.18ether
bet 1 4 true 0.6ether; bet 3 4 false 0.9ether
bet 1 5 true 0.25ether; bet 4 5 false 1.1ether
bet 2 6 true 1.4ether; bet 3 6 false 0.35ether

echo "waiting for the short markets to close..."
until [ "$(cast block latest --field timestamp)" -ge $soon ]; do
  sleep 2
  cast rpc -q evm_mine >/dev/null
done

resolve 1 0 2 # NO
resolve 2 1 1 # YES
# market 2 stays closed + unresolved so you can resolve it from the UI as account #3

echo "seeded $(cast call "$PM" "marketCount()(uint256)") markets"
