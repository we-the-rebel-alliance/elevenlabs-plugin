# Architecture

The plugin is a thin layer over ElevenLabs' hosted MCP server. OpenCode owns the transport, OAuth, credentials,
permission prompts and tool output limits. The plugin registers one server per account alias, classifies the vendor's
tools for the contract, adds its own four methods, reads conversations as an events source, saves generated files, and
reports status.

## Layers

| Path | Role |
|---|---|
| `src/index.ts` | The server part: `Plugin.define`, `assertHost`, one `register` call |
| `src/manifest.ts` | The installed `capabilities` manifest and version, read from `package.json` |
| `src/accounts.ts` | The per-alias MCP server registration, and the sign-in watcher that emits `account` and `status` |
| `src/handlers/` | One handler per own method: `status`, `probe`, `events_list`, `save_media`; `events.ts` holds the conversation logic |
| `src/provider/elevenlabs.ts` | The vendor client: the five region endpoints, the OAuth scope pin, the owner/status reads, the MCP tool executor, the media options |
| `src/provider/media.ts`, `src/provider/media/policy.ts` | The signed-link download, the host and size checks, and the private file write |
| `src/errors.ts` | A provider failure in the contract's `CODE: What happened. Next step: What to do.` form |

`scripts/build.mjs` bundles `src/index.ts` into one self-contained `dist/index.js`. Only `@opencode/plugin` and Node
built-ins stay external. The bundle is committed so a Git tag installs without a build step; run `npm run bundle` after
a source change and commit the result. `tsc` typechecks; vitest runs the tests.

## Setup

1. `assertHost(ctx, manifest)` reads `ctx.app.version`; an untested host is refused with `HOST_UNTESTED` unless
   `allowUntestedHost` is true.
2. `createProvider` validates `mediaRoot` and `maxMediaBytes` and builds the vendor client.
3. `registerFor` registers one vendor MCP server per alias through the contract's `accounts` module. The profile's
   `region` chooses the endpoint; each server carries the seven-scope OAuth pin.
4. `register(ctx, manifest, handlers)` applies the `access` rules through the contract's `access` module, registers one
   tool and one RPC method per own method, builds the bus, and returns the registration.
5. `watchAccounts` subscribes to `integration.updated`, `mcp.status.changed`, `credential.updated` and
   `credential.switched`; a change in an alias's state emits `account`, and a change in the overall state emits `status`.
   `registration.dispose()` and the watcher's stop are the one cleanup.

## What is cached

Nothing. Every `status` reads the host's MCP server list and the alias's active credential; every `events_list` reads
ElevenLabs through the host's tool executors. The cursor is the app's, not the plugin's.

## OpenCode APIs

Only the public `@opencode/plugin` 2.4.1 context: `ctx.app.version`, `ctx.options`, `ctx.mcp.transform`, `ctx.mcp.list`,
`ctx.integration.connection.active`, `ctx.agent.transform`, `ctx.agent.list`, `ctx.tool.list`, `ctx.permission.assert`,
`ctx.event.subscribe`, `ctx.rpc.register` (through `register`) and `ctx.storage` (not used).

## One endpoint, one name

The five endpoints are named once, in `src/provider/elevenlabs.ts`. The server name for an alias comes only from the
contract's `accountName`: `elevenlabs` for `default`, `elevenlabs-<alias>` otherwise. The same name is the permission
prefix OpenCode uses for the vendor's tools.
