# Aulai — Criador de Cursos automático com IA

Esteira que recebe um pedido por **WhatsApp** → **Claude** gera o currículo completo →
**HeyGen** renderiza os vídeos e **Canva** as artes → um humano aprova num painel web →
publica automaticamente no **ClassOS**.

Arquitetura herdada do *Pipeline Playbook* (validado em produção), adaptada ao domínio
hierárquico **`Course → Module → Lesson`**.

## Arquitetura (3 camadas)

```
Entrada (n8n)              Saída (Next.js — esta app)          Distribuição (n8n)
─────────────             ────────────────────────────       ────────────────────
WhatsApp Intake ─┐                                       ┌─→ course.approved      → WA
HeyGen / Canva  ─┼─→ POST /api/courses ─→ Course ────────┼─→ course.changes_req.  → WA
                 ┘   PATCH .../curriculum, .../lessons    ├─→ course.scheduled     → publica
                                                          └─→ course.published     → ClassOS API
```

A app conhece só `Course`, `Stage`, `Gate`, `Decision`. Entradas novas = chamada HTTP com
`x-api-key`. Saídas novas = inscrever no webhook ou implementar `PublishTarget`.

## Máquina de estados (gate único)

```
AGUARDANDO_GERACAO → EM_PRODUCAO → AGUARDANDO_APROVACAO ─aprova→ APROVADO → AGENDADO → PUBLICADO
                                          └────────── pede ajuste → AJUSTE_PEDIDO
```

## Stack

Next.js 15 (App Router, Server Actions) · NextAuth v5 (Credentials+JWT) · Prisma 6 + Postgres ·
Zod · Coolify + Dockerfile multi-stage · n8n (free) · Z-API · HeyGen v2 · Claude · Canva.

## Setup local

```bash
cp .env.example .env          # preencha DATABASE_URL, AUTH_SECRET, SERVICE_API_KEY...
npm install                   # postinstall roda prisma generate
npx prisma migrate dev        # cria o schema
npm run db:seed               # owner + cliente + curso demo
npm run dev
```

Login com `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`.

## API (auth dupla: `x-api-key` OU sessão)

| Método | Rota | Uso |
|---|---|---|
| POST | `/api/courses` | cria curso (stub) — n8n |
| GET | `/api/courses` | lista |
| GET/PATCH | `/api/courses/:id` | detalhe / metadados |
| POST/PUT | `/api/courses/:id/curriculum` | grava módulos+aulas — n8n |
| PATCH | `/api/courses/:id/lessons/:lid` | assets (vídeo/arte) — n8n |
| POST | `/api/courses/:id/ready` | marca pronto p/ aprovação — n8n |
| POST | `/api/courses/:id/decision` | aprova / pede ajuste |
| POST | `/api/courses/:id/schedule` | agenda |
| POST | `/api/courses/:id/publish` | publica no ClassOS |

## n8n

Importe os 3 workflows de `n8n/`. Configure **Credentials** (Header Auth) para Anthropic
(`x-api-key`), HeyGen (`X-Api-Key`), Z-API (`Client-Token`), Aulai (`x-api-key` = `SERVICE_API_KEY`)
e o **Set "Config"** com URLs/telefones. No plano free não use `$env.*`.

- **00 Intake:** WhatsApp → filtra → Claude interpreta brief → cria curso → dispara Produção.
- **01 Produção:** Claude gera currículo → salva → HeyGen + Canva por aula → polling → marca pronto.
- **02 Eventos:** verifica HMAC → switch → WhatsApp / publica no ClassOS.

## Publicação no ClassOS

`src/lib/publish/classos.ts` implementa `PublishTarget` com payload **assumido** (ajustar quando o
contrato real chegar). Configure `CLASSOS_API_URL` e `CLASSOS_API_KEY`.

## Deploy (Coolify)

Dockerfile multi-stage; **migrations rodam no startup** (`prisma migrate deploy` no CMD). Configure
as env vars do `.env.example` no painel do Coolify.
