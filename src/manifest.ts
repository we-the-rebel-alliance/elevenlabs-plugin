import { readFileSync } from "node:fs"
import type { Manifest } from "@we-the-rebel-alliance/plugin-contract/manifest"

/**
 * The installed package's own `capabilities` manifest and version, read from beside the built entry. The kit reads the
 * same declaration from disk; the plugin reads it at runtime so the register can wire the doors from it.
 */
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  readonly version: string
  readonly capabilities: Manifest
}

export const manifest: Manifest = pkg.capabilities
export const version: string = pkg.version
export const PACKAGE = "@we-the-rebel-alliance/elevenlabs-plugin"
