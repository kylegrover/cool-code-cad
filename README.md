# gcode-knowledge-site

A static knowledge site for code-first CAD, G-code generators, and programmatic manufacturing tools.

## What it is

- A curated collection of open-source libraries, frameworks, and tools geared towards code-based CAD, G-code generation, and programmatic manufacturing or creative workflows.
- Data is defined in `data.js` as JSON-like items grouped into sections/subsections.
- The site is rendered dynamically in the browser via `script.js`.
- Optional stars for GitHub repos are fetched with `fetch-stars.mjs` and written to `data.js`.

> this project was originally built from my notes of cool projects I found while researching my gcode and code cad related projects, but content copy and additional research are largely generated with LLM assistance. There may be mistakes or outdated info; contributions and corrections are very welcome.

## Run locally

1. Open `index.html` in a browser (no build step required).
2. For live editing and local server, run (from project root):
   - `python -m http.server 8000` (or your favorite static server)
   - Browse `http://localhost:8000`

## Update GitHub stars

1. Add a GitHub token (llm recs this to avoid rate limits, tbh it hasn't been a problem yet tho):
   - `export GITHUB_TOKEN=ghp_xxx` (macOS/Linux)
   - `setx GITHUB_TOKEN "ghp_xxx"` (Windows PowerShell)
2. Run:
   - `node fetch-stars.mjs`
3. This script updates `data.js` with `stars: <number>` entries, normalizes schema links and licenses via `normalize-data.mjs`, and regenerates `llm.txt` via `generate-llm-txt.mjs`.

## Normalize schema manually

If you only want normalization without fetching stars:

- `node normalize-data.mjs`

## Contributing

- Fix typos, descriptions, URLs, tags, and star data in `data.js`.
- Add new tools to the appropriate section and include source references.
- Pull requests are welcome.
- You can also just throw whatever half cooked thought as an issue and I'll do what I can to sort it too, this is pretty much just a place for me to dump and organize my notes on cool projects, so don't worry about strict standards for contributions

## License

Use this repository as you like; a link back is appreciated if you reuse the content in a public project, but not required.