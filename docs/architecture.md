# Architecture

The plugin is a thin layer over ElevenLabs' hosted MCP server. OpenCode owns the MCP transport, OAuth, credentials,
permission prompts and tool output limits. The plugin registers the server, names its `/connect` entry, adds the default
permission rules, guards spending, saves generated files, reports status, ships three skills, and lets scripts call the
known tools through a tools RPC, and reads the workspace's conversations as a source contract source. It adds two tools of
its own and has no runtime dependencies: the source contract's modules are bundled in.

## Layout

| Path | Role |
| --- | --- |
| `src/index.ts` | The server part: the plugin `elevenlabs` |
| `src/plugin.ts` | Setup: the server, the namespace, the rules, the commands and the tools RPC |
| `src/constants.ts` | Ids, the region table, the scope pin, the media host, the host range, `TESTED_HOSTS` and the codes |
| `src/options.ts` | Option parsing and validation |
| `src/elevenlabs-tools.ts` | The one tool table: all 245 live tools — reads, export, writes, spending tools, deletes — the transcript lists, the tools that reach people, the read-only overrides and `classify()` |
| `src/permissions.ts` | The generated default rules, their placement, and the agents that need them |
| `src/billing.ts` | ElevenLabs' estimate as the only price, the argument allowlists, the rolling ledger, the pre-call refusal, the cost line, the RPC `cost` object |
| `src/media/policy.ts` | The export-root path policy and the file write |
| `src/media/save.ts` | The link checks, the download and the extension and duration rules |
| `src/media/tool.ts` | `elevenlabs_save_media`: its schema, its own permission assert, and its tools-RPC method |
| `src/balance.ts` | The optional API key, and the one subscription read it is used for |
| `src/status.ts` | The status model, `/elevenlabs-status`, and the status RPC |
| `src/doctor.ts` | `/elevenlabs-doctor`: the live checks |
| `src/integration.ts` | The `/connect` entry's name and the "Sign in required" mark |
| `src/old-sign-ins.ts` | The sign-ins an earlier `region` left stored: found, listed in `/connect` under a clear name, and named by status |
| `src/tui.ts` | The terminal UI part and the `/elevenlabs` dialog |
| `src/host/tools-rpc.ts` | The tools RPC, `elevenlabs.tools`: ElevenLabs' part of source-contract's `tools-rpc` transport |
| `src/events.ts` | The source `elevenlabs.conversations`: `events_list` (a tool and a method) and `probe` (a method) |
| `src/skills.ts`, `src/redact.ts`, `src/host-version.ts`, `src/version.ts` | Skills, redaction, the host check, the version |

`scripts/build.mjs` bundles each entry with esbuild into one self-contained file: `src/index.ts` into `dist/index.js` and
`src/tui.ts` into `dist/tui.js`. The bundles have no chunks and no relative imports, because OpenCode reloads a plugin in
place and keeps the modules it already loaded for unchanged paths. Only `@opencode/plugin`, OpenTUI, Solid and
`node:` built-ins stay external. `tsc` only typechecks.

## Setup

1. `parseOptions` validates the options; anything wrong fails with `OPTIONS_INVALID`.
2. `checkHost` compares `ctx.app.version` with `>=2.4.1 <2.5.0`. Inside it the plugin starts; status calls only 2.4.1 tested. Outside it, setup fails with `HOST_UNTESTED` unless `allowUntestedHost` is set.
3. The ledger is read from `ctx.storage` once, so the 24-hour total survives a reload.
4. `ctx.mcp.transform` registers `elevenlabs` at the selected region's URL, with `oauth.scope` pinned to seven scopes, or
   adopts the user's own entry at exactly that URL. Another region's URL is `stale`; any other is `conflict`.
5. `ctx.tool.transform` sets the namespace description and adds `elevenlabs_save_media`.
6. `ctx.agent.transform` inserts the default rules after each agent's base `* * allow`.
7. `ctx.integration.transform` adds the optional API key entry to `/connect`.
8. `ctx.skill.transform`, `ctx.command.transform` (`/elevenlabs-status`, `/elevenlabs-doctor`) and `ctx.rpc.register`
   (`elevenlabs/status`).
