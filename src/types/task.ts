/**
 * Tipos que espelham o serializer de Task do backend.
 *
 * Campos `readonly` correspondem aos `read_only_fields` do serializer: o
 * backend os preenche e o frontend não os envia em criação/edição.
 */

/**
 * Valores possíveis de `status`: são os *códigos* do `TextChoices` do Django
 * (o que é serializado é o valor armazenado, não o rótulo legível).
 */
export type TaskStatus = "A_FAZER" | "EM_PROGRESSO" | "PRONTO" | "ENTREGUE";

/** Rótulos legíveis para exibição, na ordem das colunas do quadro. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  A_FAZER: "A Fazer",
  EM_PROGRESSO: "Em Progresso",
  PRONTO: "Pronto",
  ENTREGUE: "Entregue",
};

/** Uma tarefa do quadro Kanban, conforme serializada pelo backend. */
export interface Task {
  /** Identificador único, definido pelo backend. */
  readonly id: number;
  /** Título da tarefa. */
  name: string;
  /** Coluna atual no quadro. */
  status: TaskStatus;
  /** Descrição detalhada, ou `null` quando não informada. */
  description: string | null;
  /** Estimativa de esforço (story points), ou `null`. */
  story_points: number | null;
  /** Data de criação (ISO 8601), preenchida pelo backend. */
  readonly created_at: string;
  /** Prazo de entrega (ISO 8601), ou `null`. */
  due_date: string | null;
  /** Data de conclusão (ISO 8601), preenchida pelo backend ao concluir; senão `null`. */
  readonly closed_at: string | null;
  /** Id do criador, definido pelo backend a partir do usuário logado; `null` se ausente. */
  readonly creator: number | null;
  /** Nome do criador, para exibição. */
  readonly creator_name: string;
  /** Id do usuário responsável, ou `null` se não atribuído. */
  responsible: number | null;
}

/**
 * Campos aceitos ao criar/editar uma tarefa.
 *
 * O frontend NÃO envia `creator`, porque agora o backend define o criador
 * automaticamente a partir do token do usuário logado.
 */
export type TaskInput = Omit<
  Task,
  "id" | "created_at" | "closed_at" | "creator" | "creator_name"
>;