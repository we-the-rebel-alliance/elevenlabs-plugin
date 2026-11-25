# Security

Unofficial; not affiliated with ElevenLabs.

## Supported versions

OpenCode `>=2.4.1 <2.5.0`. Tested on 2.4.1.

## Reporting a vulnerability

Report privately through GitHub's private vulnerability reporting on
<https://github.com/we-the-rebel-alliance/elevenlabs-plugin>. Do not open a public issue for a security problem.

## Data handling

- The OAuth token is OpenCode's. The plugin never reads, stores, logs or prints it.
- Conversations returned by the vendor's tools hold other people's words and identifiers. They are untrusted data and
  personal data; the `elevenlabs-calls` skill says to summarise rather than dump them.
- The events source is metadata only: no caller, transcript, summary, score or feedback.
- `save_media` downloads only `https` links on `elevenlabsusercontent.com`, checks every redirect, and writes under
  `mediaRoot` only.
- Nothing else leaves the machine; there is no telemetry and no second API client.

`docs/security.md` has the full account, including scopes, redaction and the access levels.
