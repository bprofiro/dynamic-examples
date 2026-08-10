# MOO-717 handoff — Moonwell lending recipe

Autonomous session output for [MOO-717](https://linear.app/moonwell/issue/MOO-717/create-dynamic-wallet-moonwell-lending-recipe-app-and-docs).
Branch: `feat/nextjs-defi-lending-moonwell`, pushed to `bprofiro/dynamic-examples` only.
**No PR was opened against `dynamic-labs-oss/examples`** — that's your call.

> Delete this file (and the two `MOO-717-*.md` planning docs, which are untracked)
> before opening the upstream PR. It lives in its own commit so it can be dropped
> cleanly.

---

## What was built

`examples/nextjs-defi-lending-moonwell/` — a Next.js 15 App Router example, scaffolded
from `nextjs-defi-lending-morpho` and rewritten against the current Dynamic JS SDK.

- `/lend` — all non-deprecated Base markets with live APYs from
  `api.moonwell.fi/v1/markets?chainId=8453`. Only the USDC row links onward.
- `/lend/[mToken]` — USDC market: wallet balance, supplied balance, and a
  Supply/Withdraw form.
- Headless email-OTP sign-in (`useSendEmailOTP` / `useVerifyOTP`) — no social
  buttons, matching the sandbox environment where only the `dynamic` email
  provider is enabled.
- `RECIPE.mdx` — the Mintlify recipe doc, mirroring the Morpho recipe's section
  order. Every annotated code block is a **verbatim** excerpt of a real file in
  the example (verified programmatically, see below).

## Verified in this session

| Check | Result |
|---|---|
| `pnpm install` | clean |
| `pnpm typecheck` (`tsc --noEmit`) | clean |
| `pnpm lint` | no warnings or errors |
| `pnpm test` (vitest) | **22 passed** — `src/lib/moonwell.ts` |
| `pnpm build` | clean; 4 routes |
| `npx depcheck` | no unused runtime deps (devDep hits are config-file false positives) |
| Grep sweep for `morpho`/`Morpho` | only the intentional cross-link in `RECIPE.mdx` |
| `.env.local` committed? | no — gitignored; `.env.example` committed instead |

### Facts re-verified against live sources (§1 of the plan)

- **Markets API** — 200, `meta.chain: eip155:8453`, 20 markets, exactly 1
  deprecated. Field names and the "APY values are already percentages" rule
  confirmed.
- **The `mUSDC` collision is real and still present**: native USDC
  `0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22` (`deprecated: false`) and legacy
  USDbC `0x703843C3379b52F9FF486c9f5892218d2a065cC8` (`deprecated: true`) both
  report the symbol `mUSDC`. Markets are keyed by `mTokenAddress` throughout.
- **Contracts on Base**, read through the app's own ABIs:
  `exchangeRateStored` = `231174377482736` (≈2.31e14, > 1e14 as expected),
  mUSDC `decimals` = 8, USDC `decimals` = 6, mUSDC `underlying()` = the USDC
  address. `underlyingFromMTokens(1e8, rate)` = `23117` → 1 mUSDC redeems for
  ~0.023117 USDC. ABI + addresses are correct.

### Verified in the browser (dev server, real env ID)

- `/lend` rendered **19 active markets** live from the API. **USDbC is absent.**
  Only the USDC row shows a Supply button; the rest read "View only".
- `/lend/0xEdc817…6c22` rendered 3.67% supply APY, 3.98% incl. rewards,
  $15.69M total supplied — matching the API response.
- The header **"Sign in"** button rendered rather than a stuck "Loading…", which
  means `useInitStatus()` reached `finished`: the environment ID
  `f701ab2e-d0db-4195-ae95-8e73991cb6b7` and the `http://localhost:3000` CORS
  origin are both good.
- Clicking Sign in opened the email-OTP form. Signed out, balances render `—`
  and the action button reads "Sign in to supply".
- Console: clean (only the React DevTools notice).

Screenshots were taken in-session but deliberately **not committed** — binaries
would be noise in the upstream PR.

## Deviations from the plan, and why

1. **Dynamic SDK pinned to `1.26.0`, not the template's `1.2.1`.** The plan said
   pin the template versions, but also that the quickstart wins on conflicts. The
   quickstart's API (`useGetWalletAccounts` returning a react-query result,
   `useOnEvent`, `useInitStatus`, `useSendEmailOTP`/`useVerifyOTP`) simply does
   not exist in `react-hooks@0.26.5`, which exposes `useWalletAccounts()`
   returning a bare array and `useEvent`. I confirmed this by unpacking both
   packages and reading their `.d.ts` files, then pinned the latest release whose
   surface matches the quickstart. Framework versions follow the repo's current
   standard (Next 15.5.9, React 19.1.2, TS 5.9.3), matching `nextjs-iron-ramp`.
