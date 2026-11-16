# Career-Ops Germany

An AI job-search workspace for the German market. Find roles, evaluate postings against your experience, draft tailored CVs, and track applications through your AI coding CLI or a local web app.

This community fork builds on [career-ops](https://github.com/career-ops-hq/career-ops), created by [Santiago Fernández de Valderrama (santifer)](https://santifer.io). Keep your career data in a separate private folder. You review drafts and submit applications yourself.

[New to AI?](#new-to-ai-start-here) · [Quick start](#quick-start) · [Private data setup](docs/PRIVATE_DATA_REPO.md) · [German-market guide](docs/GERMAN_MARKET.md) · [Web app](web/README.md)

## New to AI? Start here

You do not need to write code. An **AI coding assistant** is an app you can talk to in ordinary language that can also work with files on your computer. Career-Ops supplies the job-search instructions and tools; the assistant helps you set them up and use them.

Choose **Codex or Claude Code**, then follow the [beginner walkthrough: let AI help you set up](docs/BEGINNER_SETUP.md). It has separate getting-started instructions for both assistants, followed by shared setup prompts. Use the prompts in its chat box; commands such as `git clone` belong in a terminal, which the assistant can help you use.

Your first message can be:

> I am new to AI and technical setup. Help me install https://github.com/alireza7575/career-ops-germany for my own job search. First ask which operating system I use and where I want the files. Check what is already installed, explain each step in plain language, and handle the setup work you can. Keep my career data in a separate private folder. Do not ask for passwords or API keys in chat. Tell me clearly whenever I need to click something or sign in myself.

**Start with the walkthrough before sharing your CV.** It takes you through private data setup, adding your own experience, and evaluating one job. If you already use an AI coding assistant, continue with the quick start below.

## What this fork adds

| Area | German-market workflow |
| --- | --- |
| Discovery | A reusable German software-role portal preset, Bundesagentur and Arbeitnow in the web Explorer, and optional search-based discovery. |
| Evaluation | German-market modes, with market rules selected independently from the language of reports and drafts. |
| Personal data | A documented two-repository setup: public code and your own private CV, profile, tracker and reports. |
| Windows | Codex Desktop bundle detection and an optional Windows Task Scheduler worker for saved scans. |

The preset is a starting point. Personalize your roles, languages, location policy and salary targets before relying on recommendations.

## Quick start

### 1. Clone and install

You need Git, Node.js matching the engines in [package.json](package.json), and an AI coding CLI such as Codex or Claude Code.

```bash
git clone https://github.com/alireza7575/career-ops-germany.git
cd career-ops-germany
npm install --ignore-scripts
```

The upstream npm initializer installs the original project. Clone this repository to get this fork's additions.

### 2. Connect your private data folder

Follow the [complete private data repository guide](docs/PRIVATE_DATA_REPO.md) to create your **private** GitHub repository, configure ignore rules, and make your first push.

Use two sibling folders:

```text
career-workspace/
├── career-ops-germany/   # Code; run the CLI here
└── career-ops-data/      # Your private data repository
```

In the code folder, create a plain-text `.career-ops-data` file containing:

```text
../career-ops-data
```

This local marker is ignored by Git. Data-root environment variables override it; see the [guide](docs/PRIVATE_DATA_REPO.md#4-connect-the-code-to-your-data-folder) if you have an existing setup.

### 3. Onboard with your own CV

Open your AI coding CLI in `career-ops-germany` and ask:

> Run career-ops onboarding using the data root in .career-ops-data. Help me add my own CV, target roles, languages, location policy and salary targets. For this new setup, use templates/portals.germany.example.yml as portals.yml and set language.modes_dir to modes/de. Ask which output language I want. Keep personal data in the data root and preserve existing files.

Then check setup from the code folder:

```bash
node doctor.mjs --json --cli codex
```

Use your CLI's name if different. Resolve missing or unpersonalized profile entries before scanning. For an existing `portals.yml`, merge the desired preset entries instead of replacing your configuration.

### 4. Run your first scan

Ask your agent:

> Run career-ops scan mode for the enabled API boards and configured web searches. Screen results against my profile and report sources you could not scan. Keep uncertain matches pending.

For browser installation and PDF dependencies, see [the full setup guide](docs/SETUP.md).

## Choose your language

Merge this into `config/profile.yml` in your **data folder**:

```yaml
language:
  modes_dir: modes/de
  output: en
```

`modes/de` selects German-market evaluation rules. Set `output: de` for German reports and drafts, or keep `en` for English. This setting does not translate the web interface. Preserve other settings in an existing `language` section.

Optional [German screening rules](templates/custom.germany.example.md) belong in your data folder's `modes/_custom.md`. Personal targeting belongs in `config/profile.yml` and `modes/_profile.md`.

## Daily use

Run your agent from the code folder. It reads and writes career files in the configured data folder.

| Task | Example prompt |
| --- | --- |
| Find jobs | Run career-ops scan mode using my German-market portals and profile. Report incomplete coverage. |
| Evaluate a job | Evaluate this job with career-ops auto-pipeline: `<job URL>`. Verify location, working arrangement and language requirements. |
| Tailor a CV | Run career-ops PDF mode for my latest evaluated role, using only facts supported by my approved source files. |

Read each evaluation and generated application before sending it. Save career-data changes in the private repository and code changes in this repository. The [private data guide](docs/PRIVATE_DATA_REPO.md#daily-use) covers syncing between computers.

## Optional local web app

```bash
cd web
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The app provides Pipeline, Explore, CV, Config and analytics views. It binds to loopback by default. See [web/README.md](web/README.md) for requirements, data-root overrides and scheduled scans.

![German-market Explorer in Career-Ops Germany, using an isolated demo data folder](docs/germany-explorer.png)

*Explorer from this fork with demo settings. No personal career data is shown.*

## Limits and review

- Search hits are leads. Verify that the employer's posting is live and matches your location, working arrangement, language and hiring-eligibility requirements.
- API-board scans and agent-led web searches are separate. Missing credentials or inaccessible sources mean incomplete coverage.
- CVs and application drafts must use your approved facts. Review them for accuracy before sending.
- Assisted application flows leave submission to you. You review the form and press Submit.
- Files stay in your local workspace, but the AI provider and optional search services you choose receive the data needed for their requests. A private GitHub data repository also uploads the files you commit there.

## Updates and troubleshooting

This is a maintained fork. Follow [the fork update instructions](docs/GERMAN_MARKET.md#receive-upstream-updates): merge upstream changes into your code checkout, resolve conflicts, run checks, and push your tested branch. The system updater can replace system files or preserve customized files, leaving a mixed installation; do not assume a version label proves compatibility.

Keep your personal data repository separate and back it up. Its ignore rules are independent of this code repository's rules.

| Problem | Next step |
| --- | --- |
| Setup reports missing files | Run `node doctor.mjs --json --cli codex` from the code folder and finish onboarding. |
| Files appear in the wrong folder | Check `.career-ops-data`, `CAREER_OPS_ROOT`, `CAREER_OPS_DATA_DIR`, and any web environment overrides. Check `CAREER_OPS_TRACKER` for tracker-specific overrides. |
| Search results do not fit | Personalize `portals.yml`, your location policy and language requirements; verify the full posting. |
| Some sources are missing | Check source configuration and credentials. Optional Indeed/LinkedIn search discovery needs `SERPER_API_KEY`; keep it out of Git. |
| PDF or browser startup fails | Follow [the setup guide](docs/SETUP.md) for browser dependencies. |
| CI fails after an update | Inspect failures before merging; preserved fork code and newer upstream contracts may need reconciliation. |

More help: [German-market guide](docs/GERMAN_MARKET.md) · [Private data troubleshooting](docs/PRIVATE_DATA_REPO.md#troubleshooting) · [Supported boards](docs/SUPPORTED_JOB_BOARDS.md) · [FAQ](docs/FAQ.md) · [Data contract](DATA_CONTRACT.md).

## Upstream credits and license

The original Career-Ops project was created by **Santiago Fernández de Valderrama (santifer)**. Its job-search pipeline, modes, scoring framework and core tooling come from [career-ops-hq/career-ops](https://github.com/career-ops-hq/career-ops). Existing Bundesagentur and Arbeitnow providers also come from upstream; this fork adds the workflow integration and presets described above.

Read [the original project and its documentation](https://github.com/career-ops-hq/career-ops#readme) for the author's story, community, sponsors and broader CLI integrations. Upstream translations, including [Deutsch](README.de.md), describe the original project and may differ from this fork's setup.

Licensed under [MIT](LICENSE). The Career-Ops name and brand remain subject to the upstream [Trademark Policy](TRADEMARK.md). See also [the legal disclaimer](LEGAL_DISCLAIMER.md).
