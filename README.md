# Saidso

Prediction markets for your group chat. Ask a yes/no question, friends bet USDC on YES or NO until the deadline, the creator calls it, a neutral arbiter friend settles any dispute, and the winners split the whole pot pro-rata.

```
contracts/   Solidity + Foundry: PredictionMarket.sol, tests, deploy script
web/         Next.js + wagmi/viem frontend (landing, markets table, market page, create form)
```

## Status

v3 (disputes + auto-refunds) is complete: 35 unit and fuzz tests plus 3 invariants checked over 128,000 random calls.

**Live site: https://saidso-eight.vercel.app**

Contracts on Base Sepolia:

- v3, USDC + disputes (live site; demo windows 1 h / 10 min / 30 min): [`0xa1c736e608b9a3afb2f28a2fc1a9c13083cf070f`](https://sepolia.basescan.org/address/0xa1c736e608b9a3afb2f28a2fc1a9c13083cf070f)
- v2, USDC: [`0x15504799b04573c1a659b7931c7a498950b2c6f0`](https://sepolia.basescan.org/address/0x15504799b04573c1a659b7931c7a498950b2c6f0)
- v1, ETH (git tag `v1`): [`0x28d18bb0fce140a8ce5052127b3835f4b8ae6b87`](https://sepolia.basescan.org/address/0x28d18bb0fce140a8ce5052127b3835f4b8ae6b87)

Get test USDC for Base Sepolia at [faucet.circle.com](https://faucet.circle.com).

```bash
cd contracts
forge test
```

The frontend runs on demo data until a contract address is configured, so you can see the UI right away.

## Run it

```bash
# contracts (forge-std and OpenZeppelin are git submodules: clone with --recursive)
cd contracts
forge build && forge test

# local chain + deploy
anvil
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast \
  --private-key <anvil account #0 key, printed when anvil starts>
# no TOKEN set on anvil -> also deploys a MockUSDC
script/seed-local.sh <PredictionMarket address>   # mints test USDC, 7 sample markets, anvil account #5 as arbiter
# on anvil the windows default to 10 / 2 / 5 minutes so the whole dispute flow can be clicked through

# web
cd web
cp .env.example .env.local   # set NEXT_PUBLIC_MARKET_ADDRESS, NEXT_PUBLIC_CHAIN=anvil
pnpm install && pnpm dev
```

Deploying to Base Sepolia (key lives in an encrypted Foundry keystore, `ETHERSCAN_API_KEY` set in the shell):

```bash
cast wallet import deployer --interactive
# TOKEN = Circle's USDC on Base Sepolia
TOKEN=0x036CbD53842c5426634e7929541eC2318f3dCF7e \
  forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --account deployer --broadcast --verify
```

## Gas

`forge test --gas-report`, median gas per call (v3). On Base Sepolia at ~0.006 gwei a bet costs well under $0.01.

| Function | Gas |
| --- | --- |
| `createMarket` | 116,682 |
| `bet` (plus roughly 50k for the `approve` on the token) | 98,333 |
| `resolve` | 37,227 |
| `dispute` | 46,360 |
| `arbitrate` | 29,860 |
| `claim` | 77,453 |

## Design decisions

- **Pull payments.** Winners call `claim()`. The contract never loops over bettors to push tokens, so one bad recipient can't block payouts, and gas stays flat.
- **Checks-effects-interactions.** `claimed` is set before tokens are sent, and pools are updated before a bet pulls tokens in.
- **Refund paths.** If the outcome is `Invalid`, or nobody backed the winning side, every bettor gets their stake back.
- **Exact approvals.** The UI approves exactly the bet amount, never an unlimited allowance, so nothing stays exposed if the contract were ever compromised.
- **Plain ERC-20 only.** Pools record the requested amount, so fee-on-transfer or rebasing tokens are unsupported (USDC is neither).
- **Nobody can strand the pot.** After the deadline the creator has a resolve window, bettors then get a dispute window, and a disputed result goes to the market's arbiter. A creator or arbiter who stays silent voids the market, so every path ends in payouts or refunds. Windows are immutable constructor args: 7 days / 24 hours / 3 days by default.
- **Final means final.** `finalOutcome()` derives the result from timestamps, and late `resolve` / `arbitrate` calls revert, so a result can't change after anyone may have claimed on it. The invariant suite checks this, alongside "balance equals deposits minus payouts" and "no market pays out more than its pot".
- **Trust model.** The creator calls the result and a friend arbitrates disputes. The arbiter can't be the creator and can't bet from their address, but nothing stops them betting from another wallet: it fits friends, not strangers. See the roadmap.
- **Rounding.** Pro-rata division can leave a few wei of dust in the contract. The fuzz test bounds it.

## Roadmap

- [x] v1: ETH markets: create, bet, resolve, claim
- [x] v2: USDC bets (ERC20 `approve` / `transferFrom`, SafeERC20)
- [x] v3: dispute window with an arbiter, auto-refund if the creator or arbiter goes silent, invariant tests
- [x] v4: deploy + verify on Base Sepolia, gas report
- [ ] v5: real leaderboard from `Claimed` events (Ponder/subgraph), optional UMA oracle

## Credits

Fonts: Host Grotesk, Geist Mono, Syne (Google Fonts).

Testnet only. Not financial advice.
