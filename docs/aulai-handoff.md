# Aulai — Handoff / Runbook

Documento operacional do **Aulai** (criador automático de cursos com IA). Cobre arquitetura,
deploy no Coolify, variáveis de ambiente, credenciais do n8n, registro de webhooks e tarefas
pendentes. Mantenha atualizado a cada mudança de infra.

> **Segurança:** este arquivo **não contém segredos**. Chaves reais ficam só no painel do Coolify
> (env vars) e nas Credentials do n8n. Nunca cole `clsk_…`, `AUTH_SECRET`, etc. aqui nem em chat/logs.

---

## 1. Visão geral do fluxo

```
WhatsApp (Z-API) ─→ n8n wf00 (intake) ─→ POST /api/courses ─→ Course (AGUARDANDO_GERACAO)
                         │
                         └─→ dispara wf01 (produção)
                                 │ Claude gera currículo → PUT /curriculum
                                 │ HeyGen submete 1 vídeo/aula (callback_id = lessonId)
                                 ▼
HeyGen ─(webhook por vídeo)─→ /api/webhooks/heygen?secret=… ─→ marca aula READY
                                 │ quando TODAS READY → AGUARDANDO_APROVACAO
                                 │ emite course.ready_for_approval → WA
                                 ▼
Humano aprova no painel  ─→ APROVADO ─→ (agenda?) AGENDADO ─→ PUBLICADO
                                 │ emite course.approved / course.published
                                 ▼
n8n wf02 (eventos) ─→ POST /api/courses/:id/publish ─→ ClassOS REST API v1
```

Máquina de estados (gate único `COURSE`):
```
AGUARDANDO_GERACAO → EM_PRODUCAO → AGUARDANDO_APROVACAO ─aprova→ APROVADO → AGENDADO → PUBLICADO
                                          └────────── pede ajuste → AJUSTE_PEDIDO
```

---

## 2. Deploy (Coolify)

- **App:** `Aulai (ClassOS)` · projeto `production`
- **Domínio:** `https://aulai.classos.com.br` (DNS A → `2.25.155.126`)
- **Build Pack:** Dockerfile (multi-stage)
- **Porta:** `3000`
- **Migrations:** rodam **no startup** (`prisma migrate deploy` no CMD), não no build.

### Healthcheck
| Campo | Valor |
|---|---|
| Enable | ✅ ativado |
| Method | `GET` |
| Scheme | `http` |
| Host | `localhost` |
| Port | `3000` |
| Path | `/api/health` |
| Return Code | `200` |
| Interval / Timeout | `5` / `5` |
| Retries | `10` |
| Start Period | `30` (dá tempo do `migrate deploy` rodar) |

Endpoint responde `{"ok":true,"service":"aulai","at":"…"}`.

### Primeiro boot
1. Preencher env vars (§3) → **Save**.
2. **Deploy**. Acompanhar em **Logs** até `migrate deploy` concluir e o server subir.
3. No **Terminal** do container: `npm run db:seed` (cria OWNER + Client + curso demo).
4. Login em `https://aulai.classos.com.br` com `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`.

### Troubleshooting de boot (status `Exited`)
- Container sobe e morre → quase sempre `prisma migrate deploy` falhando.
- Checar nos **Logs**: `DATABASE_URL` correta? Postgres acessível do container? `AUTH_SECRET` setado?

---

## 3. Variáveis de ambiente (Coolify)

| Var | Obrigatória | Notas |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres (mesma rede do Coolify) |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `AUTH_URL` | ✅ | `https://aulai.classos.com.br` |
| `AUTH_TRUST_HOST` | ✅ | `true` |
| `SERVICE_API_KEY` | ✅ | x-api-key que o n8n usa nas rotas |
| `SECRET_ENCRYPTION_KEY` | ✅ | cifra `Client.classOsApiKey` (`openssl rand -base64 32`) |
| `OUTBOUND_WEBHOOK_URL` | ✅ | webhook do wf02 (eventos) no n8n |
| `OUTBOUND_WEBHOOK_SECRET` | ✅ | HMAC dos eventos de domínio |
| `HEYGEN_WEBHOOK_SECRET` | ✅ | protege `/api/webhooks/heygen?secret=…` |
| `CLASSOS_API_URL` | ✅ | `https://app.classos.com/api/v1` (inclui `/api/v1`) |
| `CLASSOS_API_KEY` | ⚠️ | **fallback global** apenas; o ideal é key por escola (§5) |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` | seed | usados só pelo `db:seed` |
| `PASSWORD_RESET_TOKEN` | opc. | ativa `/login/reset` |
| `ANTHROPIC_API_KEY`, `HEYGEN_API_KEY`, `CANVA_*`, `ZAPI_*` | — | usadas pelo **n8n**, não pela app (aqui só p/ referência) |

---

## 4. Credenciais do n8n (Header Auth)

| Credencial | Header | Valor |
|---|---|---|
| **Aulai** | `x-api-key` | = `SERVICE_API_KEY` |
| **Anthropic** | `x-api-key` | chave da Anthropic |
| **HeyGen** | `X-Api-Key` | chave do HeyGen |
| **Z-API** | `Client-Token` | client-token da instância Z-API |
| **OpenAI** (Whisper) | `Authorization` | `Bearer <OPENAI_API_KEY>` |

Nó **Config** de cada workflow (sem `$env.*` no plano free): `AULAI_URL=https://aulai.classos.com.br`,
telefones autorizados, `HEYGEN_AVATAR_ID`, `HEYGEN_VOICE_ID`, instância/token Z-API.