2. **`createWalletClientForWalletAccount` takes no `chain` argument** in 1.26.0 —
   the plan's snippet passed `{ walletAccount, chain: base }`. It derives the
   network from the wallet account, so `useLendingOperations` asserts
   `walletClient.chain?.id === 8453` and throws a readable error otherwise.
3. **Quickstart Step 5 has a small error.** It reads `sendResult?.otpVerification`,
   but `useSendEmailOTP`'s `data` **is** the `OTPVerification` — there is no
   wrapper property. `Login.tsx` uses `data` directly. The Critical API Reference
   table (`verificationToken`, not `otp`) is correct and followed.
4. **`initializeClient()` is browser-guarded.** `"use client"` modules still
   execute during Next.js SSR, where there is no wallet environment. Extensions
   and init run inside `typeof window !== "undefined"`; `universalLink` falls back
   to `http://localhost:3000` on the server.
5. **One type cast in `providers.tsx`.** `useGetWalletAccounts()` is typed
   `BaseWalletAccount<Chain>[]` while `isEvmWalletAccount` is declared over the
   chain-specific `WalletAccount` union, so the guard won't accept the array
   directly. Cast is commented in place. Worth mentioning to Dynamic in review —
   it looks like an SDK typing wart, not something an integrator should have to
   work around.
6. **`pnpm-workspace.yaml` added to the example.** pnpm 11 refuses to install
   cleanly (`ERR_PNPM_IGNORED_BUILDS`) until `sharp`/`protobufjs`/`unrs-resolver`
   are approved, and pnpm 11 moved that setting out of `package.json`. Existing
   examples in this repo will hit the same wall on pnpm 11.
7. **Removed from the template scaffold** as unused: `@coinbase/onchainkit`,
   `crypto-browserify`, `stream-browserify`, `process`, both radix packages,
   `class-variance-authority`, `tailwind.config.js` (a Tailwind v3 leftover in a
   v4 setup), and the duplicate `next.config.js`.
8. **Vitest added** as a devDependency of this example only, testing just the pure
   module. Zero runtime footprint; trivially removable if Dynamic objects.
9. **Styled after moonwell.fi, not the Morpho example.** The plan called for
   keeping the Morpho look for review consistency; you overrode that after seeing
   it. The palette in `globals.css` mirrors the Moonwell app's Tailwind theme
   (`#2474DA` Moonwell Blue, the grey ramp, the Base chip colours), the market
   list matches the moonwell.fi table layout, and figures are monospaced as they
   are there. **GT-America / GT-America-Mono are licensed** (Grilli Type) and
   cannot be redistributed in a public repo, so Inter and IBM Plex Mono stand in.
   If Dynamic pushes back on the divergence, the styling is confined to
   `globals.css`, `layout.tsx`, and the component class names — the SDK wiring is
   untouched.
