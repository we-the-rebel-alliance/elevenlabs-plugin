import { accountStatuses, accountsOf, statusAnswer, STATUS_SCHEMA } from "@we-the-rebel-alliance/plugin-contract/accounts"
import type { Manifest } from "@we-the-rebel-alliance/plugin-contract/manifest"
import type { MethodHandler } from "@we-the-rebel-alliance/plugin-contract/register"
import { reasonOf } from "../errors.ts"
import { version } from "../manifest.ts"
import type { Provider } from "../provider/elevenlabs.ts"
import { EMPTY_INPUT } from "./schemas.ts"

/** What setup knows before the handler table exists: the host release, and what registering the accounts could not do. */
export interface StatusInput {
  readonly hostVersion: string
  readonly accountProblems: readonly string[]
}

/**
 * `status`: the contract's whole answer from `statusAnswer`. The handler keeps no state between `register` and the
 * call: the generated rules and the agents they miss come from `call.unguardedAgents()`.
 */
export function statusHandler(manifest: Manifest, options: Readonly<Record<string, unknown>>, provider: Provider, input: StatusInput): MethodHandler {
  return {
    description: "Read the plugin's state: the host release, every account alias with its sign-in state and owner, and the agents that lack the plugin's access rules.",
    input: EMPTY_INPUT,
    output: STATUS_SCHEMA,
    async run(_input, call) {
      const plan = accountsOf(manifest, options)
      const profiles = plan.ok ? plan.value.accounts : []
      const signals = Object.fromEntries(
        await Promise.all(profiles.map(async (account) => [account.alias, await provider.signal(account.alias)] as const)),
      )
      const accounts = accountStatuses(profiles, signals)
      const problems = [...input.accountProblems, ...(plan.ok ? [] : plan.problems)]
      // `statusAnswer` says error only for a problem: an account the host reports as failed is one.
      for (const account of accounts) {
        if (account.state === "error") problems.push(`${account.alias}: ${account.reason ?? "the server failed"}`)
      }
      let unguardedAgents: readonly string[] = []
      try {
        unguardedAgents = await call.unguardedAgents()
      } catch (error) {
        // An unreadable agent list is unknown, never zero: pass it as a problem and status says error.
        problems.push(`UNAVAILABLE: the agents could not be read (${reasonOf(error)}). Next step: check the agent configuration, then read status again.`)
      }
      return statusAnswer({
        manifest,
        version,
        hostVersion: input.hostVersion,
        accounts,
        problems,
        unguardedAgents,
      })
    },
  }
}
