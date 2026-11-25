import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"
import { buildFixture } from "../support/fixture.ts"

const root = fileURLToPath(new URL("../..", import.meta.url))

describe("the conformance fixture", () => {
  test("is exactly what the plugin's handlers answer for the two synthetic accounts", async () => {
    const recorded = JSON.parse(readFileSync(join(root, "fixtures", "conformance.json"), "utf8"))
    expect(await buildFixture()).toEqual(recorded)
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
