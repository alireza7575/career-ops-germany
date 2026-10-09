# German-market starter

This fork adds a reusable German software-search starter to upstream career-ops. Each person supplies their own CV, profile and application data. Existing Arbeitsagentur and Arbeitnow providers and German-market modes come from upstream.

## Set up your own data

1. Clone this fork and run npm install --ignore-scripts. Use the normal setup guide if you also need Playwright browsers.
2. Choose a separate personal data directory. In the code checkout, create a local .career-ops-data file containing its absolute path. The marker is ignored by Git. CAREER_OPS_ROOT or CAREER_OPS_DATA_DIR overrides it if set.
3. Ask your coding agent to run career-ops onboarding with that data root. Supply your own CV and personalize config/profile.yml and modes/_profile.md. Confirm your languages, location policy, target roles and compensation.
4. For a new setup, copy templates/portals.germany.example.yml from the code checkout into your data root as portals.yml. If portals.yml already exists, review and merge the desired entries instead of overwriting it.
5. Optionally merge templates/custom.germany.example.md from the code checkout into your data root's modes/_custom.md. Keep any existing rules.
6. Run node doctor.mjs --json --cli codex (or your CLI) from the code checkout. Ask the agent to run career-ops scan mode for API boards AND the configured web searches.

The starter is for software roles across Germany, not a verified-match list. Its title keywords and negative list are editable. Add a location_filter for your own policy and set Bundesagentur's wo to your city when you want local results. International or restricted-remote leads still need JD screening.

For German-market evaluation vocabulary, set language.modes_dir to modes/de in your own config/profile.yml. Set language.output independently to en or de for the prose you want.

## Web Explorer

The Explorer includes Bundesagentur and Arbeitnow alongside the upstream ATS sources. Optional Indeed Germany and LinkedIn discovery uses Serper search credits; those sources are not enabled by default. Supply SERPER_API_KEY through the server process environment if you want them. Never commit the key.

Indexed search results are leads, not verified vacancies: their snippets cannot establish posting age, full-remote status, language requirements or hiring-country eligibility. Missing credentials or a source failure must be reported as incomplete coverage.

On Windows, CLI detection also checks complete Codex Desktop bundles, preferring the newest bundle with the required sandbox helpers. Other CLI install locations remain available as fallbacks.

## Keep code and personal data separate

Share the fork, generic presets and code improvements. Keep CVs, profiles, portals.yml, application trackers, interview notes and reports in your personal data directory. For version history, initialize that directory as a separate PRIVATE repository; ignore credentials, caches and unwanted generated outputs there. The code repo's ignore rules do not automatically protect a separate data repo.

## Receive upstream updates

Configure origin as your fork and upstream as https://github.com/career-ops-hq/career-ops.git. With your code changes committed and the working tree clean:

~~~powershell
git switch main
git fetch upstream
git merge upstream/main
~~~

Resolve conflicts, run the relevant checks, and push your tested branch to your fork. Your friend can then pull the shared branch. Use Git merges for this maintained fork: update-system.mjs apply replaces system files and can overwrite fork modifications.

See [the full setup guide](SETUP.md), [supported boards](SUPPORTED_JOB_BOARDS.md), and [the data contract](../DATA_CONTRACT.md).
