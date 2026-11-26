import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { redactValue } from "@we-the-rebel-alliance/plugin-contract/kit"
import { describe, expect, test } from "vitest"
import { buildFixture } from "../support/fixture.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** The fixture's event hashes are repaired by `plugin-kit record`; `plugin-kit check` validates them. */
function withoutHashes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutHashes)
  if (typeof value !== "object" || value === null) return value
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "hash").map(([key, item]) => [key, withoutHashes(item)]))
}

describe("the conformance fixture", () => {
  test("is what the plugin's handlers answer for the two synthetic accounts, after the kit's redaction", async () => {
    const recorded = JSON.parse(readFileSync(join(root, "fixtures", "conformance.json"), "utf8"))
    expect(withoutHashes(redactValue(await buildFixture()))).toEqual(withoutHashes(recorded))
  })

  test("records both declared bus events and the two-account evidence", async () => {
    const fixture = JSON.parse(readFileSync(join(root, "fixtures", "conformance.json"), "utf8")) as {
      events: { emitted: string[]; status: { accounts: { alias: string }[] } }
      accounts: { aliases: string[]; required: { code: string }; unknown: { code: string }; cursors: { code: string }[] }
    }
    expect(fixture.events.emitted.sort()).toEqual(["account", "status"])
    expect(fixture.events.status.accounts.map((account) => account.alias)).toEqual(["work", "personal"])
    expect(fixture.accounts).toMatchObject({ aliases: ["work", "personal"], required: { code: "ACCOUNT_REQUIRED" }, unknown: { code: "ACCOUNT_UNKNOWN" } })
    expect(fixture.accounts.cursors[0]?.code).toBe("CURSOR_INVALID")
  })
})
