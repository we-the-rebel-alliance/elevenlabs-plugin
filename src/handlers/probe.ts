import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { probeAccount, PROBE_DESCRIPTION } from "./events.ts"
import type { Provider } from "../provider/elevenlabs.ts"
import { EMPTY_INPUT, PROBE_SCHEMA } from "./schemas.ts"

/** `probe`: the alias's owner, read from OpenCode's credential and never from ElevenLabs content. */
export function probeHandler(provider: Provider): MethodHandler {
  return {
    description: PROBE_DESCRIPTION,
    input: EMPTY_INPUT,
    output: PROBE_SCHEMA,
    async run(_input, call) {
      return probeAccount(provider, call.account)
    },
  }
}
