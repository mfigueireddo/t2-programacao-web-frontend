/**
 * Modal de edição de tarefa.
 *
 * Reaproveita o mesmo formulário da visualização (botão do olho), habilitando
 * cada campo conforme as permissões do usuário (ver `permissions.ts`). Faz um
 * GET para carregar os dados atuais e salva via PATCH, enviando apenas os
 * campos que o usuário tem permissão de alterar.
 */

import { getTask, patchTask } from "./api/tasks";
import { getUser, listUsers } from "./api/users";
import { createModalShell } from "./formUtils";
import { taskFormPermissions } from "./permissions";
import { buildTaskForm } from "./taskDetailForm";
import type { TaskFormExtras } from "./taskDetailForm";
import type { Task, TaskInput, TaskStatus } from "./types/task";
import type { User } from "./types/user";

/**
 * Descrição:
 *   Abre o modal de edição de uma tarefa, carrega seus dados atuais e monta o
 *   formulário com os campos habilitados conforme as permissões do usuário.
 *
 * Objetivo:
 *   Permitir editar uma tarefa enviando ao backend apenas os campos que o
 *   usuário tem permissão de alterar.
 *
 * Parâmetros:
 *   - taskId: id da tarefa a editar;
 *   - user: usuário corrente (define as permissões de edição);
 *   - onSaved: callback chamado após salvar com sucesso (ex.: recarregar o quadro).
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - há uma sessão ativa com permissão para editar a tarefa;
 *   - `taskId` corresponde a uma tarefa existente.
 *
 * Assertivas de saída:
 *   - exibe "Carregando…" enquanto busca a tarefa;
 *   - em sucesso, substitui o placeholder pelo formulário de edição;
 *   - em erro de carregamento, exibe a mensagem de falha no lugar do conteúdo.
 */
