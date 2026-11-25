# Accounts

Every alias is one ElevenLabs MCP server with its own OAuth credential and its own `region`. Several aliases can be
signed in at once; a profile chooses the endpoint, so two aliases may live in two different ElevenLabs regions.

<!-- generated:accounts -->
Accounts are held by the **mcp** mechanism: the vendor's MCP server holds them.

| Field | Type | Required |
|---|---|---|
| `region` | `global` \| `us` \| `eu` \| `in` \| `sg` | no |
<!-- /generated:accounts -->

## Sign in per alias

| Alias | MCP server | Sign-in |
|---|---|---|
| `default` | `elevenlabs` | `/connect`, or `opencode mcp auth elevenlabs` |
| `work` | `elevenlabs-work` | `/connect`, or `opencode mcp auth elevenlabs-work` |
| `personal` | `elevenlabs-personal` | `/connect`, or `opencode mcp auth elevenlabs-personal` |

The alias is the last segment of the server name and the first half of a permission resource (`work:agents_list`). A
cursor issued for one alias is refused for another with `CURSOR_INVALID`.

## Regions

| `region` | Endpoint |
|---|---|
| `global` (default) | `https://api.elevenlabs.io/v1/mcp` |
| `us` | `https://api.us.elevenlabs.io/v1/mcp` |
| `eu` | `https://api.eu.residency.elevenlabs.io/v1/mcp` |
| `in` | `https://api.in.residency.elevenlabs.io/v1/mcp` |
| `sg` | `https://api.sg.residency.elevenlabs.io/v1/mcp` |

A region is an isolated ElevenLabs environment with its own workspace. Changing an alias's region changes its server
URL, which changes OpenCode's integration id, so the alias needs a new sign-in; the old credential stays in OpenCode
until it is signed out.

## Picking an account

Pass `account: "<alias>"` on `events_list` and `probe`. With more than one alias and none named, the call is refused
with `ACCOUNT_REQUIRED`, whose next step lists the aliases; an alias the plugin does not serve is `ACCOUNT_UNKNOWN`.
`status` takes no account and lists every alias.

## Per-alias tools

ElevenLabs' pass-through tools are permitted per alias: `elevenlabs-work_*` for `work` and `elevenlabs-personal_*` for
`personal`. The access rules derive one rule per alias through the contract's `serverOf` and `toolAction`, and a grant
for one alias never matches another alias's tool.

## Owners

ElevenLabs has no tool that names the signed-in account, so `probe` reports OpenCode's credential for the alias:
`{ id: "elevenlabs:credential:<id>", label, verified: false }`. `verified: false` says ElevenLabs did not confirm it.
