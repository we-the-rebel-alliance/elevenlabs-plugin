# Agent notes

This repository is an OpenCode plugin for ElevenLabs. Read the README for what it does; this file is for working on it.
Phase 4a moved the plugin to `@we-the-rebel-alliance/elevenlabs-plugin` and OpenCode `>=2.4.1 <2.5.0`; the plugin
contract work (a `capabilities` manifest, `accounts`, plugin-kit and releases) comes later.

## Layout and checks

- `src/` is the plugin, `test/` the suites, `scripts/` the checks. `npm run check` runs typecheck, unit, conformance,
  build, icons, host, pack, forbidden, copies, whitelist and actionlint, in that order.
- The one tested OpenCode release is `2.4.1`, pinned in `devDependencies` and `src/constants.ts`. `npm run check` runs
  the host and pack stages on it, with no older-host matrix.
- `npm run drift` compares the plugin's tool table with `test/fixtures/live-tools.json`.
- The host suite needs Bun 1.4.4 and Node 24. It starts an embedded OpenCode, so it must not run against a real account:
  the fake server is loopback only, and any fetch that leaves loopback fails the run. The harness builds that host
  through `PromiseSdk.create` with the SDK's `overrides`, so its Automation service also runs the scheduler, as
  `opencode serve` does; Code Mode with nobody present runs there as an automation's code action (`unattended` in
  `test/host/harness.ts`).
- The fixed-context budget: the namespace line (`NAMESPACE_DESCRIPTION`) is at most 400 characters, each skill
  description at most 300, no pinned tools and no per-request hooks. Keep it that way; the texts are asserted in the
  unit suite.

## Forbidden in this repository

Checked by `scripts/check-forbidden.mjs` across `src/`, `test/`, `scripts/` and `dist/`:

- fork-only markers (`dispatch-lease`, `catalog-ownership`, text-only response markers), `options.mcp` delegation,
  `Plugin.image`, imported OAuth grants;
- the V1 plugin API (`@opencode-ai/*`), V1 hooks (`tool.execute.before`, `chat.message`, `permission.ask`),
  `ctx.generate.text`, `experimental.policies`, and `@opencode/ai`;
- a permission hook other than the tools RPC's one evaluate hook;
- private host source paths and host checkouts;
- machine-local home and temp paths;
- internal process wording: who decided what, lane names, ticket references of our own.

## House rules

- The tools RPC's transport is source-contract's `tools-rpc` module (`@we-the-rebel-alliance/source-contract`, a dev
  dependency pinned to a tag and bundled into `dist/index.js`); `src/host/tools-rpc.ts` is ElevenLabs' part of it.
  `test/support/jelly-kit.ts` and `test/support/jelly-settings.ts` are copies every plugin shares: `npm run check` fails
  the copies stage when either differs. Do not edit them; the next phase replaces them.
- The `sources` and `jelly` keys in `package.json` are carried unchanged for the next phase. Do not add new behaviour
  behind them.
- The source `elevenlabs.conversations` (`src/events.ts`, `package.json`'s `sources`) is metadata only: the callers are
  other people, so an event never carries a caller, a transcript, a summary, a score or feedback, and its `text` stays
  empty. It reads only `agents_list_conversations`, `agents_list` and `agents_get`, all free reads (the last two for
  each agent's retention, which decides its `gap`); every tool it adds must be a free read, `permission.operations`
  must name exactly what it reads, and the conformance stage (`npm run conformance`) fails otherwise.
- The tool table is `src/elevenlabs-tools.ts` and nothing else: the default rules, the tools RPC, status, the spending
  guard, the copied Jelly declaration and the tests all derive from it.
- Every error the plugin raises has a code from `PLUGIN_CODES`, and the configuration guide's table must match it
  exactly.
- The plugin never sees the OAuth token, and never prints one. Anything read from the network goes through
  `src/redact.ts` before it reaches status or the session.
- A tool that writes asserts its own permission inside `execute`; a declared `permission` alone does not ask.
- The hosted MCP server's own text is passed through by OpenCode 2.4.1 and cannot be overridden. Where it asks for an
  unpinned `npx … @latest` setup, the namespace line says setup runs only when the user asks. Keep that counter in
  `NAMESPACE_DESCRIPTION`.
- The icon `assets/icon.svg` (and the two PNGs rendered from it) is ElevenLabs' own "11" symbol, the published
  `elevenlabs-symbol.svg` from https://elevenlabs.io/brand in its own 876 canvas: the two black bars exactly as published,
  on a white holding square three times their height, as the brand page asks. `opencode.vendor.mark` is `true`. Do not
  recolour, redraw or combine it, and keep the README's trademark line.
- Releases come in the next phase. Until then, do not push tags or `release/*` branches, and do not commit, tag or
  publish a release by hand.
- No personal email in anything we publish. Use the repository's configured commit identity; never a work or personal
  address, or a local hostname.