9. `registerToolsRpc` registers `elevenlabs.tools` with the spending guard's shapers.
10. `watchIntegration` starts. Setup returns one cleanup that stops it and the tools RPC. No per-request hook is
    registered.

Transforms are synchronous and never throw: a failure is kept as a problem for status, and cleared when the next replay
succeeds.

## Platform facts (OpenCode 2.4.1)

- **The sign-in is CIMD.** ElevenLabs' authorization server advertises `client_id_metadata_document_supported: true` and
  no registration endpoint, so OpenCode sends its own client metadata document
  (`https://opencode.ai/oauth/opencode/client.json`). Nothing ships with the plugin. A pinned `client_id` or
  `redirect_uri` would disable that; the plugin pins neither.
- **The scope pin.** OpenCode requests `oauth.scope` when it is set, otherwise the scope in the `401` challenge
  (ElevenLabs' names none), otherwise every scope in `scopes_supported`. ElevenLabs advertises eight; the plugin pins the
  seven its own MCP client asks for, so `ads_read` is never requested. A host test asserts the exact scopes in the
  authorization request and fails if the pin is removed.
- **Discovery.** The global MCP resource names `https://api.us.elevenlabs.io` as its authorization server, so the global
  and US servers share one. Each region serves the same documents with its own host, and each accepts CIMD.
- **The token never reaches the plugin.** OpenCode holds it and refreshes it; `/elevenlabs-status` sees only a
  credential's label. That is why the balance needs a separate key.
- **No per-request hooks.** The plugin registers none. Pricing, caps and the cost line live only in the tools RPC's
  shapers; an agent or Code Mode call is ElevenLabs' own result.
- **Unattended Code Mode.** In 2.4.1 `experimental.automation` owns scheduled work: a code action's tools are
  authorized at creation (an ask or a deny is refused), and the program runs, under an unattended grant for those
  tools, when the scheduler finds it due. Only a server process starts the scheduler; the host test starts it in its
  embedded host. The flag is `experimental.automations`.
- **A plugin tool's declared permission only hides it on a deny.** Every plugin-owned tool that writes asserts its own
  action inside `execute`; `elevenlabs_save_media` does, on both paths.
- **Changing a server's URL changes its integration id** (`mcp_` + `sha1(name\0url)`), so a region change needs a new
  sign-in and leaves the old credential behind. A plugin cannot delete a stored credential (`ctx.credential` offers
  `activate` only), so `src/old-sign-ins.ts` computes the other regions' ids, asks `integration.connection.active` for
  each, registers any it finds in `/connect` as "ElevenLabs, old `<region>` sign-in (not in use)" so it can be signed
  out of there or with `opencode auth logout`, and status names it with that command.
- **`dist/tui.js` carries no zod and no host contract**: the RPC contract is plain JSON Schema, written with
  `Rpc.define`.

## The spending guard

**Only the tools RPC prices calls.** A script or app calls `elevenlabs.tools`; its shapers price a call, enforce the
caps, reserve and settle the ledger, and put the `cost` object and cost line in that call's own result. An agent or Code
Mode call goes straight to ElevenLabs: the plugin does not price, cap or annotate it, and its own result stands.

**ElevenLabs is the only source of a price.** This plugin computes none of its own: no rate per character, per second
or per minute, and no measurement of a local file. A tools-RPC call that can spend is priced by sending ElevenLabs the
same call with `estimate_only: true` and the same arguments, and reading the figure out of its answer
(`estimatePrice` in `src/billing.ts`). `ESTIMATE_TOOLS` holds the seven tools whose live schema declares
`estimate_only`; `SPEND_TOOLS` holds the nineteen that can spend. A spending tool with no estimate — the twelve that are
not in `ESTIMATE_TOOLS` — has no price at all: with no cap it runs unpriced, and while a cap is on it is refused
(`PRICE_UNKNOWN`).

**Caps are opt-in.** `sessionCreditCap` and `dailyCreditCap` default to `null`. With neither set, the shapers price
nothing, refuse nothing, clamp nothing and reserve nothing; a result is reported at the figure it states, or as
`Credits: not reported`. The script path cannot await an estimate, so its only price is one the same ledger already
holds for exactly these arguments: a script sends `estimate_only` first, and the figure is remembered for ten minutes
(`RESERVATION_MS`). An estimate costs nothing but creates a flow and a node in the workspace, so the script makes one
per set of arguments, not per attempt.

**Reservations and the ledger.** While a cap is on, the shaper clamps a generation count to what the budget affords,
**reserves** the price in the ledger before the call is sent, and settles it into a charge when the result arrives, so
two calls that start together cannot spend one budget twice. A call that fails, and a hold still open after ten
minutes, is charged the reserved price: the plugin cannot tell a free failure from a billed one. A later higher figure
may replace that charge; a zero or a missing result does not free the budget. A charge stays in the session that
reserved it, whichever session a later result is delivered under. The ledger is append-only: every hold and every
charge is one `ctx.storage` key, `spend/<writerId>/<entryId>`, where `writerId` is unique to this plugin instance and
only the instance that created a key ever rewrites it. A total is a scan over `spend/` and a sum — there is no merge,
no `Math.max` and no read-modify-write of a shared record, so no writer can drop another's row. Pruning folds older
entries into that writer's own hourly key, `spend/<writerId>/h/<hour>`, and the hours of every writer are added
together, which cannot double-count because a charge is folded by exactly one writer.

The shaper is synchronous, so it cannot await the store before it dispatches; it bounds its staleness behind itself
instead — it starts a read it does not wait for after the hold is taken, and the next call on that ledger decides from
a book that has seen the other OpenCodes' holds. A process that is idle, or whose calls all refuse, writes nothing and
would never read again, so setup also starts an unref'd timer that reads the store every `LEDGER_REFRESH_MS`, five
seconds, and stops when the plugin is disposed. Two ledgers handed one storage object share a book and one daily cap.
Across processes, exactly: **within one OpenCode the caps are exact; across OpenCodes a cap is crossed by at most one
call's reservation for each one deciding before its read of the others' holds lands, so eight of them at 3,000 credits a
call can spend 31,000 against a 10,000 cap; every OpenCode reads the store behind each call it admits and every five
seconds besides, so none decides on a book older than that; a settled charge is never lost.** The crossing needs
overlap: calls that wait for one another see one another, and those same eight, run one after the next, spend only the
9,000 that fits. Two machines share nothing. Two locations keep their own tools-RPC shapers. On the script path, one
priced call per session and method is in flight.

### Argument allowlists

Every tool the guard prices has a list of the argument names it may carry while a cap is on, and each list is that
tool's own live schema, name for name, taken from `test/fixtures/live-tools.json` and held against it by
`test/unit/live-schema.test.ts`. An argument outside the list is one ElevenLabs' own schema for that tool does not
have, so the call is refused (`PRICE_UNKNOWN`) and the refusal names the argument. The estimate is not asked for in
that case either: it would answer for arguments nothing here can account for, and leave another flow behind for a call
that is going to be refused. With both caps off nothing is priced and the same call runs. Live reconcile 2 is where
the lists are checked again, by the step that says to confirm each priced tool's real argument names in
`test/fixtures/README.md`.

Every priced call may carry `estimate_only` and `flow_id`. Every priced call **except a transcription** may also carry
the count key `generations_count`, which is the only batch-size name in the live catalogue — it appears on six tools,
and a count under any other name is an argument the live schema does not have. A transcription takes none: it
transcribes the node it is connected to, once.

| Tools | Arguments |
|---|---|
| `creative_generate_image`, `creative_generate_video`, `creative_edit_image` | `prompt`, `model_id`, `connect_from` |
| `creative_generate_speech` | `prompt`, `model_id`, `voice_id`, `view_state_id` |
| `creative_generate_in_flow` | `prompt`, `model_id`, `voice_id`, `node_type`, `connect_from`, `view_state_id` |
| `creative_run_flow_nodes` | `node_ids` |
| `creative_transcribe_audio` | `model_id`, `connect_from`, `view_state_id` |

`connect_from` is on these lists because that is how a live creative tool is given its input: a node on the same flow,
not a file on this machine. `creative_transcribe_audio` has no file or path argument at all — its audio comes from the
node it is connected to, and the server never sees anything on this disk.

The twelve spending tools with no list are `creative_design_voice`, `creative_execute_sandbox`,
`agents_submit_batch_call`, `agents_retry_batch_call`, `agents_outbound_call`, `agents_run_tests`,
`agents_run_attached_tests`, `agents_generate`, `agents_generate_test_from_conversation`,
`agents_compute_kb_rag_index`, `agents_query_knowledge_base_rag` and `creative_create_brand_kit_from_website`, because
their live schemas declare no `estimate_only` and nothing here can price them; a cap refuses them outright, so a list
of arguments would decide nothing.

ElevenLabs no longer takes a `context` argument on any tool. Until the capture of 14 November 2026 every live tool
required one, and every list held it; now none does, so a priced call that carries it is refused under a cap like any
other argument the schema lacks.

### What each tool is allowed to do

`classify()` puts each of the 245 live tools in one class: 103 reads, 1 export, 108 writes, 19 that can spend and 14
destructive. Nothing is left unclassified. The class is the worst thing a tool can do; it never decides whether a call
runs, only what the generated default rules give it.

**A read is exactly a tool ElevenLabs marks read-only.** The live capture records each tool's
`readOnlyHint`, so the table follows the server, with two exceptions kept stricter on purpose and named in
`READ_ONLY_OVERRIDES`: `agents_query_knowledge_base_rag`,
which this plugin counts as spending (below), and `get_more_tools`, which sends the model's words to ElevenLabs.
`test/unit/live-tools.test.ts` fails on any other disagreement. ElevenLabs' `destructiveHint` is broader than this
table's `destructive` class: it also marks updates that replace a value (`agents_update`, `agents_update_settings`,
`agents_publish_draft` and others), which stay writes here; every delete is destructive, and ElevenLabs marks each one so.

