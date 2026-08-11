/**
 * Modal de visualização de tarefa (somente leitura).
 *
 * Faz um GET na tarefa e exibe todos os dados no formulário compartilhado com
 * os campos desabilitados. O botão "Editar" leva ao mesmo ponto que o lápis
 * do card: abre a edição da tarefa.
 */

import { getTask } from "./api/tasks";
import { getUser } from "./api/users";
import { createModalShell } from "./formUtils";
import { canEditTask, READ_ONLY_PERMISSIONS } from "./permissions";
import { buildTaskForm } from "./taskDetailForm";
import type { TaskFormExtras } from "./taskDetailForm";
import { openTaskEdit } from "./taskEdit";
import type { Task } from "./types/task";
import type { User } from "./types/user";

/**
 * Descrição:
 *   Abre o modal de visualização (somente leitura) de uma tarefa, buscando-a
 *   no backend e exibindo seus dados no formulário compartilhado.
 *
 * Objetivo:
 *   Permitir consultar os detalhes de uma tarefa e, se houver permissão,
 *   avançar para sua edição.
 *
 * Parâmetros:
 *   - taskId: id da tarefa a exibir;
 *   - user: usuário corrente (define a permissão de edição);
 *   - onChanged: callback chamado quando a tarefa é alterada na edição.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - há uma sessão ativa;
 *   - `taskId` corresponde a uma tarefa existente.
 *
 * Assertivas de saída:
 *   - exibe "Carregando…" enquanto busca a tarefa;
 *   - em sucesso, substitui o placeholder pelo formulário em modo leitura;
 *   - em erro, exibe a mensagem de falha no lugar do conteúdo.
 */
export function openTaskView(
  taskId: number,
  user: User,
  onChanged: () => void,
): void {
  const { modal, close } = createModalShell("Detalhes da Tarefa");

  const loading = document.createElement("p");
  loading.textContent = "Carregando…";
  modal.appendChild(loading);

  /**
   * Descrição:
   *   Busca a tarefa e seu responsável e substitui o placeholder pelo formulário.
   *
   * Objetivo:
   *   Carregar os dados de forma assíncrona, tratando erro sem quebrar o modal.
   *
   * Assertivas de entrada:
   *   - `taskId`, `user`, `loading` e demais elementos existem no closure.
   *
   * Assertivas de saída:
   *   - em sucesso, o `loading` é trocado pelo formulário de visualização;
   *   - em erro, `loading` passa a exibir a mensagem de falha.
   */
  async function load(): Promise<void> {
    try {
      const task = await getTask(taskId);
      const extras = await loadResponsibleName(task);
      loading.replaceWith(buildView(task, user, extras, close, onChanged));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      loading.className = "form-error";
      loading.textContent = `Não foi possível carregar a tarefa: ${message}`;
    }
  }

  void load();
}

/**
 * Descrição:
 *   Resolve o nome do responsável da tarefa para exibição na visualização.
 *
 * Objetivo:
 *   Fornecer o nome (e não apenas o id) do responsável ao formulário em modo
 *   leitura, evitando uma busca quando não há responsável.
 *
 * Parâmetros:
 *   - task: tarefa cujo responsável será resolvido.
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa;
 *   - se `task.responsible` não for `null`, corresponde a um usuário existente.
 *
 * Assertivas de saída:
 *   - retorna `{}` quando não há responsável;
 *   - caso contrário, retorna `{ responsibleName }` com o nome buscado;
 *   - se a busca do usuário falhar (ex.: USUARIO sem permissão de ler outra
 *     conta — `GET /users/<id>/` retorna 403), retorna `{}` em vez de propagar
 *     o erro, deixando o formulário exibir o id como recurso.
 *
 * Retorno:
 *   - `Promise<TaskFormExtras>` com o nome do responsável, se houver.
 */
async function loadResponsibleName(task: Task): Promise<TaskFormExtras> {
  if (task.responsible === null) {
    return {};
  }
  try {
    return { responsibleName: (await getUser(task.responsible)).name };
  } catch {
    // Buscar o nome do responsável é best-effort: não pode derrubar a
    // visualização da tarefa quando o backend nega o acesso àquela conta.
    return {};
  }
}

/**
 * Descrição:
 *   Monta o formulário de visualização (somente leitura) da tarefa, com os
 *   botões "Fechar" e "Editar".
 *
 * Objetivo:
 *   Renderizar os dados da tarefa e oferecer o acesso à edição quando o
 *   usuário tiver permissão.
 *
 * Parâmetros:
 *   - task: tarefa a exibir;
 *   - user: usuário corrente (define a permissão de edição);
 *   - extras: dados auxiliares (ex.: nome do responsável);
 *   - close: função que fecha o modal;
 *   - onChanged: callback repassado à edição, chamado em caso de alteração.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível.
 *
 * Assertivas de saída:
 *   - o formulário é renderizado com os campos desabilitados (somente leitura);
 *   - "Fechar" fecha o modal;
 *   - "Editar" fica desabilitado se `canEditTask(user, task)` for falso;
 *     quando habilitado, fecha a visualização e abre a edição.
 *
 * Retorno:
 *   - `HTMLFormElement` com o formulário de visualização pronto.
 */
function buildView(
  task: Task,
  user: User,
  extras: TaskFormExtras,
  close: () => void,
  onChanged: () => void,
): HTMLFormElement {
  const { form } = buildTaskForm(task, READ_ONLY_PERMISSIONS, user.id, extras);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn-secondary";
  closeButton.textContent = "Fechar";
  closeButton.addEventListener("click", close);

  // "Editar" leva ao mesmo ponto que o botão de edição do card.
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "btn-add";
  editButton.textContent = "Editar";
  // USUARIO não edita tarefa cujo responsável é outra pessoa.
  editButton.disabled = !canEditTask(user, task);
  editButton.addEventListener("click", () => {
    close();
    openTaskEdit(task.id, user, onChanged);
  });

  actions.append(closeButton, editButton);
  form.appendChild(actions);

  return form;
}