10. **Token logos copied from `moonwell-frontend-v2-react`.** I originally drew
    monograms and flagged the licensing question; you asked for the real icons,
    so the 19 SVGs for the active Base markets are now in `public/tokens/`, named
    by lowercased symbol (the same convention the Moonwell app uses). A market
    with no matching file falls back to a monogram, so a new listing can never
    render a broken image — verified: 19/19 load, 0 broken.

    Two things to be aware of before the upstream PR:
    - **These are third-party brand marks** (Circle's USDC, Coinbase's cbBTC,
      Lido's wstETH, and so on) that Moonwell vendored into its own repo. Using
      them to identify the asset they represent is ordinary practice in DeFi
      UIs, but publishing them in Dynamic's repo is a redistribution decision
      that is yours, not mine, and Dynamic may have their own policy.
    - **`aero.svg` was 470 KB** — pathological for a 36 px icon. I ran it
      through `svgo` at its default precision, halving it to 220 KB, and
      confirmed the result is pixel-identical to the original at 400 px. It is
      still by far the largest file in the example (the other 18 total ~80 KB).
      Worth asking Aerodrome or the Moonwell design owner for a simplified mark
      if this bothers a reviewer.
11. **GT-America is declared but not shipped — this one needs your decision.**
    You asked for Moonwell's real font family. `globals.css` now declares
    `GT-America` / `GT-America-Mono` ahead of Inter / IBM Plex Mono in the font
    stack, with `@font-face` rules pointing at `public/fonts/`. That directory
    is **gitignored**, so the app renders in the real typeface the moment the
    files are there and silently falls back to Inter when they are not.

    I did not copy the `.woff2` files out of `moonwell-frontend-v2-react`. Token
    logos are trademarks used to identify the asset they represent, which is
    ordinary practice; a **webfont is different** — GT-America is licensed
    per-domain from Grilli Type, and putting the binaries in a public GitHub
    repo makes them downloadable by anyone, which is squarely what that licence
    prohibits. It would expose Moonwell (the licensee) and Dynamic (the
    publisher). The sandbox blocked the copy as well.

    Three ways forward, your call:
    - **Ship as-is** (recommended): licensed users drop the files in locally;
      the public example renders in Inter. To see it yourself right now:
      `mkdir -p public/fonts && cp ~/www/moonwell-frontend-v2-react/src/assets/fonts/GT-America/GT-America-{Standard-Regular,Standard-Bold,Mono-Light}.woff2 ~/www/moonwell-frontend-v2-react/src/assets/fonts/GT-America/GT-America-Mono-Regular.otf public/fonts/`
    - **Confirm the licence covers redistribution** in an open-source example,
      then remove `/public/fonts/` from `.gitignore` and commit them.
    - **Drop the `@font-face` block** from `globals.css` entirely and stay on
      Inter / IBM Plex Mono, so the published example makes no font requests
      that cannot resolve.
12. **Every market row is now a link.** Previously only USDC was clickable. All
    19 rows navigate to a detail page with that market's live rates; the detail
    page renders supply/withdraw for USDC and an explanatory read-only panel for
    everything else, since the transaction path is USDC-scoped per the ticket.
    Unknown mToken addresses (including the deprecated USDbC market, which is
    filtered out of the list) still 404. Generalising supply/withdraw to every
    market is doable but was not in scope — it needs per-market decimals read
    on-chain, since the API does not return them.
13. **The wallet starts on Ethereum, not Base — fixed in code, and there is a
    dashboard fix you may also want.** Your first real supply attempt failed with
    "Wallet is on chain 1". Root cause, confirmed via `dyn export`: the sandbox
    environment has **Ethereum Mainnet enabled alongside Base**
    (`networks.evm[].chainName: Ethereum Mainnet, enabled: true`), and Ethereum
    resolves first in the network list, so the embedded wallet opens on chain 1.

    - **Code fix (done).** `useLendingOperations` now reads
      `getActiveNetworkId()` and calls `switchActiveNetwork()` to Base before
      building the wallet client — the order matters, because
      `createWalletClientForWalletAccount` derives its chain from the wallet's
      current network. A new `switching` tx phase drives a "Switching to Base…"
      button label, shown only when a switch is actually needed. The old
      wrong-chain check is kept as a post-switch backstop. This follows the
      shape used in `moonwell-frontend-v2-react` (`useSwitchNetwork` /
      `useNetworkSwitchGuard`: await the switch, then dispatch), minus their 90s
      timeout and generation tokens — that machinery exists because an external
      wallet's `wallet_switchEthereumChain` prompt can hang forever, whereas an
      embedded WaaS wallet switches with no prompt.
    - **Dashboard fix (your call, not done).** Disabling Ethereum Mainnet on the
      sandbox env would make Base the only EVM network, so wallets start there
      and no switch is ever needed. I did not change your environment config.
      The code fix is worth keeping either way — a user can always switch
      networks themselves.

    Still unverified on-chain: I cannot sign, so the switch path has been
    typechecked and built but never actually executed against a funded wallet.
    That is the first thing to retest.
14. **The approve transaction was going to a public RPC instead of being signed.**
    Second failure: `wallet_sendTransaction` POSTed to `https://mainnet.base.org`,
    answered `-32601 rpc method is unsupported` / 403. Traced through the SDK
    source rather than guessed — `createWalletClientForWalletAccount` has two
    branches:
    - the wallet provider exposes `createViemWalletClient` (the WaaS provider
      does) → viem gets a **local** account that signs in-process and broadcasts
      `eth_sendRawTransaction`;
    - otherwise → `toAccount(address)`, a **json-rpc** account over
      `custom(walletProvider)`, which forwards `eth_sendTransaction` to whatever
      the provider proxies to.

    The failing payload carried only `data`/`from`/`to` — no gas, nonce or
    chainId — which is the json-rpc shape, so the second branch ran. `addEvmExtension()`
    registers EIP-6963 external-wallet discovery *as well as* WaaS, and
    `providers.tsx` was picking `accounts.find(isEvmWalletAccount)` — the *first*
    EVM account, which need not be the embedded one. It now prefers the WaaS
    account via `isWaasWalletAccount`, falling back to any EVM account.

    Two supporting changes:
    - `getWalletClient` now rejects a non-`local` viem account with a message
      naming the cause, instead of letting it fail three layers down as an RPC
      error.
    - `transformers.networksData` on the client filters the EVM list to Base.
      Per the SDK docs the first network is the default for a fresh wallet, so
      this fixes the chain-1 problem at the source — better than the runtime
      switch in #13, which stays as a safety net. The same transformer prepends
      `BASE_RPC_URL`, which now defaults to Moonwell's own endpoint,
      `https://rpc.moonwell.fi/main/evm/8453` (overridable with
      `NEXT_PUBLIC_BASE_RPC_URL`). Verified before wiring it in: `eth_chainId`
      returns `0x2105`, and `eth_estimateGas` **succeeds for the exact approve
      call that was failing** — plus CORS is open from `localhost:3000`, checked
      with a `fetch` from the page origin. Base's public endpoint was returning
      403 in your trace.

    **That diagnosis was incomplete.** The WaaS-account preference above is a
    correct hardening, but it was not the cause — see #15.
15. **The actual cause: simulating with an address instead of an account object.**
    Third failure, `The method "eth_sendTransaction" does not exist`. My
    fail-fast check from #14 passed, which was the clue: the wallet *client*
    carried a `local` account, yet `eth_sendTransaction` was still being used.
    Those two facts can only coexist for one reason — viem's `writeContract`
    prefers the account on the *request* over the one on the client:

    ```js
    const { abi, account: account_ = client.account, ... } = parameters
    ```

    `useLendingOperations` was simulating with `account: owner`, an address
    *string*. viem parses that into a **`json-rpc`** account, and
    `writeContract(request)` then honoured it instead of the embedded wallet's
    local signer — so viem asked the transport to sign via
    `eth_sendTransaction`, which went to the RPC endpoint, which holds no keys.
    Changing the RPC could never have fixed this; it only changed which
    endpoint refused.

    Fix: `run()` now hands the simulate callback `walletClient.account` (the
    account object) rather than the address, so the request carries the local
    account and viem signs in-process and broadcasts `eth_sendRawTransaction`.

    **Verified at the mechanism level**, since I still cannot sign: simulating
    the real `approve` call both ways against Base and inspecting the result —
    address string → `request.account.type === "json-rpc"`, account object →
    `"local"`. That is the whole bug in one line of output.

    Worth telling Dynamic: `nextjs-defi-lending-morpho` (the template this was
    scaffolded from) uses `account: address as \`0x${string}\`` in all four of
    its operation hooks. On SDK 1.2.1 that may have been fine, but on a
    locally-signing embedded wallet it is the same defect. I have not tested
    their example, so treat it as a lead rather than a finding.

    The `RECIPE.mdx` `<Info>` callout on this is the most valuable paragraph in
    the doc — it is a silent, misdirecting failure that every integrator using
    simulate-then-write will hit.

## Known gaps

- **Nothing was executed on-chain.** No approve, mint, redeem, or redeemUnderlying
  has ever run from this code. The simulate-then-check-error-code path is
  implemented and typechecks, but it is unproven against a funded wallet.
- **No login was performed.** WaaS wallet creation via `WaasBootstrap` is wired per
  the quickstart but never observed firing, because signing in needs your email
  and the code sent to it.
- The GitHub links in `README.md` and `RECIPE.mdx` point at
  `dynamic-labs-oss/examples/tree/main/examples/nextjs-defi-lending-moonwell`,
  which **404s until the upstream PR merges**. That's the same convention the
  Morpho recipe uses.
- No video. The Morpho recipe opens with a `<Frame>` Loom embed; `RECIPE.mdx` has
  no equivalent, since fabricating a link would be worse than omitting one.

## Your checklist

1. `cd examples/nextjs-defi-lending-moonwell && pnpm install && pnpm dev`, then log
   in with email OTP and confirm the embedded wallet is created (the header should
   go from "Setting up…" to a truncated address).
2. Fund the embedded wallet with ~5 USDC and ~$1 of ETH on Base.
3. Supply 1 USDC — expect an approve tx, then a mint tx, then a supplied balance of
   ≈1 USDC. Then withdraw 0.5, then withdraw max (click Max, which routes to
   `redeem` and should leave 0 mUSDC). Confirm the Basescan links work.
4. Read `RECIPE.mdx` top to bottom as an external developer would.
5. Open the PR to `dynamic-labs-oss/examples` — drop this file and the
   `MOO-717-*.md` docs first. Then follow whatever Dynamic asks for in review and
   ping Alex for the comms follow-up.

## Reverting the dashboard change

The earlier CLI session added the `http://localhost:3000` CORS origin
(id `871c27c7-75fa-46fd-a7cf-a7394ebd4977`). If you want it gone:
`dyn origins delete 871c27c7-75fa-46fd-a7cf-a7394ebd4977`.
