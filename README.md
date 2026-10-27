# Saidso

Prediction markets for your group chat. Ask a yes/no question, friends bet ETH on YES or NO until the deadline, the creator settles it, and the winners split the whole pot pro-rata.

```
contracts/   Solidity + Foundry: PredictionMarket.sol, tests, deploy script
web/         Next.js + wagmi/viem frontend (landing, markets table, market page, create form)
```

## Status

v1 (ETH bets) is complete: 19 unit and fuzz tests pass.

```bash
cd contracts
forge test
```

The frontend runs on demo data until a contract address is configured, so you can see the UI right away.

## Run it

```bash
# contracts
cd contracts
forge build && forge test

# local chain + deploy
anvil
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key <anvil account #0 key, printed when anvil starts>
script/seed-local.sh <deployed address>   # 7 sample markets: open, closed, settled

# web
cd web
cp .env.example .env.local   # set NEXT_PUBLIC_MARKET_ADDRESS, NEXT_PUBLIC_CHAIN=anvil
pnpm install && pnpm dev
```

Deploying to Base Sepolia: `forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --account <keystore> --verify`.

## Design decisions

- **Pull payments.** Winners call `claim()`. The contract never loops over bettors to push ETH, so one bad recipient can't block payouts, and gas stays flat.
- **Checks-effects-interactions.** `claimed` is set before ETH is sent.
- **Refund paths.** If the outcome is `Invalid`, or nobody backed the winning side, every bettor gets their stake back.
- **Trust model.** The creator is the oracle. That fits friends; it doesn't fit strangers. See the roadmap.
- **Rounding.** Pro-rata division can leave a few wei of dust in the contract. The fuzz test bounds it.

## Roadmap

- [x] v1: ETH markets: create, bet, resolve, claim
- [ ] v2: USDC bets (ERC20 `approve` / `transferFrom`, SafeERC20)
- [ ] v3: dispute window, auto-refund if the creator never resolves, invariant tests
- [ ] v4: deploy + verify on Base Sepolia, gas report
- [ ] v5: real leaderboard from `Claimed` events (Ponder/subgraph), optional UMA oracle

## Credits

Fonts: Host Grotesk, Geist Mono, Syne (Google Fonts).

Testnet only. Not financial advice.
