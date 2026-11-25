import type { Manifest } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { HandlerTable } from "@we-the-rebel-alliance/plugin-contract/register"
import type { Provider } from "../provider/elevenlabs.ts"
import { eventsListHandler } from "./events-list.ts"
import { probeHandler } from "./probe.ts"
import { saveMediaHandler } from "./save-media.ts"
import { statusHandler } from "./status.ts"

/** What every handler is built with: the installed manifest, the options, the provider and what setup already knows. */
export interface HandlerDeps {
  readonly manifest: Manifest
  readonly options: Readonly<Record<string, unknown>>
  readonly provider: Provider
  readonly hostVersion: string
  readonly accountProblems: readonly string[]
  readonly now?: (() => number) | undefined
}

/** The one handler table the register wires every door from. Pass-through MCP tools have no handler. */
export function createHandlers(deps: HandlerDeps): HandlerTable {
  return {
    status: statusHandler(deps.manifest, deps.options, deps.provider, { hostVersion: deps.hostVersion, accountProblems: deps.accountProblems }),
    probe: probeHandler(deps.provider),
    events_list: eventsListHandler(deps.provider, deps.now ?? Date.now),
    save_media: saveMediaHandler(deps.provider),
  }
}
