# Automations

An events source is read with a cursor in OpenCode automation state. The suggested cadence is a hint for the
automation, not a schedule the plugin sets.

<!-- generated:automations -->
| Source | Method | Provider floor | Suggested | Signals |
|---|---|---|---|---|
| `elevenlabs.conversations` | `tools.elevenlabs.events_list` | — | 2 min | — |
<!-- /generated:automations -->

## Reading with a cursor

Call `tools.elevenlabs.events_list` with `{ "account": "work" }`, keep the `cursor` it answers in the automation's state,
and pass that cursor on the next run:

```js
const previous = state.cursor
const page = await tools.elevenlabs.events_list({ account: "work", ...(previous ? { cursor: previous } : { since: "-1d" }) })
// Apply page.events, then page.removals. Save the cursor only when page.failed is empty.
return { state: { cursor: page.cursor } }
```

The cursor is bound to the plugin, source and account, so a cursor from `work` is `CURSOR_INVALID` under `personal`.
`failed[]` holds the cursor back; `refused[]` does not. `more: false` is not "done": the next scheduled run asks again
with the saved cursor. A read that starts before an agent's retention horizon answers `gap: { reason: "expired" }` once;
render the gap, never invent the missing calls.

The source is metadata only. A call's `external_id` is the conversation id `agents_get_conversation` and
`agents_get_conversation_summary` take.

`list: "conversations"` reads the list snapshot instead of events. It is an app's read, through RPC; a model tool call
that carries `list` is refused.
