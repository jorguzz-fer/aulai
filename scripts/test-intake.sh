#!/usr/bin/env bash
#
# Testa a esteira do Aulai SEM precisar de celular/WhatsApp, simulando as
# chamadas que o Z-API e o n8n fariam.
#
# Uso:
#   ./scripts/test-intake.sh [comando]
#
# Comandos:
#   intake        (padrão) simula uma mensagem de TEXTO chegando no n8n
#   intake-image  simula uma mensagem de IMAGEM
#   intake-audio  simula uma mensagem de ÁUDIO
#   api           cria um curso direto na API do Aulai (pula o n8n)
#   producao      dispara o workflow de produção com um courseId
#
# Configuração (exporte antes de rodar para sobrescrever os defaults):
#   N8N_INTAKE_URL    URL do webhook de intake no n8n
#   PRODUCAO_WEBHOOK  URL do webhook de produção no n8n
#   AUTHORIZED_PHONE  precisa ser IGUAL ao AUTHORIZED_PHONE do nó Config
#   MESSAGE           texto do pedido de curso
#   AULAI_URL         base da app Aulai (default http://localhost:3000)
#   SERVICE_API_KEY   x-api-key da app (necessário para 'api' e 'producao')
#   COURSE_ID         usado por 'producao'
#
set -euo pipefail

N8N_INTAKE_URL="${N8N_INTAKE_URL:-https://n8n.seu-dominio.com/webhook/aulai-intake}"
PRODUCAO_WEBHOOK="${PRODUCAO_WEBHOOK:-https://n8n.seu-dominio.com/webhook/aulai-producao}"
AUTHORIZED_PHONE="${AUTHORIZED_PHONE:-5511999999999}"
MESSAGE="${MESSAGE:-Quero um curso de marketing com IA para médicos, 10 aulas de 15 minutos}"
IMAGE_URL="${IMAGE_URL:-https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Logo_TV_2015.png/640px-Logo_TV_2015.png}"
AUDIO_URL="${AUDIO_URL:-https://file-examples.com/storage/fe1170c1c66f7e2f9f0b0e7/2017/11/file_example_MP3_700KB.mp3}"
AULAI_URL="${AULAI_URL:-http://localhost:3000}"
SERVICE_API_KEY="${SERVICE_API_KEY:-}"
COURSE_ID="${COURSE_ID:-}"

# Pretty-print JSON se possível (node está sempre disponível no projeto).
pp() { if command -v node >/dev/null 2>&1; then node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch{console.log(s)}})"; else cat; fi; }

post() { # post <url> <json>
  echo "→ POST $1"
  echo "  payload: $2"
  echo "  resposta:"
  curl -sS -X POST "$1" -H "content-type: application/json" -d "$2" | pp
  echo
}

cmd="${1:-intake}"
case "$cmd" in
  intake)
    post "$N8N_INTAKE_URL" "$(cat <<JSON
{ "phone": "$AUTHORIZED_PHONE", "fromMe": false, "isGroup": false,
  "text": { "message": "$MESSAGE" } }
JSON
)"
    echo "Acompanhe os nós acendendo na tela do workflow 00 no n8n."
    ;;

  intake-image)
    post "$N8N_INTAKE_URL" "$(cat <<JSON
{ "phone": "$AUTHORIZED_PHONE", "fromMe": false, "isGroup": false,
  "image": { "imageUrl": "$IMAGE_URL", "caption": "$MESSAGE" } }
JSON
)"
    ;;

  intake-audio)
    post "$N8N_INTAKE_URL" "$(cat <<JSON
{ "phone": "$AUTHORIZED_PHONE", "fromMe": false, "isGroup": false,
  "audio": { "audioUrl": "$AUDIO_URL" } }
JSON
)"
    ;;

  api)
    if [ -z "$SERVICE_API_KEY" ]; then echo "defina SERVICE_API_KEY"; exit 1; fi
    echo "→ POST $AULAI_URL/api/courses (x-api-key)"
    curl -sS -X POST "$AULAI_URL/api/courses" \
      -H "content-type: application/json" -H "x-api-key: $SERVICE_API_KEY" \
      -d "{ \"title\": \"$MESSAGE\" }" | pp
    ;;

  producao)
    if [ -z "$COURSE_ID" ]; then echo "defina COURSE_ID (rode 'api' antes para criar um)"; exit 1; fi
    post "$PRODUCAO_WEBHOOK" "$(cat <<JSON
{ "courseId": "$COURSE_ID",
  "brief": { "title": "$MESSAGE", "audience": "médicos", "lessonCount": 10, "tone": "direto", "area": "saúde" } }
JSON
)"
    ;;

  *)
    echo "comando desconhecido: $cmd"
    echo "use: intake | intake-image | intake-audio | api | producao"
    exit 1
    ;;
esac
