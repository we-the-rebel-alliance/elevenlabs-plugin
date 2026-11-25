# Configuration

The options and their defaults, generated from `capabilities.options`.

<!-- generated:configuration -->
| Option | Type | Default | Description |
|---|---|---|---|
| `access` | `all` \| `ask-changes` \| `read-only` | `"all"` | How much the plugin's methods may do. |
| `accounts` | object | — | One profile per account alias. |
| `allowUntestedHost` | boolean | `false` | Start outside the tested OpenCode range. |
| `mediaRoot` | string | `"~/Downloads/elevenlabs"` | The folder save_media writes under; ~ is your home folder. |
| `maxMediaBytes` | integer | `209715200` | The largest file save_media writes, in bytes. |
<!-- /generated:configuration -->

## Example

```json
{
  "plugins": [
    {
      "package": "github:we-the-rebel-alliance/elevenlabs-plugin#v<version>",
      "options": {
        "access": "ask-changes",
        "accounts": { "work": { "region": "eu" }, "personal": { "region": "global" } },
        "mediaRoot": "~/Downloads/elevenlabs",
        "maxMediaBytes": 209715200
      }
    }
  ]
}
```

## Access

`access` is the ceiling the plugin installs into every agent after its base allow:

| Level | Reads | Changes |
|---|---|---|
| `all` (default) | run | run |
| `ask-changes` | run | ask first |
| `read-only` | run | denied |

A per-tool rule in `opencode.json` or a session's own rules wins for one method. An agent that appears after the plugin
loads does not receive the rules and is named in `status.unguardedAgents`.

## Accounts

`accounts` is a map of alias to profile. With no `accounts` option there is one `default` account. The only profile
field is `region`; see [accounts](accounts.md).

## Media

`mediaRoot` is where `save_media` writes, with `~` expanded to your home folder. `maxMediaBytes` is the largest file it
writes; a larger file is refused with `TOO_LARGE`. A save also needs OpenCode's `external_directory` rule for the folder,
which the plugin asks for at the first save.

## Host

`allowUntestedHost` starts the plugin outside `>=2.4.1 <2.5.0`. Leave it off: an untested host is refused with
`HOST_UNTESTED`, which is safer than starting code no test ran.
