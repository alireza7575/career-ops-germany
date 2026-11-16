// How the scaffolder launches npm.
//
// On Windows `npm` is a `npm.cmd` batch shim, and Node refuses to run a .cmd
// or .bat file through execFile/spawn without a shell: since the fix for
// CVE-2024-27980 (Node 18.20.2 / 20.12.2 / 21.7.3) it throws
// `spawnSync npm.cmd EINVAL`. So `execFileSync("npm.cmd", ["install"])` failed
// on every current Node, and `npx @santifer/career-ops init` left every Windows
// user with a clone and no dependencies.
//
// On Windows run npm's JS entrypoint with Node. npx exports it as npm_execpath;
// direct invocations find the npm bundled with Node or next to npm.cmd on PATH.
// Never pass an environment-derived command string to cmd.exe.

import { existsSync } from "node:fs";
import { delimiter, dirname, join } from "node:path";

const NPM_CLI_JS = /[\\/]npm-cli\.(?:c|m)?js$/i;

/**
 * Returns `{ file, args }` for execFileSync/spawnSync to run `npm <npmArgs>`.
 * Arguments are passed separately to Node, never interpreted by a shell.
 */
export function npmCommand(npmArgs, {
  platform = process.platform,
  env = process.env,
  execPath = process.execPath,
} = {}) {
  if (platform !== "win32") return { file: "npm", args: [...npmArgs] };

  const npmCli = env.npm_execpath;
  if (npmCli && NPM_CLI_JS.test(npmCli)) return { file: execPath, args: [npmCli, ...npmArgs] };

  const candidates = [join(dirname(execPath), "node_modules", "npm", "bin", "npm-cli.js")];
  for (const dir of (env.PATH || "").split(delimiter)) {
    if (dir && existsSync(join(dir, "npm.cmd"))) {
      candidates.push(join(dir, "node_modules", "npm", "bin", "npm-cli.js"));
    }
  }
  const bundled = candidates.find((candidate) => existsSync(candidate));
  if (!bundled) throw new Error("npmCommand: npm-cli.js was not found beside Node or npm.cmd on PATH");
  return { file: execPath, args: [bundled, ...npmArgs] };
}
