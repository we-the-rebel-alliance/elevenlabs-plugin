# Contributing

## Setup

```sh
git clone https://github.com/we-the-rebel-alliance/elevenlabs-plugin
cd elevenlabs-plugin
npm ci
```

Requires Node 24 and Bun 1.4.4.

## Checks

```sh
npm run check          # every stage, in order, stopping at the first failure
npm run check unit     # one stage
```

Stages: `typecheck`, `unit`, `conformance`, `build`, `icons`, `host`, `pack`, `forbidden`, `copies`, `whitelist`,
`actionlint`. The host and pack stages run on OpenCode 2.4.1, the one tested release; `OPENCODE_BIN_2_4_1` may point at a
stock binary instead of the one `npm` installs.

`npm pack --dry-run` must show the file list in `scripts/check.mjs` and nothing else.

## ElevenLabs' tools

`src/elevenlabs-tools.ts` classifies the 245 tools the live server lists. The capture in `test/fixtures/live-tools.json`
(with `provenance.json` beside it) is what `npm run drift` and `test/unit/live-tools.test.ts` check it against: every
served tool declared, every declared tool served, and each read-only mark equal to ElevenLabs' `readOnlyHint` unless
`READ_ONLY_OVERRIDES` and `test/fixtures/tool-registry.json` give the reason it is stricter. To reconcile after the live
list changes:

1. Save the raw `tools/list` response over `test/fixtures/live-tools.json` (the command is in
   `test/fixtures/README.md`).
2. `npm run drift` names every tool the plugin does not classify, every tool the list has lost, and every tool whose
   annotations disagree with its class.
3. Update `src/elevenlabs-tools.ts`, then `package.json`'s copied `jelly.tools` declaration.
4. `npm run check`.

## Source

The `elevenlabs.conversations` source is metadata only (see AGENTS.md). `npm run conformance` runs the source contract's
kit offline and writes `reports/conformance-report.json`; keep `reports/` out of git.

## Releasing

Releases are out of scope for this phase. `package.json` stays `"private": true`, the version stays `0.0.0`, and no one
pushes a tag or a `release/*` branch until the release workflow is rebuilt.
