import { Plugin } from "@opencode/plugin"
import { assertHost, register } from "@we-the-rebel-alliance/plugin-contract/register"
import { registerFor, watchAccounts } from "./accounts.ts"
import { ProviderError } from "./errors.ts"
import { createHandlers } from "./handlers/index.ts"
import { manifest } from "./manifest.ts"
import { createProvider, DEFAULT_MEDIA_BYTES, DEFAULT_MEDIA_ROOT, MEDIA_HOSTS, type MediaOptions } from "./provider/elevenlabs.ts"
import { registerSkills } from "./skills.ts"

/** The media options, checked; a bad value is the contract's `OPTIONS_INVALID`, never a quiet fallback. */
function mediaOptions(options: Readonly<Record<string, unknown>>): MediaOptions {
  const root = options["mediaRoot"] ?? DEFAULT_MEDIA_ROOT
  if (typeof root !== "string" || root.trim() === "" || root.includes("\0")) {
    throw new ProviderError("OPTIONS_INVALID", `The option "mediaRoot" must be a non-empty path`, `Set "mediaRoot" to a folder, such as "${DEFAULT_MEDIA_ROOT}".`)
  }
  const maxBytes = options["maxMediaBytes"] ?? DEFAULT_MEDIA_BYTES
  if (typeof maxBytes !== "number" || !Number.isSafeInteger(maxBytes) || maxBytes < 1024) {
    throw new ProviderError("OPTIONS_INVALID", `The option "maxMediaBytes" must be a whole number of at least 1024`, `Set "maxMediaBytes" to the largest file save_media may write, in bytes.`)
  }
  return { root, maxBytes, hosts: MEDIA_HOSTS }
}

/**
 * ElevenLabs for OpenCode. One `register` call wires every own method through the tools, Code Mode and RPC, and builds
 * the bus for the events the manifest declares. The accounts module registers one vendor MCP server per alias; the
 * sign-in watcher emits the two nudges.
 */
export default Plugin.define({
  id: manifest.plugin.name,
  async setup(ctx) {
    assertHost(ctx, manifest)
    const options = (ctx.options ?? {}) as Readonly<Record<string, unknown>>
    const provider = createProvider(manifest.plugin.name, ctx, mediaOptions(options))

    const accounts = await registerFor(ctx, manifest, options)
    const handlers = createHandlers({
      manifest,
      options,
      provider,
      hostVersion: ctx.app.version,
      accountProblems: accounts.problems,
    })
    const registration = await register(ctx, manifest, handlers)
    const skills = await registerSkills(ctx)

    const watcher = watchAccounts(ctx, {
      manifest,
      options,
      provider,
      problems: accounts.problems,
      bus: registration.bus,
    })
    return async () => {
      await watcher.stop()
      await skills.dispose().catch(() => undefined)
      await registration.dispose()
    }
  },
})
