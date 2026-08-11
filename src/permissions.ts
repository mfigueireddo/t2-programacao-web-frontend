/**
 * Regras de permissão por papel, espelhando o que o backend impõe.
 *
 * - Apenas ADMINISTRADOR cria e deleta tarefas; qualquer usuário visualiza.
 * - No contexto de edição, um USUARIO pode apenas:
 *     · atribuir/remover a si mesmo como o (único) responsável, desde que a
 *       tarefa não tenha outro responsável;
 *     · alterar o status, desde que seja responsável pela tarefa.
 *   Um ADMINISTRADOR edita todos os campos livremente, inclusive escolhendo
 *   qualquer usuário do sistema como responsável.
 *
 * Concentrar as regras aqui evita espalhar verificações de papel pela UI: as
 * telas só perguntam "pode fazer X?".
 */

import type { Task } from "./types/task";
import type { User } from "./types/user";

/**
 * Descrição:
 *   Indica se o usuário pode criar tarefas.
 *
 * Objetivo:
 *   Restringir a criação de tarefas a administradores, espelhando o backend.
 *
 * Parâmetros:
 *   - user: usuário avaliado.
 *
 * Assertivas de entrada:
 *   - `user.role` é um papel válido.
 *
 * Assertivas de saída:
 *   - retorna `true` se, e somente se, o papel for `ADMINISTRADOR`.
 *
 * Retorno:
 *   - `boolean` indicando se o usuário pode criar tarefas.
 */
export function canCreateTask(user: User): boolean {
  return user.role === "ADMINISTRADOR";
}

/**
 * Descrição:
 *   Indica se o usuário pode deletar tarefas.
 *
 * Objetivo:
 *   Restringir a exclusão de tarefas a administradores, espelhando o backend.
 *
 * Parâmetros:
 *   - user: usuário avaliado.
 *
 * Assertivas de entrada:
 *   - `user.role` é um papel válido.
 *
 * Assertivas de saída:
 *   - retorna `true` se, e somente se, o papel for `ADMINISTRADOR`.
 *
 * Retorno:
 *   - `boolean` indicando se o usuário pode deletar tarefas.
 */
export function canDeleteTask(user: User): boolean {
  return user.role === "ADMINISTRADOR";
}

/**
 * Descrição:
 *   Indica se o usuário é o responsável pela tarefa.
 *
 * Objetivo:
 *   Servir de base para as regras de edição que dependem da responsabilidade.
 *
 * Parâmetros:
 *   - user: usuário avaliado;
 *   - task: tarefa avaliada.
 *
 * Assertivas de entrada:
 *   - `user.id` e `task.responsible` são comparáveis (mesmo domínio de ids).
 *
 * Assertivas de saída:
 *   - retorna `true` se, e somente se, `task.responsible` for o id do usuário.
 *
 * Retorno:
 *   - `boolean` indicando se o usuário é o responsável.
 */
export function isResponsible(user: User, task: Task): boolean {
  return task.responsible === user.id;
}

/**
 * Descrição:
 *   Indica se o usuário pode abrir a edição da tarefa.
 *
 * Objetivo:
 *   Bloquear a edição quando não há nada que o usuário consiga alterar,
 *   evitando abrir um formulário inteiramente somente-leitura.
 *
 * Parâmetros:
 *   - user: usuário avaliado;
 *   - task: tarefa avaliada.
 *
 * Assertivas de entrada:
 *   - `user.role` é um papel válido.
 *
 * Assertivas de saída:
 *   - ADMINISTRADOR sempre pode editar;
 *   - USUARIO pode editar apenas se a tarefa não tiver responsável ou se ele
 *     próprio for o responsável.
 *
 * Retorno:
 *   - `boolean` indicando se a edição pode ser aberta.
 */
export function canEditTask(user: User, task: Task): boolean {
  if (user.role === "ADMINISTRADOR") {
    return true;
  }
  return task.responsible === null || task.responsible === user.id;
}

/**
 * Como o campo "Responsável" se comporta na edição:
 *  - `"all"`  → escolher qualquer usuário (droplist); só ADMINISTRADOR;
 *  - `"self"` → atribuir/remover apenas a si mesmo (USUARIO);
 *  - `"none"` → somente leitura (visualização).
 */
export type ResponsibleEdit = "all" | "self" | "none";

/**
 * O que o usuário pode editar numa tarefa, conforme seu papel e se é
 * responsável por ela.
 */
export interface TaskFormPermissions {
  /** Nome, descrição, story points e data limite (só ADMINISTRADOR). */
  editFields: boolean;
  /** Status: ADMINISTRADOR sempre; USUARIO apenas se for responsável. */
  editStatus: boolean;
  /** Como o usuário pode mexer no responsável da tarefa. */
  editResponsible: ResponsibleEdit;
}

/**
 * Descrição:
 *   Calcula o conjunto de permissões de edição do usuário sobre a tarefa.
 *
 * Objetivo:
 *   Centralizar, em um único objeto, o que cada papel pode editar, para que a
 *   UI apenas consulte os flags em vez de reavaliar regras de papel.
 *
 * Parâmetros:
 *   - user: usuário avaliado;
 *   - task: tarefa avaliada.
 *
 * Assertivas de entrada:
 *   - `user.role` é um papel válido.
 *
 * Assertivas de saída:
 *   - para ADMINISTRADOR: `editFields = true`, `editStatus = true`,
 *     `editResponsible = "all"`;
 *   - para USUARIO: `editFields = false`, `editStatus = true` apenas se for
 *     responsável, `editResponsible = "self"`.
 *
 * Retorno:
 *   - `TaskFormPermissions` com os flags de edição aplicáveis.
 */
export function taskFormPermissions(
  user: User,
  task: Task,
): TaskFormPermissions {
  const admin = user.role === "ADMINISTRADOR";
  return {
    editFields: admin,
    editStatus: admin || isResponsible(user, task),
    editResponsible: admin ? "all" : "self",
  };
}

/** Permissões somente-leitura, usadas na visualização. */
export const READ_ONLY_PERMISSIONS: TaskFormPermissions = {
  editFields: false,
  editStatus: false,
  editResponsible: "none",
};
