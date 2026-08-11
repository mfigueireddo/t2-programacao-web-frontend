/**
 * Modal de confirmação de exclusão de tarefa.
 *
 * Pergunta ao usuário se ele realmente deseja excluir, avisando que a operação
 * é irreversível. Só ao confirmar é que faz o DELETE no backend.
 */

import { deleteTask } from "./api/tasks";
import { createModalShell } from "./formUtils";

/**
 * Descrição:
 *   Abre o modal de confirmação de exclusão de uma tarefa e, ao confirmar,
 *   executa o DELETE no backend.
 *
 * Objetivo:
 *   Evitar exclusões acidentais, exigindo confirmação explícita antes de uma
 *   operação irreversível.
 *
 * Parâmetros:
 *   - taskId: id da tarefa a excluir;
 *   - taskName: nome da tarefa, exibido na mensagem de confirmação;
 *   - onDeleted: callback chamado após a exclusão bem-sucedida (ex.: recarregar
 *     o quadro).
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - há uma sessão ativa com permissão para deletar tarefas;
 *   - `taskId` corresponde a uma tarefa existente.
 *
 * Assertivas de saída:
 *   - o modal é exibido com a mensagem de confirmação;
 *   - "Cancelar" fecha o modal sem excluir;
 *   - em sucesso, o modal é fechado e `onDeleted` é invocado;
 *   - em erro, a mensagem é exibida e o modal permanece aberto.
 *
 * Retorno:
 *   - `void` (efeitos ocorrem no DOM e via callback).
 */
export function openTaskDelete(
  taskId: number,
  taskName: string,
  onDeleted: () => void,
): void {
  const { modal, close } = createModalShell("Confirmar Exclusão");

  const message = document.createElement("p");
  message.textContent =
    `Tem certeza de que deseja deletar a tarefa "${taskName}"? ` +
    "Esta operação não pode ser desfeita.";
  modal.appendChild(message);

  // Mensagem de erro (escondida até falhar).
  const errorMessage = document.createElement("p");
  errorMessage.className = "form-error";
  errorMessage.hidden = true;
  modal.appendChild(errorMessage);

  const actions = document.createElement("div");
  actions.className = "form-actions";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "btn-secondary";
  cancelButton.textContent = "Cancelar";
  cancelButton.addEventListener("click", close);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "btn-danger";
  deleteButton.textContent = "Deletar";
  deleteButton.addEventListener("click", () => {
    void handleDelete();
  });

  actions.append(cancelButton, deleteButton);
  modal.appendChild(actions);

  /**
   * Descrição:
   *   Executa o DELETE da tarefa no backend e trata o resultado.
   *
   * Objetivo:
   *   Concluir a exclusão ao confirmar, exibindo erros sem fechar o modal.
   *
   * Assertivas de entrada:
   *   - `taskId`, `deleteButton`, `errorMessage` e demais elementos existem no
   *     closure.
   *
   * Assertivas de saída:
   *   - durante o envio, o botão "Deletar" fica desabilitado;
   *   - em sucesso: fecha o modal e chama `onDeleted`;
   *   - em erro: exibe a mensagem e reabilita o botão.
   *
   * Retorno:
   *   - `Promise<void>`.
   */
  async function handleDelete(): Promise<void> {
    errorMessage.hidden = true;
    deleteButton.disabled = true;

    try {
      await deleteTask(taskId);
      close();
      onDeleted();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage.textContent = `Não foi possível deletar a tarefa: ${message}`;
      errorMessage.hidden = false;
      deleteButton.disabled = false;
    }
  }
}
