/**
 * Quadro Kanban: construção do HTML das colunas/cartões e ligação dos eventos.
 *
 * Este módulo cuida apenas da *seção* do quadro (botão de adicionar + colunas);
 * a composição com a barra superior e a inserção no `#app` ficam no `main`.
 * As ações de cada cartão abrem as modais correspondentes e, ao concluir,
 * disparam o callback `onChanged` (tipicamente, recarregar o quadro), evitando
 * que este módulo dependa do `main`.
 */

import { canCreateTask, canDeleteTask, canEditTask } from "./permissions";
import { openTaskDelete } from "./taskDelete";
import { openTaskEdit } from "./taskEdit";
import { openTaskForm } from "./taskForm";
import { openTaskView } from "./taskView";
import { STATUS_LABELS } from "./types/task";
import type { Task, TaskStatus } from "./types/task";
import type { User } from "./types/user";
import { escapeHtml } from "./utils";

/** Ação executada após uma alteração no quadro (ex.: recarregar). */
type BoardChangeCallback = () => void;

const COLUMNS: readonly TaskStatus[] = [
  "A_FAZER",
  "EM_PROGRESSO",
  "PRONTO",
  "ENTREGUE",
];

/**
 * Descrição:
 *   Monta o HTML de um cartão de tarefa, com as ações de ver/editar/deletar.
 *
 * Objetivo:
 *   Renderizar a tarefa respeitando as permissões do usuário (botões).
 *
 * Parâmetros:
 *   - task: tarefa a renderizar;
 *   - user: usuário corrente (define permissões dos botões);
 *
 * Assertivas de entrada:
 *   - `task` é uma tarefa válida; dados textuais serão escapados.
 *
 * Assertivas de saída:
 *   - o botão de deletar só aparece se `canDeleteTask`;
 *   - o botão de editar fica desabilitado se `!canEditTask`.
 *
 * Retorno:
 *   - `string` com o HTML do cartão (`<li>`).
 */
function taskCardHtml(task: Task, user: User): string {
  const deleteButton = canDeleteTask(user)
    ? `<button class="task-action" data-action="delete" data-task-id="${task.id}" type="button" title="Deletar"><i class="bi bi-trash"></i></button>`
    : "";

  const editDisabled = canEditTask(user, task) ? "" : "disabled";

  return `
    <li class="task-card">
      <div class="task-card-content">
        <span class="task-name">${escapeHtml(task.name)}</span>
      </div>

      <div class="task-actions">
        <button class="task-action" data-action="view" data-task-id="${task.id}" type="button" title="Ver mais"><i class="bi bi-eye"></i></button>
        <button class="task-action" data-action="edit" data-task-id="${task.id}" type="button" title="Editar" ${editDisabled}><i class="bi bi-pencil-square"></i></button>
        ${deleteButton}
      </div>
    </li>
  `;
}

/**
 * Descrição:
 *   Constrói o HTML da seção do quadro (botão de adicionar + colunas/cartões).
 *
 * Objetivo:
 *   Produzir apenas a seção do quadro, deixando a topbar e a inserção no `#app`
 *   a cargo do `main`.
 *
 * Parâmetros:
 *   - tasks: tarefas a exibir;
 *   - user: usuário corrente (define ações disponíveis);
 *
 * Assertivas de saída:
 *   - o botão "Adicionar Tarefa" só aparece se `canCreateTask`;
 *   - retorna a mensagem de vazio quando não há tarefas;
 *   - as tarefas são agrupadas por status, na ordem das colunas.
 *
 * Retorno:
 *   - `string` com o HTML da seção do quadro.
 */
export function buildBoardHtml(
  tasks: Task[],
  user: User,
): string {
  const addButton = canCreateTask(user)
    ? `
      <div class="add-task-bar">
        <button id="add-task-button" class="btn-add" type="button">Adicionar Tarefa</button>
      </div>
    `
    : "";

  const boardHtml = tasks.length === 0
    ? `<p class="empty-message">Nenhuma tarefa cadastrada.</p>`
    : `
      <main class="board">
        ${COLUMNS.map((status) => {
          const cards = tasks
            .filter((task) => task.status === status)
            .map((task) => taskCardHtml(task, user))
            .join("");

          return `
            <section class="column">
              <h2 class="column-title" data-status="${status}">${STATUS_LABELS[status]}</h2>
              <ul class="task-list">${cards}</ul>
            </section>
          `;
        }).join("")}
      </main>
    `;

  return `${addButton}${boardHtml}`;
}

/**
 * Descrição:
 *   Liga os eventos do quadro: adicionar tarefa e as ações de cada cartão.
 *
 * Objetivo:
 *   Conectar os botões renderizados às respectivas modais, disparando
 *   `onChanged` ao final de cada ação.
 *
 * Parâmetros:
 *   - tasks: tarefas atuais (para localizar a tarefa pelo id da ação);
 *   - user: usuário corrente, repassado às modais;
 *   - onChanged: callback executado após criar/editar/deletar (ex.: recarregar).
 *
 * Assertivas de entrada:
 *   - o quadro já foi renderizado no DOM.
 *
 * Assertivas de saída:
 *   - "Adicionar Tarefa" (se presente) abre o formulário de criação;
 *   - cada ação `view`/`edit`/`delete` abre a modal correspondente;
 *   - ações com id inexistente são ignoradas.
 */
export function attachBoardEvents(
  tasks: Task[],
  user: User,
  onChanged: BoardChangeCallback,
): void {
  const addButton = document.querySelector<HTMLButtonElement>("#add-task-button");
  addButton?.addEventListener("click", () => {
    openTaskForm(onChanged);
  });

  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-action]")) {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      const taskId = Number(button.dataset.taskId);
      const task = tasks.find((candidate) => candidate.id === taskId);

      if (task === undefined) {
        return;
      }

      if (action === "view") {
        openTaskView(task.id, user, onChanged);
      } else if (action === "edit") {
        openTaskEdit(task.id, user, onChanged);
      } else if (action === "delete") {
        openTaskDelete(task.id, task.name, onChanged);
      }
    });
  }
}

