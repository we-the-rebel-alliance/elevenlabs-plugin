# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org).

## 0.0.0 (unreleased)

Phase 4a of the plugin-family rebuild: the repository is `we-the-rebel-alliance/elevenlabs-plugin`, the package is
`@we-the-rebel-alliance/elevenlabs-plugin`, and the version restarts at `0.0.0`.

### Changed

- **OpenCode 2.4.1 exactly.** The `@opencode/client`, `@opencode/plugin` and `@opencode/sdk` development dependencies
  are `2.4.1`, the supported host range is `>=2.4.1 <2.5.0`, and `2.4.1` is the only tested release. Tested on 2.4.1.
  The host matrix and the code paths for older releases are gone; the host harness discovers a server with
  `server/discover`, reads results in the 2026-07-28 envelope, and runs unattended Code Mode through `automation`.
- **A new fixed-context text.** The namespace line and the three skill descriptions are within their budgets. The
  namespace counters the hosted server's unpinned `npx … @latest` setup: setup is not run unless the user asks.
- **No legacy.** The pre-append-only ledger compatibility path is removed; the ledger counts only the records it writes
  in the current append-only format. The Jelly guide and the Jelly-only paragraphs are gone, as is the Jelly declaration
  test that the pinned copy of Jelly's kit cannot run against the new package name. The `sources` and `jelly` keys remain
  for the next phase.
- **One CI job.** `ci.yml` has one job named `ci`, runs the full check on Node 24 with `contents: read`, and pins its
  actions by commit.

### Removed

- The old install specs, badges and links, and every release section before `0.0.0`.
