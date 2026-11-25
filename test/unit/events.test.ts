import { describe, expect, test } from "vitest"
import { createHandlers } from "../../src/handlers/index.ts"
import { manifest } from "../../src/manifest.ts"
import { createFakeProvider, fakeCall } from "../support/fake-provider.ts"

const NOW = Date.parse("2026-11-20T12:00:00.000Z")
const options = { access: "all", accounts: { work: { region: "eu" }, personal: { region: "global" } } }
const provider = createFakeProvider()
const handlers = createHandlers({ manifest, options, provider, hostVersion: "2.4.1", accountProblems: [], now: () => NOW })

const events = handlers.events_list!

describe("events_list", () => {
  test("lists the account's calls as metadata-only session events, oldest first", async () => {
    const page = (await events.run({ source: "elevenlabs", since: "2026-11-18T00:00:00Z", account: "work" }, fakeCall("work"))) as unknown as { events: unknown[]; owner: unknown; source: string; account: string; trust: string; more: boolean; plugin: string }
    expect(page).toMatchObject({ source: "elevenlabs", account: "work", trust: "untrusted", more: false, plugin: "@we-the-rebel-alliance/elevenlabs-plugin" })
    const list = page.events as unknown as { external_id: string; kind: string; title: string; text: string; url: null; actors: { role: string; id: string }[] }[]
    expect(list.map((event) => event.external_id)).toEqual(["conv_work_1", "conv_work_2", "conv_work_3"])
    for (const event of list) {
      expect(event.kind).toBe("session")
      expect(event.text).toBe("")
      expect(event.url).toBeNull()
      expect(event.actors.map((actor) => actor.role)).toEqual(["agent"])
      expect(event.title).toContain("call")
    }
    expect(list[0]!.title).toBe("Checkout: inbound call, done, successful")
    expect(list[1]!.title).toBe("Checkout: outbound call, failed")
    expect(page.owner).toEqual({ id: "elevenlabs:credential:work", label: "Work sign-in", verified: false })
  })

  test("a cursor from another account is CURSOR_INVALID", async () => {
    const page = (await events.run({ source: "elevenlabs", since: "2026-11-18T00:00:00Z", account: "work" }, fakeCall("work"))) as { cursor: string }
    await expect(events.run({ source: "elevenlabs", cursor: page.cursor, account: "personal" }, fakeCall("personal"))).rejects.toMatchObject({ refusal: { code: "CURSOR_INVALID" } })
  })

  test("an empty second page keeps the position", async () => {
    const first = (await events.run({ source: "elevenlabs", since: "2026-11-18T00:00:00Z", account: "work" }, fakeCall("work"))) as { cursor: string }
    const second = (await events.run({ source: "elevenlabs", cursor: first.cursor, account: "work" }, fakeCall("work"))) as { events: unknown[]; more: boolean }
    expect(second.events).toEqual([])
    expect(second.more).toBe(false)
  })

  test("the list snapshot is metadata only and capped at 50", async () => {
    const answer = (await events.run({ source: "elevenlabs", list: "conversations", account: "work" }, fakeCall("work"))) as {
      data: { items: { id: string; text: string; done?: boolean }[]; editable: boolean }
      asOf: string
    }
    expect(answer).toMatchObject({ source: "elevenlabs", account: "work", trust: "untrusted" })
    expect(answer.data.editable).toBe(false)
    expect(answer.data.items[0]).toEqual({ id: "conv_work_3", text: "Support: inbound call, done, successful", done: true })
    expect(answer.data.items).toHaveLength(3)
    expect(answer.asOf).toBe("2026-11-20T12:00:00.000Z")
  })

  test("the list form is refused on the tool and Code Mode doors", async () => {
    await expect(events.run({ list: "conversations" }, fakeCall("work", "tool"))).rejects.toMatchObject({ refusal: { code: "INPUT_INVALID" } })
    await expect(events.run({ list: "conversations" }, fakeCall("work", "codemode"))).rejects.toMatchObject({ refusal: { code: "INPUT_INVALID" } })
  })

  test("a retention horizon answers one gap", async () => {
    const page = (await events.run({ source: "elevenlabs", since: "2020-01-01T00:00:00Z", account: "work" }, fakeCall("work"))) as { gap?: { reason: string; since: string } }
    expect(page.gap).toEqual({ reason: "expired", since: "2020-01-01T00:00:00.000Z" })
  })
})

describe("probe", () => {
  test("reports the alias's owner and the pinned scopes, and reads no content", async () => {
    const answer = await handlers.probe!.run({}, fakeCall("personal"))
    expect(answer).toMatchObject({ source: "elevenlabs", account: "personal", trust: "untrusted" })
    expect((answer as { owner: unknown }).owner).toEqual({ id: "elevenlabs:credential:personal", label: "Personal sign-in", verified: false })
    expect((answer as { scopes: string[] }).scopes).toContain("convai_read")
    expect(Object.keys(answer as object).sort()).toEqual(["account", "owner", "scopes", "source", "trust"])
  })
})

describe("status", () => {
  test("is the contract's status answer, one entry per alias", async () => {
    const answer = (await handlers.status!.run({}, fakeCall("work"))) as Record<string, unknown> & { accounts: { alias: string; state: string }[] }
    expect(answer).toMatchObject({
      name: "elevenlabs",
      version: "0.0.0",
      host: { version: "2.4.1", range: ">=2.4.1 <2.5.0", tested: ["2.4.1"] },
      state: "ready",
      unguardedAgents: [],
      nextStep: null,
    })
    expect(answer.accounts.map((account) => [account.alias, account.state])).toEqual([
      ["work", "ready"],
      ["personal", "ready"],
    ])
  })

  test("an account that needs a sign-in makes the state needs_sign_in", async () => {
    const offline = createFakeProvider()
    offline.setState("personal", "needs_sign_in")
    const local = createHandlers({ manifest, options, provider: offline, hostVersion: "2.4.1", accountProblems: [], now: () => NOW })
    const answer = (await local.status!.run({}, fakeCall("work"))) as { state: string; nextStep: string }
    expect(answer.state).toBe("needs_sign_in")
    expect(answer.nextStep).toContain("Sign in")
  })

  test("an account the host reports as failed makes the state error", async () => {
    const failed = createFakeProvider()
    failed.setState("work", "error")
    const local = createHandlers({ manifest, options, provider: failed, hostVersion: "2.4.1", accountProblems: [], now: () => NOW })
    const answer = (await local.status!.run({}, fakeCall("work"))) as { state: string; nextStep: string }
    expect(answer.state).toBe("error")
    expect(answer.nextStep).toContain("work")
  })

  test("an unreadable agent list is a problem, never zero agents", async () => {
    const call = fakeCall("work")
    const broken = { ...call, unguardedAgents: async () => Promise.reject(new Error("the agent list is unavailable")) }
    const answer = (await handlers.status!.run({}, broken)) as { state: string; unguardedAgents: string[]; nextStep: string }
    expect(answer.state).toBe("error")
    expect(answer.unguardedAgents).toEqual([])
    expect(answer.nextStep).toContain("agents could not be read")
  })
})
