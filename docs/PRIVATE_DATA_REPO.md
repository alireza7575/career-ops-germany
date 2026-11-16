# Set up your private career data repository

New to AI assistants or command-line tools? Start with [the beginner walkthrough](BEGINNER_SETUP.md), which includes messages you can paste into your assistant to help with this setup.

Keep two sibling folders: one for this fork's code, another for your personal data. You can update or share the code without publishing your CV, profile or applications.

```text
career-workspace/
├── career-ops-germany/   # Public code checkout; run the CLI here
│   └── .career-ops-data # Local pointer to ../career-ops-data
└── career-ops-data/      # Your separate PRIVATE Git repository
    ├── .gitignore
    ├── cv.md
    ├── config/profile.yml
    ├── modes/_profile.md
    ├── modes/_custom.md
    ├── portals.yml
    ├── data/applications.md
    └── reports/
```

This guide creates a new setup. If you already have a private data repository, skip to [Use an existing repository on another computer](#use-an-existing-repository-on-another-computer). If your data currently lives inside the code checkout, see [Move an existing setup](#move-an-existing-setup).

## 1. Install the code

You need Git, Node.js matching the requirements in [package.json](../package.json), an AI coding CLI, and a GitHub account. Run these commands in the parent folder where you want both repositories:

```bash
git clone https://github.com/alireza7575/career-ops-germany.git
cd career-ops-germany
npm install --ignore-scripts
```

For browser/PDF dependencies and the optional web app, follow [the setup guide](SETUP.md) and [web app instructions](../web/README.md).

## 2. Create an empty private GitHub repository

Open [GitHub's new repository page](https://github.com/new) while signed in.

1. Choose your own account as the owner.
2. Name the repository `career-ops-data`.
3. Select **Private**.
4. Leave README, .gitignore and license initialization unchecked; you will create the files locally.
5. Create the repository and copy its HTTPS clone URL.

The examples below use `YOUR_USERNAME`. Replace it with your actual account name. Use the URL GitHub provides if your repository has another name. Authenticate using Git's credential manager or your SSH setup; never put a token into a remote URL or a committed file.

## 3. Create the local data repository

From the `career-ops-germany` code folder:

```bash
mkdir ../career-ops-data
cd ../career-ops-data
git init -b main
git remote add origin https://github.com/YOUR_USERNAME/career-ops-data.git
```

Create `.gitignore` in this data folder **before adding personal files**. The code repository's ignore rules do not apply here. Start with:

```gitignore
# Credentials and local environment
.env
.env.*
!.env.example
.career-ops.env
**/.career-ops.env
.direnv/
credentials/
secrets/
*.pem
*.key
.pii-token-map.json
**/.pii-token-map.json

# Local sessions, caches and backups
.career-ops-web/
node_modules/
.cache/
*.log
*.lock
*.bak*
.DS_Store
Thumbs.db

# Source documents and sensitive third-party data stay local
documents/
data/contacts.tsv
data/Connections.csv
data/offers/
data/intake-snapshots/
interview-prep/sessions/

# Generated application files stay local by default
output/
outputs/
```

This deliberately allows your CV, profile, targeting rules, portal settings, tracker and evaluation reports to be versioned in the private repository. Keep credentials in the process environment or ignored local files. Check that any `.env.example` contains placeholders only. Add ignore entries for other credential files your integrations create.

Ignored documents and outputs will not be restored by Git on another computer. Back up any originals you need separately. If you choose to version generated application files, remove their ignore entries only in this private repository and review what will be uploaded.

## 4. Connect the code to your data folder

Return to the code checkout:

```bash
cd ../career-ops-germany
```

Create a plain-text file named `.career-ops-data` here containing exactly:

```text
../career-ops-data
```

You can create it in your editor. On PowerShell, this command writes the same file:

```powershell
Set-Content -LiteralPath .career-ops-data -Value '../career-ops-data' -Encoding ascii
```

The relative path is resolved from the code repository, so sibling folders work on Windows, macOS and Linux. The marker is local and ignored by Git. `CAREER_OPS_ROOT` or `CAREER_OPS_DATA_DIR`, if set, overrides the marker; remove an obsolete override or point it at this same folder. `CAREER_OPS_TRACKER` independently overrides the tracker path, so check that too if tracker changes appear elsewhere.

Verify the resolved location from the code checkout:

```bash
node --input-type=module -e "import { getCareerOpsRoot } from './path-resolver.mjs'; console.log(getCareerOpsRoot())"
```

The printed path must be your separate `career-ops-data` folder.

## 5. Onboard with your own information

Open your AI coding CLI in `career-ops-germany`, then ask:

> Run career-ops onboarding. Resolve the data root from .career-ops-data and keep my personal files there. Help me add my own CV, target roles, languages, location policy and salary targets. For this new setup, use templates/portals.germany.example.yml as portals.yml and set language.modes_dir to modes/de. Ask which output language I want. Preserve existing files and never commit credentials.

Supply your own information rather than keeping example facts. Optional German screening rules are in [templates/custom.germany.example.md](../templates/custom.germany.example.md); merge the rules you want into your data folder's `modes/_custom.md`.

Check setup from the code checkout:

```bash
node doctor.mjs --json --cli codex
```

Use your CLI's name if different. Resolve missing and unpersonalized profile entries before scanning. The canonical tracker is `data/applications.md` inside the data folder unless you explicitly override it.

## 6. Review, commit and push your data

First confirm on GitHub that the destination repository is **Private**. Then, from your data folder:

```bash
cd ../career-ops-data
git remote -v
git status --short
git add .
git diff --cached --stat
git diff --cached
```

Review the staged files. Personal career data belongs here; passwords, API keys and authentication tokens do not. If you accidentally staged a file, unstage it with `git rm --cached -- path/to/file` for a newly added file, add its path to `.gitignore`, and review again. The local file remains on disk.

When the staged content is correct:

```bash
git commit -m "Set up private career data"
git push -u origin main
```

If Git asks for an author identity, configure your own name and email with `git config user.name "Your Name"` and `git config user.email "you@example.com"`, then retry the commit. GitHub authentication is separate from this author identity.

Check the private repository on GitHub: your expected files should be there, with no credentials or local-only documents. Verify the public code repository did not acquire your personal files.

## Daily use

Run Career-Ops from the **code checkout**. Its path resolver sends personal reads and writes to the data repository. Commit code changes in the code repository and career-data changes in the private repository.

Before using the same data on another computer, pull in the data folder:

```bash
git pull --ff-only
```

After a session, review and save your changes from that same data folder:

```bash
git status --short
git add .
git diff --cached
git commit -m "Update career search data"
git push
```

Avoid editing the same tracker on two computers at once. If a pull or push reports divergent history, resolve the conflicting edits before continuing; do not force-push over the other computer's work. Use [the German-market guide](GERMAN_MARKET.md#receive-upstream-updates) to update this fork's code separately.

## Use an existing repository on another computer

1. Clone the code and install dependencies as in step 1.
2. From the parent folder, clone your private data repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/career-ops-data.git
   ```

3. Create `.career-ops-data` in the code checkout as in step 4.
4. Check the resolved data root and run `node doctor.mjs --json --cli codex` from the code checkout. Keep your existing CV and profile; no fresh onboarding is needed when the prerequisites are present and personalized.
5. Restore any required ignored documents from your separate backup and configure credentials locally. Update machine-specific paths in your profile, such as a photo or custom template path.

## Move an existing setup

Back up your current files first. Create the separate private repository and its `.gitignore`, then **copy** your user-layer files from the old data root. Use [DATA_CONTRACT.md](../DATA_CONTRACT.md) to identify them: include your CV, profile, personalized modes, portals, tracker and any reports or interview notes you want to retain. Do not copy the old `.git` folder, system scripts or dependencies.

Connect the new folder using step 4 and verify the path and doctor output before removing any old copies. If the old tracker is `applications.md` at the data root, place it at `data/applications.md` in the new folder; do not replace a newer tracker. An explicit tracker override takes precedence over both paths.

If personal files or credentials were previously committed to the public code repository, moving or ignoring them does not erase Git history. Rotate exposed credentials immediately and address the published history separately.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Files appear in the code checkout | Verify the marker's name and contents, then inspect the data-root environment overrides. Restart a running CLI or web server after changing its environment. |
| Tracker changes go somewhere else | Check `CAREER_OPS_TRACKER` and the new folder's `data/applications.md`. |
| An ignored secret still appears in Git | Ignore rules do not affect already tracked files. Remove it from tracking with `git rm --cached -- path/to/file`; rotate it if previously pushed. |
| The data push is rejected | Check the remote URL, authentication and repository access. Pull and resolve divergence instead of force-pushing. |
| An output is missing after cloning | Ignored files are local-only; restore them from your separate backup or regenerate them. |

For the optional web app, also check [its data-root configuration](../web/README.md), especially any `CAREER_OPS_ROOT` set in `web/.env.local`.
