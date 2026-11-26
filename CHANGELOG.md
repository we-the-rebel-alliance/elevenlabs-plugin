# Changelog

## 0.0.0 (2026-11-25)

- ElevenLabs' hosted MCP server as an OpenCode plugin: voice and chat agents, conversation review, and generated
  speech, images and video on Flows.
- One vendor MCP server per account alias (`elevenlabs`, `elevenlabs-<alias>`), each with its own OAuth and its own
  `region` profile (`global`, `us`, `eu`, `in`, `sg`).
- Four own methods through one `register` call: `status`, `probe`, `events_list` and `save_media`. `events_list` and
  `probe` take an account; `status` and `save_media` do not.
- The `elevenlabs.conversations` events source (`session`, metadata only, a cursor bound to plugin/source/account) and
  the `elevenlabs.conversations.list` snapshot. The cursor is the total order `(occurred_at, external_id)`.
- `rpc.elevenlabs.account` and `rpc.elevenlabs.status` bus nudges when an alias's sign-in state or the plugin's overall
  state changes.
- `save_media` downloads a generated file from a signed `elevenlabsusercontent.com` link, writes it under `mediaRoot`,
  and answers its path, size, sha256 and duration.
- The 245 pass-through vendor tools, classified as reads, writes, sends, deletes and one export; the billed RAG read and
  the transcribing write ask through `effect: ask`.
- Access through the contract's `access` module (`all`, `ask-changes`, `read-only`), generated docs, three skills and a
  two-account conformance fixture.
- OpenCode `>=2.4.1 <2.5.0`, tested on 2.4.1. No runtime dependencies.
