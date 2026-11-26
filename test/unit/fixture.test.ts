import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"
import { buildFixture } from "../support/fixture.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** Every string in a JSON value, for the data-safety assertion below. */
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (typeof value !== "object" || value === null) return []
  return Object.values(value).flatMap(strings)
}

describe("the conformance fixture", () => {
  test("is exactly what the plugin's handlers answer for the two synthetic accounts", async () => {
    const recorded = JSON.parse(readFileSync(join(root, "fixtures", "conformance.json"), "utf8"))
    expect(await buildFixture()).toEqual(recorded)
  })

  test("holds no original synthetic agent name in any string", () => {
    const recorded = JSON.parse(readFileSync(join(root, "fixtures", "conformance.json"), "utf8"))
    const all = strings(recorded).join("\n").toLowerCase()
    for (const name of ["checkout", "support", "notes"]) expect(all).not.toContain(name)
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
