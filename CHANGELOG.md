# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows
[Semantic Versioning](https://semver.org).

## [0.0.0] - 2026-11-25

The first release on plugin-contract v0. The repository is `we-the-rebel-alliance/elevenlabs-plugin`, the package is
`@we-the-rebel-alliance/elevenlabs-plugin`, and the version restarts at `0.0.0`.

### Added

- **One manifest.** `capabilities` declares the plugin, the `mcp` accounts, the options, all 249 methods (245
  pass-through vendor tools plus `status`, `probe`, `events_list` and `save_media`), the two conversations sources, no
  actions and the two bus events. The old vendor, source and host keys are gone.
- **Several accounts at once.** One vendor MCP server per alias, `elevenlabs` and `elevenlabs-<alias>`, each with its own
  OAuth and its own `region` profile (`global`, `us`, `eu`, `in`, `sg`).
- **Four doors, one implementation.** `register` wires every own method as an agent tool, in Code Mode and over RPC.
  `events_list` and `probe` are `accounts: "optional"`; `status` and `save_media` are `none`.
- **Sources with a cursor.** `elevenlabs.conversations` reads calls as metadata-only session events; its list snapshot
  reads the 50 newest titles. The cursor is bound to the plugin, source and account.
- **Bus nudges.** `rpc.elevenlabs.account` and `rpc.elevenlabs.status` are emitted when an alias's sign-in state or the
  plugin's overall state changes.
- **A generated file that stays out of the conversation.** `save_media` writes a generated file under `mediaRoot`, with
  an `https`-only, host-checked download and a private file write.
- **Docs, three skills and a two-account conformance fixture.**

### Changed

- **OpenCode 2.4.1 exactly.** `>=2.4.1 <2.5.0` with `2.4.1` the only tested release.
- **The fixed-context text.** The namespace line is the audited 385-character line; the skill descriptions stay under
  300. Nothing is pinned and there is no per-request hook.
- **Access through the contract.** `access` is `all`, `ask-changes` or `read-only`; the `methods` classes carry the spend
  risk, and the two spending reads ask.

### Removed

- The tools RPC, the manual permission rules and status RPC, the billing ledger and credit caps, the balance key, the
  doctor command, the TUI, the copied kit scripts and the legacy vendor, source and host declarations.