**Six tools reach people outside the conversation** (`REACH_TOOLS`): `agents_submit_batch_call` and
`agents_retry_batch_call` place real phone calls, `agents_outbound_call` places one call now,
`agents_publish_draft` makes staged changes live to callers,
`agents_update_whatsapp_account` changes how an agent answers a WhatsApp number, and
`agents_request_merge_proposal_review` notifies workspace members. None is a read, so `ask-changes` asks before each,
a script's call is refused there because a script cannot answer, and `read-only` denies them. At the default `all`
they run, like every other tool; the batch-call tools and `agents_outbound_call` are also spending tools, so a cap
refuses them.

Some of them are judgement calls, recorded here because nothing in the catalogue settles them. **One rule decides every
tool the catalogue is silent about:** a tool whose own description says it does server-side work ElevenLabs plausibly
bills, and does not say it spends nothing, is counted as spending. The tools that genuinely do not spend say so
unprompted — `creative_upload_flow_reference` ends *"This starts no generation and spends no credits"*,
`creative_update_node`, `creative_update_flow_nodes` and `creative_duplicate_flow_nodes` each end *"This never starts a
generation"*, `creative_get_voice_design_previews` says it reads previews *"without spending credits"* — so silence
beside billable work is the signal, and a cost line on a call that turns out free is better than a charge nobody
reported. These tools are classed as spending on that rule and nothing else; none of them declares `estimate_only`,
so each runs unpriced, or is refused while a cap is set, and live pass 2 measures whether they bill:

