import fs from "node:fs";
import path from "node:path";

// Desktop bundles include the helpers needed by the Windows sandbox.
export function codexDesktopDirs(localAppData) {
  const root = path.join(localAppData, "OpenAI", "Codex", "bin");
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(root, entry.name))
      .filter((dir) => ["codex.exe", "codex-command-runner.exe", "codex-windows-sandbox-setup.exe"]
        .every((file) => fs.existsSync(path.join(dir, file))))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch {
    return []; // Discovery is best-effort; PATH and other install roots still work.
  }
}
