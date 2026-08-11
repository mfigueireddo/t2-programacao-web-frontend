/**
 * Modal (popup) de criação de tarefa.
 *
 * `openTaskForm` monta o overlay + formulário sobre a página atual, envia os
 * dados ao backend via `createTask` e, em caso de sucesso, fecha o modal e
 * avisa quem chamou (callback `onCreated`) para recarregar o quadro.
 */

import { createTask } from "./api/tasks";
import { createModalShell, field, toDateTimeLocalValue } from "./formUtils";
import { STATUS_LABELS } from "./types/task";
import type { TaskInput, TaskStatus } from "./types/task";

/** Ordem dos status no seletor. */
const STATUS_ORDER: readonly TaskStatus[] = [
  "A_FAZER",
  "EM_PROGRESSO",
  "PRONTO",
  "ENTREGUE",
];

/**
 * Descrição:
 *   Abre o modal de criação de tarefa, monta o formulário, valida/coleta os
 *   dados e os envia ao backend via `createTask`.
 *
 * Objetivo:
 *   Permitir a criação de uma nova tarefa sem sair do quadro, recarregando-o
 *   ao final via callback.
 *
 * Parâmetros:
 *   - onCreated: callback chamado após a criação bem-sucedida (ex.: para
 *     recarregar o quadro).
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - há uma sessão ativa com permissão para criar tarefas.
 *
 * Assertivas de saída:
 *   - o modal é inserido na página e o campo "Nome" recebe foco;
 *   - em caso de sucesso, o modal é fechado e `onCreated` é invocado;
 *   - em caso de erro, a mensagem é exibida no formulário e o modal permanece
 *     aberto para nova tentativa.
 */
export function openTaskForm(onCreated: () => void): void {
  const { modal, close } = createModalShell("Nova Tarefa");

  const form = document.createElement("form");
  form.className = "task-form";

  // Nome
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.required = true;
  nameInput.maxLength = 255;
  nameInput.placeholder = "Insira aqui o nome da tarefa";
  form.appendChild(field("Nome", nameInput));

  // Status
  const statusSelect = document.createElement("select");
  for (const status of STATUS_ORDER) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = STATUS_LABELS[status];
    statusSelect.appendChild(option);
  }
  form.appendChild(field("Status", statusSelect));

  // Descrição
  const descriptionInput = document.createElement("textarea");
  descriptionInput.placeholder = "Insira aqui a descrição da tarefa";
  form.appendChild(field("Descrição", descriptionInput));

  // Story Points
  const storyPointsInput = document.createElement("input");
  storyPointsInput.type = "number";
  storyPointsInput.min = "0";
  storyPointsInput.max = "100";
  storyPointsInput.value = "0";
  form.appendChild(field("Story Points", storyPointsInput));

  // Data Limite
  const dueDateInput = document.createElement("input");
  dueDateInput.type = "datetime-local";
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  dueDateInput.value = toDateTimeLocalValue(oneWeekFromNow);
  const dueDateHint = "Por padrão, é definida para daqui a uma semana.";
  form.appendChild(field("Data Limite", dueDateInput, dueDateHint));

  // Mensagem de erro
  const errorMessage = document.createElement("p");
  errorMessage.className = "form-error";
  errorMessage.hidden = true;
  form.appendChild(errorMessage);

  // Ações
  const actions = document.createElement("div");
  actions.className = "form-actions";

  // Cancelar
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn-secondary";
  cancelButton.textContent = "Cancelar";

  // Criar
  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.className = "btn-add";
  submitButton.textContent = "Criar";

  actions.append(cancelButton, submitButton);
  form.appendChild(actions);

  modal.appendChild(form);

  cancelButton.addEventListener("click", close);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSubmit();
  });

  /**
   * Descrição:
   *   Coleta os valores do formulário, monta o `TaskInput` e o envia ao backend.
   *
   * Objetivo:
   *   Tratar o submit do formulário, normalizando campos vazios para `null` e
   *   exibindo erros sem fechar o modal.
   *
   * Assertivas de entrada:
   *   - os elementos do formulário existem no escopo (closure de `openTaskForm`).
   *
   * Assertivas de saída:
   *   - campos vazios (descrição, story points, data limite) viram `null`;
   *   - `responsible` é sempre `null` na criação;
   *   - durante o envio, o botão "Criar" fica desabilitado;
   *   - em sucesso: fecha o modal e chama `onCreated`;
   *   - em erro: exibe a mensagem e reabilita o botão.
   */
  async function handleSubmit(): Promise<void> {
    errorMessage.hidden = true;
    submitButton.disabled = true;

    const storyPointsRaw = storyPointsInput.value.trim();
    const dueDateRaw = dueDateInput.value;

    const payload: TaskInput = {
      name: nameInput.value.trim(),
      status: statusSelect.value as TaskStatus,
      description: descriptionInput.value.trim() || null,
      story_points: storyPointsRaw === "" ? null : Number(storyPointsRaw),
      due_date: dueDateRaw === "" ? null : new Date(dueDateRaw).toISOString(),
      responsible: null,
    };

    try {
      await createTask(payload);
      close();
      onCreated();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage.textContent = `Não foi possível criar a tarefa: ${message}`;
      errorMessage.hidden = false;
      submitButton.disabled = false;
    }
  }

  nameInput.focus();
}