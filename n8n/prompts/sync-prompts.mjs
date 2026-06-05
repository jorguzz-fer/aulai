#!/usr/bin/env node
// Injeta os prompts (.md) nos workflows n8n, no assignment correspondente do nó
// "Config". Os .md são a FONTE DE VERDADE; rode este script após editá-los.
//
//   node n8n/prompts/sync-prompts.mjs
//
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const n8nDir = join(here, "..");

const targets = [
  {
    workflow: "workflow-01-producao.json",
    configNode: "Config",
    assignment: "SYSTEM_PROMPT",
    promptFile: "system-curriculo.md",
  },
  {
    workflow: "workflow-01-producao-canva.json",
    configNode: "Config",
    assignment: "SYSTEM_PROMPT",
    promptFile: "system-curriculo.md",
  },
  {
    workflow: "workflow-00-whatsapp-intake.json",
    configNode: "Config",
    assignment: "INTAKE_PROMPT",
    promptFile: "system-intake.md",
  },
];

let failed = false;
for (const t of targets) {
  const wfPath = join(n8nDir, t.workflow);
  const prompt = readFileSync(join(here, t.promptFile), "utf8").trim();
  const wf = JSON.parse(readFileSync(wfPath, "utf8"));

  const config = wf.nodes.find((n) => n.name === t.configNode);
  const assignment = config?.parameters?.assignments?.assignments?.find(
    (a) => a.name === t.assignment,
  );
  if (!assignment) {
    console.error(`✗ ${t.workflow}: assignment '${t.assignment}' não encontrado no nó '${t.configNode}'`);
    failed = true;
    continue;
  }
  assignment.value = prompt;
  writeFileSync(wfPath, JSON.stringify(wf, null, 2) + "\n");
  console.log(`✓ ${t.workflow} ← ${t.promptFile} (${prompt.length} chars)`);
}

process.exit(failed ? 1 : 0);