- **`agents_run_tests` and `agents_run_attached_tests`.** A test run makes the agent hold conversations, which bills
  the agent's own LLM usage. `agents_create_test`, `agents_create_simulation_test` and the other test tools only
  describe a test, and are ordinary writes.
- **`agents_generate` and `agents_generate_test_from_conversation`.** An LLM writes a whole agent, or a test from a
  real conversation, each taking up to two minutes.
- **`agents_compute_kb_rag_index`.** It starts RAG indexing of a knowledge-base document for an embedding model:
  embedding a whole document is server-side work with a unit ElevenLabs could bill.
- **`agents_query_knowledge_base_rag`.** A RAG query embeds the query and searches the index: the same kind of work
  `agents_compute_kb_rag_index` does. ElevenLabs marks it read-only; it is kept a change, because `access:
  "read-only"` promises to deny every tool that can spend.
- **`creative_create_brand_kit_from_website`.** It fetches a public website and extracts its logo, colours,
  typography and tone — *"best-effort and takes a while"*, which is the shape of a billed extraction.
- **`creative_design_voice` is counted as spending** and `creative_save_designed_voice` is a write: designing previews
  is the part that generates audio.
- **Four say they spend outright.** `creative_execute_sandbox` *"costs credits for each second the command runs"*,
  and `agents_submit_batch_call`, `agents_retry_batch_call` and `agents_outbound_call` place real phone calls.
  `creative_get_sandbox_run`, which waits for a sandbox run already started, is a write that starts nothing.
