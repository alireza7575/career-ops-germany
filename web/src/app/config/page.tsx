import { ConfigForm } from "@/components/config-form";
import { readLanguageConfig } from "@/lib/career-ops";

export const dynamic = "force-dynamic";

export default function ConfigPage() {
  const language = readLanguageConfig();
  const output = language.output === "en" ? "English" : language.output === "de" ? "German" : language.output;
  return <>
    <p className="mx-auto max-w-2xl px-6 pt-6 text-sm text-muted">
      Evaluation market: {language.modesDirs.map((dir) => dir === "modes/de" ? "Germany" : dir).join(", ")} · Output language: {output}. Ask your assistant to change your market or output language.
    </p>
    <ConfigForm />
  </>;
}
