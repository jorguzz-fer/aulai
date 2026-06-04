import { Stage, Gate, Decision } from "@prisma/client";

export class StageTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StageTransitionError";
  }
}

// Estágios que exigem ação humana (aparecem em "Pendentes").
export const ACTIONABLE_STAGES: Stage[] = [Stage.AGUARDANDO_APROVACAO];

// Estágios "em andamento" (geração assíncrona).
export const IN_PRODUCTION_STAGES: Stage[] = [
  Stage.AGUARDANDO_GERACAO,
  Stage.EM_PRODUCAO,
];

// Estágios de histórico.
export const HISTORY_STAGES: Stage[] = [
  Stage.AJUSTE_PEDIDO,
  Stage.APROVADO,
  Stage.AGENDADO,
  Stage.PUBLICADO,
];

/**
 * Máquina de estados (gate único COURSE).
 * Dada a etapa atual + gate + decisão, retorna a próxima etapa.
 * Decisão inválida lança StageTransitionError.
 */
export function nextStageForDecision(
  current: Stage,
  gate: Gate,
  decision: Decision,
): Stage {
  if (gate !== Gate.COURSE) {
    throw new StageTransitionError(`Gate desconhecido: ${gate}`);
  }
  if (current !== Stage.AGUARDANDO_APROVACAO) {
    throw new StageTransitionError(
      `Não é possível decidir um curso em '${current}'. Esperado: AGUARDANDO_APROVACAO.`,
    );
  }
  switch (decision) {
    case Decision.APPROVED:
      return Stage.APROVADO;
    case Decision.CHANGES_REQUESTED:
      return Stage.AJUSTE_PEDIDO;
    default:
      throw new StageTransitionError(`Decisão desconhecida: ${decision}`);
  }
}

export function canSchedule(stage: Stage): boolean {
  return stage === Stage.APROVADO;
}

export function canPublish(stage: Stage): boolean {
  return stage === Stage.APROVADO || stage === Stage.AGENDADO;
}