- **`creative_create_asset_upload` is a write, not an export.** It opens an upload into the workspace; nothing leaves
  it. The one export is `agents_get_signed_url`, which mints a signed URL that starts a conversation with a private
  agent and which ElevenLabs says to treat as a credential. `agents_get_link`, the agent's existing shareable link, and
  `creative_get_generations`, a render's signed link, were exports until the capture recorded ElevenLabs marking both
  read-only; they mint nothing, and they are reads now.
- **`creative_show_flow_results` is a read.** It puts a run's generations back in front of the user and changes nothing
  in the workspace, and ElevenLabs marks it read-only. An earlier release made it a write because rendering a view is
  an effect; the declaration now follows the server. It spends nothing and is not priced.

- **`get_more_tools` is a write, stricter than ElevenLabs' mark.** It is not a catalogue pager and it returns no tool definitions. Its live schema has
  one required argument, a free-text string named `capability`, and its description says what the server does with it:
  *"Call this when the user's request cannot be completed with any of the available tools. Describe the capability you
  were looking for, so it can inform which tools get built next."* So it changes what ElevenLabs will offer, which is a
  change like any other, and it is the one tool that sends words the model composed itself out of the workspace. It
  asks under `ask-changes`, `read-only` denies it, and SECURITY.md lists it with the other things `access: "all"`
  allows without a prompt. This release classified it from its own schema after live reconcile 1; until then the table
  held it unclassified and described it as something it never was.

Nothing is left unclassified, so `/elevenlabs-status` reports `0 unknown` against this catalogue. A name that really
fits no class would go in `UNCLASSIFIED_TOOLS`, where `npm run drift` reports it as known rather than as drift — but
while a credit cap the owner set is on, a name the table does not classify is refused before dispatch, so holding one
there is not free.

### The one duration, and what it is not

`elevenlabs_save_media` prints how long a saved file is. Nothing else in the plugin reads a file's length, and no
price comes from one.

It used to. Until live reconcile 1 the guard priced a transcription by measuring the local WAV it was given, at a
per-minute rate written down here. The live catalogue ended that: `creative_transcribe_audio` takes no file and no
path — its arguments are now `connect_from`, `flow_id`, `model_id`, `view_state_id` and `estimate_only` — so
the audio it bills for is a node on a flow in the workspace, and the server never opens anything on this disk. A
duration measured here would have answered for a file ElevenLabs was not charging for. Transcription is now priced
the way every other spending call is, from ElevenLabs' own estimate, and the whole of the measuring apparatus the old
price rested on — the stamping of each file's device, inode, size and modification time before and after the
measurement, the freezing of the arguments that named them, the refusal of a file that moved between the two
readings — went with it. There is no local file in a price to protect.

What remains is `durationOf`, and it is a display figure. The saved line reads a PCM RIFF/WAVE file the way a decoder
does — the `fmt ` fields and the bytes behind `data` — and otherwise reads the duration an MP4 or M4A states in the
`mvhd` box inside its `moov`, which is the format ElevenLabs returns and carries no length a decoder-free reader
could compute. That walk is bounded: every read is inside the file's own size, the number of boxes it steps through
is capped, and a stated duration longer than the file's bytes could hold at 8 kbps is dropped rather than shown. A
file whose length depends on which decoder opens it — two `data` chunks, which CoreAudio and Python's `wave` read
differently, or two `fmt ` chunks, which are two sample rates and so two lengths — carries no duration on the saved
line at all. A `data` size that understates the bytes behind it is reported at the longer reading, with
`understated` saying so, so a line that disagrees with the owner's own player can be explained.

The rigour is kept because a figure shown to the owner should be one a decoder would agree with. It is not kept
because anything depends on it: `savedText` prints `Saved <mime> to <path> (<size>, <n> s).`, drops the seconds when
the file states none, and no cap, hold or charge reads that number.
