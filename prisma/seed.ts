import { PrismaClient, Stage, Source, AssetStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@aulai.com";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";
  const clientName = process.env.SEED_CLIENT_NAME ?? "Cliente Demo";

  const passwordHash = await bcrypt.hash(password, 10);
  const owner = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Owner", passwordHash, role: Role.OWNER },
  });
  console.log(`✓ Owner: ${owner.email}`);

  const client = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {},
    create: { id: "demo-client", name: clientName },
  });
  console.log(`✓ Client: ${client.name}`);

  // Curso demo já no estágio AGUARDANDO_APROVACAO (espelha cursomarketingiamedicos.md)
  const existing = await prisma.course.findFirst({ where: { title: { contains: "Marketing com IA" } } });
  if (!existing) {
    const course = await prisma.course.create({
      data: {
        clientId: client.id,
        title: "Ferramentas de Marketing com IA para Médicos",
        subtitle: "Faça você mesmo, sem agências ou profissionais caros",
        audience: "Médicos e clínicas que querem atrair pacientes sem depender de agência",
        promise: "Montar um sistema uma vez e mantê-lo com ~3 minutos por dia",
        prerequisite: "Nenhum. Só um celular e vontade de testar",
        expectedResult:
          "Presença digital ativa, conteúdo recorrente e captação de novos pacientes dentro das regras do CFM",
        format: "10 aulas de 15 minutos (≈2h30 de conteúdo)",
        complianceNotes:
          "Todo o conteúdo deve reforçar a Resolução CFM nº 2.336/2023 — identificação obrigatória (nome, CRM + UF, RQE e até 2 especialidades), proibição de promessa de resultados e de sensacionalismo, anonimato em imagens de pacientes e menção de equipamentos somente conforme aprovação da ANVISA.",
        source: Source.MANUAL,
        stage: Stage.AGUARDANDO_APROVACAO,
        modules: {
          create: [
            {
              order: 0,
              title: "Fundamentos: IA + Marketing Médico sem complicação",
              description:
                "O médico precisa entender o que a IA resolve no marketing e o que pode/não pode segundo o CFM.",
              supportMaterials:
                "Checklist de conformidade CFM (1 página); Planilha de diagnóstico de presença digital; Glossário de termos de IA",
              links: [
                { label: "Publicidade médica CFM", url: "https://publicidademedica.cfm.org.br/" },
                {
                  label: "Resolução CFM 2.336/2023",
                  url: "https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf",
                },
              ],
              lessons: {
                create: [
                  {
                    order: 0,
                    title: "Por que a IA muda o jogo para médicos",
                    durationMinutes: 15,
                    objective: "Entender o potencial e enxergar o sistema completo de ponta a ponta.",
                    script:
                      "0–3 min panorama do que mudou; 3–9 min exemplos reais de conteúdo feito 100% com IA; 9–13 min apresentação do sistema '3 min/dia'; 13–15 min o que vem nas próximas aulas.",
                    exercise: "Preencher a planilha de diagnóstico da própria presença digital.",
                    videoStatus: AssetStatus.READY,
                    videoUrl: "https://example.com/demo-aula-1.mp4",
                  },
                  {
                    order: 1,
                    title: "As regras do CFM que você PRECISA conhecer",
                    durationMinutes: 15,
                    objective: "Publicar sem medo de sanção.",
                    script:
                      "O que é permitido (divulgar trabalho, equipamentos, preços, repostar elogios sóbrios); o que é proibido (promessa de resultado, sensacionalismo, expor paciente); dados obrigatórios; regra do antes/depois educativo; lato sensu exige 'NÃO ESPECIALISTA'.",
                    exercise: "Aplicar o checklist de conformidade no próprio perfil.",
                    videoStatus: AssetStatus.READY,
                    videoUrl: "https://example.com/demo-aula-2.mp4",
                  },
                ],
              },
            },
            {
              order: 1,
              title: "Criando conteúdo que atrai pacientes (em lote, com IA)",
              description: "Produzir, numa única sessão, um mês inteiro de conteúdo.",
              supportMaterials:
                "Biblioteca com 30+ prompts por especialidade; 10 modelos de post no Canva; Roteiro-modelo de Reels de 30s",
              links: [
                { label: "Canva", url: "https://www.canva.com/" },
                { label: "HeyGen", url: "https://www.heygen.com/" },
              ],
              lessons: {
                create: [
                  {
                    order: 0,
                    title: "ChatGPT e Claude para criar conteúdo médico",
                    durationMinutes: 15,
                    objective: "Gerar 1 mês de legendas e pautas em uma sessão.",
                    script:
                      "Como escrever um bom prompt; usar perguntas frequentes como matéria-prima; gerar lote de 12 posts; revisar para tom humano e conformidade CFM.",
                    exercise: "Gerar e salvar 12 legendas usando os prompts da biblioteca.",
                    videoStatus: AssetStatus.READY,
                    videoUrl: "https://example.com/demo-aula-3.mp4",
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log(`✓ Curso demo: ${course.title}`);
  } else {
    console.log("✓ Curso demo já existe");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