export function openTaskEdit(
  taskId: number,
  user: User,
  onSaved: () => void,
): void {
  const { modal, close } = createModalShell("Editar Tarefa");

  const loading = document.createElement("p");
  loading.textContent = "Carregando…";
  modal.appendChild(loading);

  /**
   * Descrição:
   *   Busca a tarefa e os dados extras do responsável e troca o placeholder
   *   pelo formulário de edição.
   *
   * Objetivo:
   *   Carregar os dados de forma assíncrona, tratando erro sem quebrar o modal.
   *
   * Assertivas de entrada:
   *   - `taskId`, `user`, `loading` e demais elementos existem no closure.
   *
   * Assertivas de saída:
   *   - em sucesso, o `loading` é trocado pelo formulário de edição;
   *   - em erro, `loading` passa a exibir a mensagem de falha.
   */
  async function load(): Promise<void> {
    try {
      const task = await getTask(taskId);
      const extras = await loadResponsibleExtras(task, user);
      loading.replaceWith(buildEdit(taskId, task, user, extras, close, onSaved));
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
 *   Busca os dados extras necessários ao campo "Responsável", de acordo com o
 *   papel do usuário.
 *
 * Objetivo:
 *   Fornecer ao formulário a lista de usuários (para o admin escolher) ou o
 *   nome do responsável atual (para o usuário comum apenas exibir).
 *
 * Parâmetros:
 *   - task: tarefa em edição;
 *   - user: usuário corrente (define o que precisa ser buscado).
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa;
 *   - quando há `task.responsible`, corresponde a um usuário existente.
 *
 * Assertivas de saída:
 *   - ADMINISTRADOR: retorna `{ users }` com todos os usuários;
 *   - USUARIO com responsável que é outra pessoa: retorna `{ responsibleName }`,
 *     ou `{}` se o backend negar a leitura daquela conta (`GET /users/<id>/`
 *     com 403), deixando o formulário exibir o id como recurso;
 *   - demais casos: retorna `{}` (nada a buscar).
 *
 * Retorno:
 *   - `Promise<TaskFormExtras>` com os dados auxiliares do campo "Responsável".
 */
async function loadResponsibleExtras(
  task: Task,
  user: User,
): Promise<TaskFormExtras> {
  if (user.role === "ADMINISTRADOR") {
    return { users: await listUsers() };
  }
  if (task.responsible !== null && task.responsible !== user.id) {
    try {
      return { responsibleName: (await getUser(task.responsible)).name };
    } catch {
      // Buscar o nome do responsável é best-effort: não pode impedir a edição
      // da tarefa quando o backend nega o acesso àquela conta.
      return {};
    }
  }
  return {};
}

/**
 * Descrição:
 *   Monta o formulário de edição da tarefa, com os campos habilitados conforme
 *   as permissões e os botões "Cancelar" e "Salvar".
 *
 * Objetivo:
 *   Renderizar o formulário editável e tratar o salvamento via PATCH, enviando
 *   somente os campos permitidos.
 *
 * Parâmetros:
 *   - taskId: id da tarefa (usado no PATCH);
 *   - task: dados atuais da tarefa (valores iniciais do formulário);
 *   - user: usuário corrente (define as permissões);
 *   - extras: dados auxiliares do campo "Responsável";
 *   - close: função que fecha o modal;
 *   - onSaved: callback chamado após salvar com sucesso.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível.
 *
 * Assertivas de saída:
 *   - cada campo é habilitado/desabilitado conforme `taskFormPermissions`;
 *   - "Cancelar" fecha o modal sem salvar;
 *   - "Salvar" dispara o envio (ver `handleSubmit`).
 *
 * Retorno:
 *   - `HTMLFormElement` com o formulário de edição pronto.
 */
function buildEdit(
  taskId: number,
  task: Task,
  user: User,
  extras: TaskFormExtras,
  close: () => void,
  onSaved: () => void,
): HTMLFormElement {
  const perms = taskFormPermissions(user, task);
  const { form, controls } = buildTaskForm(task, perms, user.id, extras);

  // Mensagem de erro (escondida até falhar).
  const errorMessage = document.createElement("p");
  errorMessage.className = "form-error";
  errorMessage.hidden = true;
  form.appendChild(errorMessage);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  // Cancelar
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn-secondary";
  cancelButton.textContent = "Cancelar";
  cancelButton.addEventListener("click", close);

  // Salvar
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "btn-add";
  submitButton.textContent = "Salvar";

  actions.append(cancelButton, submitButton);
  form.appendChild(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSubmit();
  });

  /**
   * Descrição:
   *   Monta o payload parcial de PATCH com os campos permitidos e o envia ao
   *   backend.
   *
   * Objetivo:
   *   Salvar apenas o que o usuário pode alterar, evitando que o backend
   *   rejeite campos fora do seu papel, e exibir erros sem fechar o modal.
   *
   * Assertivas de entrada:
   *   - `perms`, `controls`, `taskId` e os elementos existem no closure.
   *
   * Assertivas de saída:
   *   - inclui nome/descrição/story points/data limite apenas se `editFields`;
   *   - inclui status apenas se `editStatus`;
   *   - define `responsible` a partir da droplist (admin) ou do checkbox
   *     (usuário comum), conforme qual controle existir;
   *   - durante o envio, o botão "Salvar" fica desabilitado;
   *   - em sucesso: fecha o modal e chama `onSaved`;
   *   - em erro: exibe a mensagem e reabilita o botão.
   */
  async function handleSubmit(): Promise<void> {
    errorMessage.hidden = true;
    submitButton.disabled = true;

    // PATCH só com o que o usuário tem permissão de alterar — assim o backend
    // não rejeita o envio de campos fora do seu papel.
    const payload: Partial<TaskInput> = {};

    if (perms.editFields) {
      const storyPointsRaw = controls.storyPointsInput.value.trim();
      const dueDateRaw = controls.dueDateInput.value;
      payload.name = controls.nameInput.value.trim();
      payload.description = controls.descriptionInput.value.trim() || null;
      payload.story_points = storyPointsRaw === "" ? null : Number(storyPointsRaw);
      payload.due_date =
        dueDateRaw === "" ? null : new Date(dueDateRaw).toISOString();
    }

    if (perms.editStatus) {
      payload.status = controls.statusSelect.value as TaskStatus;
    }

    // Responsável: ADMINISTRADOR escolhe pela droplist; USUARIO atribui/remove
    // a si mesmo pelo checkbox. No máximo um dos controles existe.
    if (controls.responsibleSelect !== null) {
      const selected = controls.responsibleSelect.value;
      payload.responsible = selected === "" ? null : Number(selected);
    } 
    else if (controls.selfResponsibleCheckbox !== null) {
      payload.responsible = controls.selfResponsibleCheckbox.checked
        ? user.id
        : null;
    }

    try {
      await patchTask(taskId, payload);
      close();
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage.textContent = `Não foi possível salvar a tarefa: ${message}`;
      errorMessage.hidden = false;
      submitButton.disabled = false;
    }
  }

  return form;
}
