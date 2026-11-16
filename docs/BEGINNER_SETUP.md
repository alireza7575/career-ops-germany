# First time using AI? Set up Career-Ops with help

You can ask an AI assistant to do the technical work and explain the parts you need to do yourself. You do not need to understand Git commands or edit configuration files before starting.

By the end, you should have this project's code, a separate private career-data folder, your own profile, and an evaluation of one job you choose.

## A few words you will see

| Word | What it means here |
| --- | --- |
| AI assistant | The app you talk to. A coding assistant can also read files, edit them and run setup commands when allowed. |
| Prompt | A message you type or paste into the assistant's chat box. Ordinary language is enough. |
| Project folder | The folder on your computer where the assistant works. Choose it deliberately. |
| Terminal / CLI | A place to run text commands. You can ask the assistant to run them or explain exactly where to paste them. |
| Repository / repo | A folder whose changes Git tracks. GitHub can store an online copy. |
| Private data repo | Your separate repository for CV, profile and job-search records. Its GitHub visibility must be Private. |

## 1. Get an assistant that can work with local files

Choose **Codex or Claude Code**. You only need one. Both can follow the setup prompts below; other supported assistants are listed in [SUPPORTED_CLIS.md](SUPPORTED_CLIS.md).

### Option A: Codex

1. Follow the [official desktop quickstart](https://learn.chatgpt.com/docs/quickstart) to install the app for your operating system and sign in.
2. Select **Codex** and choose a local project folder for this work.
3. Start a chat associated with that folder. Paste the setup message from step 2 below into its chat box.

For the terminal alternative, see [this project's Codex guide](CODEX.md). In a terminal opened in your working folder, `codex` starts the interactive assistant.

### Option B: Claude Code

1. Follow the [official Claude desktop quickstart](https://code.claude.com/docs/en/desktop-quickstart) to install the app and sign in. Check its current account requirements.
2. Open the **Code** tab. Choose a **Local** environment and your working folder.
3. Start a session there. Paste the same setup message from step 2 below into its prompt box.

Use Claude **Code**, rather than a regular Claude chat, for this local setup. If you prefer a terminal, follow [Claude Code's CLI quickstart](https://code.claude.com/docs/en/quickstart), then run `claude` in your working folder. The desktop Code tab and terminal CLI have separate installation steps; you do not need the CLI just to start a desktop session.

### Choose the folder for either assistant

Create an empty parent folder, such as `career-workspace`, using your computer's file manager, and select it for your local session. It will hold the code and private data side by side. Follow the official instructions for current installation and account requirements; these can change.

A regular browser chat without access to your local folder can explain commands, but cannot perform this local setup for you. You do not need to install the upstream Career-Ops plugin for this walkthrough: it uses a checkout of the German fork.

If the app's labels differ, ask its help or follow the official guide for opening a local folder. You are ready when your chat is associated with the folder you chose.

## 2. Ask the assistant to prepare the project

Paste the following into the **assistant's chat box**, not a terminal:

```text
I am new to AI and technical setup. Help me install Career-Ops Germany:
https://github.com/alireza7575/career-ops-germany

First ask which operating system I use and confirm the local folder where
you can work. Check whether Git and a compatible Node.js are installed.
If something is missing, guide me through installing it from its official
source. Explain any step I need to perform myself.

Clone this fork into a career-ops-germany subfolder without replacing any
existing folder. Read its project instructions and README, and install its
dependencies as documented. Explain each result in plain language.

Do not ask for my CV yet. Do not ask me to paste passwords, authentication
codes, API keys or tokens into chat. Do not publish or push anything yet.
```

Answer its questions. When a step needs an installer, account sign-in, or access outside the selected folder, the assistant may need your action or permission. Read what the action does before allowing it. If you do not understand a request, say:

> Explain what this changes, why it is needed, and what I need to do. Please use simple words.

After cloning, open `career-ops-germany` as the assistant's project folder and start or continue a chat there. Tell it that setup has already begun; it should inspect the existing files rather than start over.

**Checkpoint:** Ask it to show the code folder's full path and confirm whether dependency installation completed. An attempted command is not proof that installation worked.

## 3. Set up private storage before adding your CV

Create your own GitHub account if you do not have one. You will sign in yourself. Then paste this into the chat in the code project:

```text
Help me follow docs/PRIVATE_DATA_REPO.md one step at a time.
Prepare a sibling career-ops-data folder and its ignore rules, and connect
the code to it using .career-ops-data. Preserve any existing files.

Guide me through creating an empty PRIVATE GitHub repository under my own
account. I will do the sign-in and choose Private myself. Ask for the repo
URL when needed, never my password or token. Do not put my career files in
the public code repository, and do not push until I approve the file list
and destination.

Check and show the resolved data folder and the remote URL. Explain which
files will be uploaded and which will stay only on this computer.
```

Follow the [private data guide](PRIVATE_DATA_REPO.md) when the assistant asks you to create the GitHub repository. You can keep working locally while arranging the online backup, but do not push career data until you have confirmed the destination is private.

**Checkpoint:** You should have two separate folders, and the assistant should show that personal reads and writes resolve to `career-ops-data`. GitHub should show **Private** for the data repository. Credentials and ignored original documents should not be staged for upload.

The AI service you choose may receive information you share or ask it to process. A private GitHub repository controls access to the files you upload there; it does not make your AI conversation offline. Share only information you are comfortable processing with those services.

## 4. Build your profile in conversation

Once the data folder is connected, paste:

```text
Run career-ops onboarding using my configured private data folder.
Ask me for my CV and then my target roles, location and working arrangement,
spoken languages, salary expectations, and preferred output language.
Explain unfamiliar terms and ask a small number of questions at a time.

Use German-market evaluation modes and the German portal preset for this
new setup. Keep my facts in the user-layer files. Do not invent experience
or leave example people's facts in my profile. Show me the profile summary
for review and run doctor to check for missing or unpersonalized settings.
```

You can paste your CV text. If you supply a document for intake, ask the assistant to propose source-backed facts for your review before adding them to your profile. Correct anything inaccurate; you can say “I don't know” rather than guessing a number.

**Checkpoint:** The summary should describe you, not a sample candidate. The assistant should explain any remaining setup warnings before moving on. Choose German-market rules with English or German writing; you do not have to write prompts in German.

Ask it to run the setup check for the assistant you chose: `node doctor.mjs --json --cli codex` for Codex, or `node doctor.mjs --json --cli claude` for Claude Code. The assistant can run this command and explain its output; you do not need to type it into the chat as a standalone command.

## 5. Try one job before a large search

Copy the URL of a job you are considering and paste:

```text
Evaluate this job with career-ops auto-pipeline: PASTE_THE_JOB_URL_HERE
Use my approved profile. Explain the fit, missing requirements, location,
working arrangement and language requirements in simple words. Tell me if
you cannot read the posting. Save the evaluation in my private data folder.
Do not submit an application or send a message.
```

Replace `PASTE_THE_JOB_URL_HERE` with the real link. If the assistant cannot access the posting, you can paste its text instead. Read the result and correct misunderstandings before asking for a CV or running a broader scan.

To continue, try one of these:

- “Find new jobs using my configured portals. Report what you could not search.”
- “Draft a CV for this evaluated job using only my approved experience. Let me review it.”
- “Show my application tracker and explain what needs attention.”
- “Help me review and back up today's data changes to my private repository.”

You review every application and press Submit yourself.

## If you get stuck

Paste an error into the assistant's chat after removing secrets, and ask: “What failed? Check the cause, fix what you can, and explain the next step.” Do not repeatedly approve commands you do not understand.

If the assistant only gives a plan, say: “Please carry out the local setup steps you can, verify the result, and tell me exactly what still needs my action.” Its available tools and permissions determine what it can actually do.

The optional [web app](../web/README.md) comes after setup. You can ask the assistant to start it and explain the page; it is not necessary for your first evaluation. For command-based instructions, return to the [README quick start](../README.md#quick-start).
