# Prompts do Claude (fonte de verdade)

Os prompts de sistema do Claude vivem aqui como **Markdown versionável**, em vez de
ficarem perdidos dentro do JSON dos workflows.

| Arquivo | Usado em | Papel |
|---|---|---|
| `system-curriculo.md` | workflow 01 (produção) | Persona de designer instrucional + regras de conformidade (CFM 2.336/2023). Gera o curso completo em JSON. |
| `system-intake.md` | workflow 00 (intake) | Interpreta a mensagem do WhatsApp e extrai o briefing em JSON. |

## Como funciona

Cada workflow lê o prompt de um **assignment do nó `Config`** (`SYSTEM_PROMPT` no 01,
`INTAKE_PROMPT` no 00). O nó do Claude referencia esse valor:

```
system: $('Config').item.json.SYSTEM_PROMPT
```

## Editar um prompt

1. Edite o `.md` correspondente (a fonte de verdade).
2. Rode o sync para injetar nos workflows:

   ```bash
   node n8n/prompts/sync-prompts.mjs
   ```

3. Reimporte o(s) workflow(s) no n8n (ou cole o novo valor no nó `Config`).

> Não edite o prompt direto no JSON: o próximo sync sobrescreve. Edite o `.md`.