System prompts versionados em `n8n/prompts/*.md` → injetar com `node n8n/prompts/sync-prompts.mjs`
antes de reimportar os workflows.

### Registrar webhook do HeyGen (global)
```
https://aulai.classos.com.br/api/webhooks/heygen?secret=<HEYGEN_WEBHOOK_SECRET>
```

---

## 5. Publicação no ClassOS (REST API v1)

**Endpoint:** `POST {CLASSOS_API_URL}/courses` — `CLASSOS_API_URL` inclui `/api/v1`
(`https://app.classos.com/api/v1`). O client (`src/lib/publish/classos.ts`) também tolera a URL
sem o sufixo.

**Auth:** header `x-api-key` **por escola** (resolve o tenant). Bulk + idempotente por
`(organização, sourceRef)`. Resposta: `{ id, published }` (201 criado / 200 atualizado).

**Payload** (resumo do contrato):
```jsonc
{
  "sourceRef": "<id do curso no Aulai>",   // OBRIGATÓRIO — chave de idempotência
  "title": "string",
  "subtitle": "string?",
  "description": "string?",
  "level": "BEGINNER|INTERMEDIATE|ADVANCED|ALL_LEVELS", // default ALL_LEVELS
  "visibility": "PUBLIC|PRIVATE|UNLISTED",              // default PRIVATE
  "category": "string?",
  "price": 0,
  "publish": true,                          // publica se houver >=1 módulo com aula
  "modules": [{
    "sourceRef": "<id do módulo>",          // preserva progresso na republicação
    "title": "string",
    "description": "string?",
    "lessons": [{
      "sourceRef": "<id da aula>",
      "title": "string",
      "contentType": "VIDEO|TEXT|PDF|AUDIO|LIVE|EMBED", // default VIDEO
      "videoProvider": "youtube|vimeo|file",
      "videoSource": "URL ou ID",
      "durationMinutes": 12,
      "isPreview": false,
      "isRequired": true
    }]
  }]
}
```

> **Por que `sourceRef` em todos os níveis:** o ClassOS reconcilia por `sourceRef`. Sem ele em
> módulos/aulas, a 1ª publicação funciona, mas **republicar recria a árvore e zera o progresso dos
> alunos**. O Aulai já envia o próprio id em curso/módulo/aula. ✅

### Chave por escola (cifrada no Aulai)
```bash
tsx scripts/set-classos-key.ts --client <id-ou-nome> --key clsk_xxx
```
Guarda a chave cifrada (AES-256-GCM via `SECRET_ENCRYPTION_KEY`) em `Client.classOsApiKey`.
`publishCourse()` decifra em runtime; `CLASSOS_API_KEY` (env) é só fallback global.

### Como emitir a chave (lado ClassOS, ops)
Sem UI ainda — no Terminal do container de produção do **ClassOS**:
```bash
node prisma/issue-api-key.mjs                                  # lista escolas (descobrir slug)
node prisma/issue-api-key.mjs --school <slug> --name "Aulai"   # emite (token aparece 1x)
```
Copie o `clsk_…` e grave cifrado no `Client` do Aulai. **Nunca** cole o token em chat/logs.

---

## 6. Pendências

### Concluído ✅
- [x] Deploy verde no Coolify (migrations aplicadas no startup, Next `Ready`).
- [x] `node_modules` completo no runner (resolveu `prisma: not found` e `effect MODULE_NOT_FOUND`).
- [x] `npm run db:seed` no container (Owner + Client "alumine" + curso demo).
- [x] Login no painel funcionando.

> ⚠️ **Gotcha de senha:** `$` em `SEED_OWNER_PASSWORD` é interpolado pelo Coolify/docker antes do
> seed hashear, e o `upsert` do seed não atualiza senha de usuário existente. Para redefinir use
> `scripts/set-password.ts` (lê do argv; use **aspas simples** no terminal). Prefira senhas sem `$`.

### Em aberto
- [ ] Confirmar healthcheck verde (`Path=/api/health`, `Port=3000`, `Start Period=30`).
- [ ] Atualizar nós **Config** do n8n com valores reais (AULAI_URL, telefones, avatar/voice, Z-API).
- [ ] Registrar webhook global do HeyGen (§4).
- [ ] Setar `OUTBOUND_WEBHOOK_URL` para o webhook do wf02.
- [ ] Gravar a chave do ClassOS da escola "alumine" cifrada via `set-classos-key.ts`.
- [ ] **Rotacionar** a chave `clsk_…` que foi exposta em chat durante o setup.
