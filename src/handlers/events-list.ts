import type { JsonSchema } from "@we-the-rebel-alliance/plugin-contract/manifest"
import { refusal, RegisterError } from "@we-the-rebel-alliance/plugin-contract/register"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { conversationList, EVENTS_DESCRIPTION, EVENTS_INPUT, EVENTS_OUTPUT, listEvents, SOURCE } from "./events.ts"
import type { Provider } from "../provider/elevenlabs.ts"

/** The list discriminator is an app's read: a model calling the tool reads events, not a list. */
function checkList(input: Record<string, unknown>, door: string) {
  const list = input["list"]
  if (list === undefined) return undefined
  if (list !== "conversations") throw new RegisterError(refusal("INPUT_INVALID", `events_list takes list "conversations", not ${String(list)}`, "Leave list out, or pass conversations."))
  if (door !== "rpc") throw new RegisterError(refusal("INPUT_INVALID", `events_list does not take "list" on the ${door} door: a list is an app's read through RPC`, "Leave list out to read events; an app reads the list snapshot through the RPC method."))
  return list
}

/** `events_list`: the conversations as contract events, or as the list snapshot for an app. */
export function eventsListHandler(provider: Provider, now: () => number): MethodHandler {
  return {
    description: EVENTS_DESCRIPTION,
    input: EVENTS_INPUT as unknown as JsonSchema,
    output: EVENTS_OUTPUT as unknown as JsonSchema,
    async run(input, call) {
      const list = checkList(input, call.door)
      const rest = { ...input }
      delete rest["list"]
      if (list === "conversations") return conversationList(provider, call.account, call, now())
      return listEvents(provider, call.account, call, rest, now())
    },
  }
}

export { SOURCE }
