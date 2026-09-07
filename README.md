# Cool Code CAD

A static, curated field guide to code-first CAD, geometry kernels, G-code tooling,
CAM, slicing, visualization, simulation, and programmatic manufacturing.

Browse the published guide at
[kylegrover.github.io/cool-code-cad](https://kylegrover.github.io/cool-code-cad/).

Last curated research pass: **2026-09-07**. This pass added Rig Cad. The prior
pass added the CAD-to-machine pipeline explainer, refreshed active B-Rep and
agent-tooling projects, and added ChiselCAD, build123d-mcp, oscad, Monstertruck,
vcad, and brepkit/brepjs.

## Scope and caveats

- The catalog is a starting point, not a compatibility guarantee or endorsement.
- G-code is controller- and firmware-specific. Verify commands, units, coordinate
  systems, limits, and safety behavior against the target machine before running
  generated output.
- GitHub star counts are optional snapshots, not quality rankings. Each displayed
  count includes an as-of date.
- The collection began as personal research notes. Copy and some research were
  prepared with LLM assistance, so corrections and primary-source updates are
  welcome.

## Run locally

The page uses JavaScript modules, so it must be served over HTTP; opening
`index.html` directly as a `file://` URL will not work reliably in browsers.

From the project directory, run the dependency-free preview server:

```text
npm start
```

Then browse to <http://127.0.0.1:8000>. To choose another port, pass it after
`--`, for example `npm start -- 4173`.

## Validate and regenerate

Maintenance scripts require Node.js 18.17 or newer and have no package
dependencies. `npm install` is not required.

```text
npm run validate       # schema, anchors, metadata, and generated-file drift
npm test               # alias for the local validation suite
npm run generate       # normalize data.js and regenerate llm.txt + toc.txt
npm run validate:links # also check external URLs; network failures are warnings
```

Run validation after editing `data.js`. The generator deliberately rewrites
`data.js` in a consistent JSON-style format.

## Refresh GitHub star snapshots

An authenticated refresh avoids GitHub's low anonymous API limit. Set the token
for the current shell only:

```text
# macOS/Linux
export GITHUB_TOKEN=ghp_xxx

# Windows PowerShell
$env:GITHUB_TOKEN = 'ghp_xxx'
```

Then run:

```text
npm run refresh
```

This normalizes the catalog, refreshes available star counts, records an as-of
date for every snapshot, and regenerates the two text outputs. Without a token,
the updater may reach GitHub's hourly limit; older cached values are retained
with their original dates instead of being presented as current.

To apply the existing cache without making network requests:

```text
node fetch-stars.mjs --cache-only
npm run generate
```

## Repository map

- `data.js` — canonical catalog content and pipeline explainer data.
- `script.js`, `style.css`, `hero-canvas.js`, `pipeline-visuals.js`, `favicon.svg` — browser presentation (`pipeline-visuals.js` renders every illustration in the CAD-stack infographic from one parametric bracket model).
- `serve.mjs` — dependency-free local preview server used by `npm start`.
- `normalize-data.mjs` — normalizes links and license/access metadata.
- `fetch-stars.mjs` — refreshes dated GitHub star snapshots.
- `generate-llm-txt.mjs`, `generate-toc.mjs` — build generated text references.
- `validate-data.mjs` — checks schema, stable anchors, generated output, and
  optionally live links.
- `PROJECTS.md` — notes about the maintainer's related projects; it is not the
  source for the public catalog.

## Contributing

Edit `data.js`, place an entry in the most useful primary category, and prefer
official project pages, repositories, documentation, releases, or papers as
links. Historical and experimental projects are welcome when their status is
clearly labeled. Run `npm run generate` and `npm run validate` before submitting
a change.

Small corrections, rough issue reports, and half-formed suggestions are all
welcome.

## License

The code and original catalog content in this repository are dedicated to the
public domain under [CC0 1.0 Universal](LICENSE). You may copy, modify,
distribute, and use them for any purpose without permission or attribution.

CC0 applies only to rights held by this repository's contributors. Third-party
project names, trademarks, and linked materials remain subject to their
respective owners' rights and terms.
