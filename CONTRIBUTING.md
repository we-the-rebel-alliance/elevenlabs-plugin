# Contributing

## Setup

```sh
git clone https://github.com/we-the-rebel-alliance/elevenlabs-plugin
cd elevenlabs-plugin
npm ci
```

Node 24 is required: the conformance host and pack tests run the real OpenCode 2.4.1 host, which needs it.

## Checks

```sh
npm run check          # every stage, in order, stopping at the first failure
npm run check unit     # one stage
```

Stages: `typecheck`, `bundle`, `unit`, `host`, `pack`, `kit`. The `bundle` stage rewrites the committed `dist/index.js`; commit it with any source change. CI fails when it is stale. `pack` builds and installs the tarball in a temp project;
`kit` is `plugin-kit check` (the manifest, T0, T1, the fixture, docs and forbidden patterns). The same list is the `ci`
job.

## The manifest

`package.json` `capabilities` is the source of truth. A method, source or action is declared there first; the handlers and
tests follow. `npx plugin-kit docs` writes the generated sections; `npm run check` fails when they drift.

## Fixtures

`fixtures/conformance.json` is recorded from the plugin's own handlers against the deterministic two-account provider in
`test/support/`. `test/unit/fixture.test.ts` rebuilds it and fails when the committed file differs, so a handler change
must update the fixture in the same pull request. A real recording needs two signed-in aliases; `npx plugin-kit record --account <alias>` redacts it and `--check` proves
the committed file is clean. Never commit a real person, call or credential.

## Standards

The repository follows the [plugin standard](https://github.com/we-the-rebel-alliance/plugin-contract/blob/master/docs/plugin-standard.md)
and the [contract](https://github.com/we-the-rebel-alliance/plugin-contract/blob/master/docs/contract.md). A pull request
is reviewed against them, and `npm run check` must be green.

## Releasing

The owner cuts a release with `npx plugin-kit release <version>` after the version and the CHANGELOG section are in the
pull request. CI publishes the GitHub release on the tag. Do not push a tag by hand.
