import { createServer, type Server } from "node:http"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, beforeAll, describe, expect, test } from "vitest"
import { checkUrl, saveMedia } from "../../src/provider/media.ts"

let server: Server
let origin = ""
const root = mkdtempSync(join(tmpdir(), "elevenlabs-media-"))

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/voice.mp3") {
      response.writeHead(200, { "content-type": "audio/mpeg", "content-length": "8" })
      response.end(Buffer.from("ID3fake!"))
      return
    }
    if (request.url === "/page") {
      response.writeHead(200, { "content-type": "text/html" })
      response.end("<html></html>")
      return
    }
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "/voice.mp3" })
      response.end()
      return
    }
    if (request.url === "/away") {
      response.writeHead(302, { location: "https://example.com/file.mp3" })
      response.end()
      return
    }
    response.writeHead(404)
    response.end()
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (address === null || typeof address === "string") throw new Error("no port")
  origin = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
  rmSync(root, { recursive: true, force: true })
})

const deps = () => ({ root, maxBytes: 1024, hosts: ["127.0.0.1"] })

describe("save_media", () => {
  test("downloads one file under the root and reports its path, size, hash and type", async () => {
    const saved = await saveMedia({ url: `${origin}/voice.mp3`, name: "voice" }, deps())
    expect(saved).toMatchObject({ path: join(root, "voice.mp3"), bytes: 8, mime: "audio/mpeg" })
    expect(saved.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(readFileSync(saved.path, "utf8")).toBe("ID3fake!")
  })

  test("follows a loopback redirect and refuses one to another host", async () => {
    const saved = await saveMedia({ url: `${origin}/redirect`, name: "redirected" }, deps())
    expect(saved.path).toBe(join(root, "redirected.mp3"))
    await expect(saveMedia({ url: `${origin}/away`, name: "away" }, deps())).rejects.toMatchObject({ code: "INPUT_INVALID" })
  })

  test("refuses a second file of the same name without overwrite", async () => {
    await expect(saveMedia({ url: `${origin}/voice.mp3`, name: "voice" }, deps())).rejects.toMatchObject({ code: "UNAVAILABLE" })
    const saved = await saveMedia({ url: `${origin}/voice.mp3`, name: "voice" }, { ...deps(), overwrite: true })
    expect(saved.bytes).toBe(8)
  })

  test("refuses a missing file, a non-media page, and a file over the cap", async () => {
    await expect(saveMedia({ url: `${origin}/missing`, name: "missing" }, deps())).rejects.toMatchObject({ code: "UNAVAILABLE" })
    await expect(saveMedia({ url: `${origin}/page`, name: "page" }, deps())).rejects.toMatchObject({ code: "UNAVAILABLE" })
    await expect(saveMedia({ url: `${origin}/voice.mp3`, name: "small" }, { ...deps(), maxBytes: 4 })).rejects.toMatchObject({ code: "TOO_LARGE" })
  })

  test("checks a URL's scheme, port, credentials and host", () => {
    expect(() => checkUrl("https://elevenlabsusercontent.com/a.mp3", ["elevenlabsusercontent.com"])).not.toThrow()
    expect(() => checkUrl("http://elevenlabsusercontent.com/a.mp3", ["elevenlabsusercontent.com"])).toThrow(/https/)
    const withCredentials = new URL("https://elevenlabsusercontent.com/a.mp3")
    withCredentials.username = "user"
    withCredentials.password = "secret"
    expect(() => checkUrl(withCredentials.toString(), ["elevenlabsusercontent.com"])).toThrow(/username/)
    expect(() => checkUrl("https://example.com/a.mp3", ["elevenlabsusercontent.com"])).toThrow(/generated-file/)
    expect(() => checkUrl("https://elevenlabsusercontent.com:8443/a.mp3", ["elevenlabsusercontent.com"])).toThrow(/port/)
  })
})
