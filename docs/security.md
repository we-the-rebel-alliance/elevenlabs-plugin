# Security

Unofficial; not affiliated with ElevenLabs.

## Supported versions

OpenCode `>=2.4.1 <2.5.0`. Tested on 2.4.1.

## Reporting a vulnerability

Report privately through GitHub's private vulnerability reporting on
<https://github.com/we-the-rebel-alliance/elevenlabs-plugin>. Do not open a public issue for a security problem.

## What leaves the machine

- **Tool calls go to ElevenLabs' hosted MCP server** at the alias's region endpoint, under OpenCode's OAuth credential.
  The plugin never sees the token and cannot print it.
- **A generated file is downloaded only when `save_media` is called**, from an `https` link on `elevenlabsusercontent.com`
  or a subdomain. Every redirect is checked against the same host list, credentials in the URL are refused, and the size
  cap and content type are enforced while the body streams.
- Nothing else is fetched. There is no telemetry, no balance read and no second API client.

## Scopes

Each alias asks for the seven scopes ElevenLabs' own MCP client asks for: `convai_read`, `convai_write`,
`text_to_speech`, `speech_history_read`, `flows`, `image_video_generation` and `voice_generation`. `ads_read` is never
requested.

## Transcript data

`agents_get_conversation` and its search tools return other people's words, the identifier the integration gave them,
the phone number they called from, whatever the agent extracted and the variables their app passed in. That is personal
data about someone who did not choose to talk to a model. The plugin does not redact it; the skill says to summarise,
quote only what carries the finding, and never move a caller's details into another tool, file, commit or message.

The events source is metadata only: it never carries a caller, a transcript, a summary, a score or feedback, and its
`text` stays empty. A title that holds a secret is refused for good. An event's URL is `null`; ElevenLabs gives no link
to a conversation.

## Permissions and spend

`access` is the ceiling the plugin installs into every agent. `all` runs every method unless its `effect` is `ask`;
`ask-changes` asks for every change and for a read with `effect: ask`; `read-only` denies every change, while a read
with `effect: ask` asks rather than runs. A per-tool rule still wins. The plugin prices nothing and sets no cap: the
workspace's balance at ElevenLabs is the limit, and the `send` class is what names a call that reaches people. The
billed RAG read (`agents_query_knowledge_base_rag`) asks at every level; the transcribing write
(`creative_transcribe_audio`) asks at `all` and `ask-changes` and is denied at `read-only`.

The 245 pass-through tools are classified in `capabilities.methods`: `agents_delete*` and `creative_delete*` are
`delete`, the batch and outbound call tools and `agents_publish_draft` are `send`, `agents_get_signed_url` is `export`,
and everything that spends or changes is `write` unless a name says otherwise. A tool ElevenLabs adds later is not in
the table; the access rules do not cover it, so the person's own rule decides.

## Files

`save_media` writes under `mediaRoot` only, refuses a name that could leave the folder, refuses a symlinked destination,
writes to a private staging file opened `O_NOFOLLOW`, and publishes with one link or rename. It also asserts OpenCode's
`external_directory` rule for the folder, so a session that denies it writes nothing.

## Status, logs and fixtures

Status and logs never carry a credential, a URL query string or a token: the contract cuts a reason to one line of 160
characters and redacts it. The conformance fixture is generated from synthetic accounts and a deterministic provider;
it holds no real call, person, credential or email.
