/**
 * Modelo compartilhado do formulário de tarefa.
 *
 * Tanto a visualização quanto a edição usam
 * este mesmo formulário — muda apenas o que está habilitado, conforme as
 * permissões (`perms`), e os botões de rodapé (montados por quem chama).
 *
 * O que cada campo respeita:
 *  - Nome, Descrição, Story Points, Data Limite → `perms.editFields`;
 *  - Status → `perms.editStatus`;
 *  - Responsável → `perms.editResponsible` decide o controle:
 *      · `"all"`  → droplist com todos os usuários (`extras.users`);
 *      · `"self"` → checkbox de auto-atribuição (quando a tarefa não tem
 *        responsável ou o responsável é o próprio usuário); caso contrário,
 *        mostra o nome do responsável como texto fixo;
 *      · `"none"` → apenas o nome do responsável (texto fixo).
 *
 * Campos que permanecem SEMPRE somente leitura:
 *  - ID, Data de Criação, Data de Fechamento — preenchidos pelo backend;
 *  - Criador — falta endpoint de usuários para editá-lo.
 */

import { field, toDateTimeLocalValue } from "./formUtils";
import type { TaskFormPermissions } from "./permissions";
import { STATUS_LABELS } from "./types/task";
import type { Task, TaskStatus } from "./types/task";
import type { User } from "./types/user";

/** Ordem dos status no seletor. */
const STATUS_ORDER: readonly TaskStatus[] = [
  "A_FAZER",
  "EM_PROGRESSO",
  "PRONTO",
  "ENTREGUE",
];

/**
 * Referências aos controles para ler os valores ao salvar.
 *
 * Para o responsável, no máximo um dos dois controles existe (o outro é
 * `null`), conforme `perms.editResponsible`:
 *  - `responsibleSelect` → droplist do ADMINISTRADOR (`"all"`);
 *  - `selfResponsibleCheckbox` → auto-atribuição do USUARIO (`"self"`).
 * Quando o responsável só é exibido (texto fixo), ambos são `null`.
 */
export interface TaskFormControls {
  nameInput: HTMLInputElement;
  statusSelect: HTMLSelectElement;
  descriptionInput: HTMLTextAreaElement;
  storyPointsInput: HTMLInputElement;
  dueDateInput: HTMLInputElement;
  selfResponsibleCheckbox: HTMLInputElement | null;
  responsibleSelect: HTMLSelectElement | null;
}

export interface BuiltTaskForm {
  form: HTMLFormElement;
  controls: TaskFormControls;
}

/**
 * Dados extras para montar o campo "Responsável":
 *  - `users` → lista completa de usuários, exigida quando `editResponsible`
 *    é `"all"` (droplist do ADMINISTRADOR);
 *  - `responsibleName` → nome do responsável atual, para exibi-lo como texto
 *    quando não há controle de edição (USUARIO vendo outro responsável, ou
 *    visualização somente leitura).
 */
export interface TaskFormExtras {
  users?: User[];
  responsibleName?: string | null;
}

/**
 * Descrição:
 *   Monta o `<form>` com todos os dados da tarefa, habilitando cada campo
 *   conforme `perms` e escolhendo o controle do campo "Responsável" conforme
 *   `perms.editResponsible`.
 *
 * Objetivo:
 *   Centralizar a construção do formulário compartilhado entre visualização e
 *   edição, devolvendo também as referências aos controles para leitura.
 *
 * Parâmetros:
 *   - task: dados da tarefa (valores iniciais dos campos);
 *   - perms: permissões que definem o que está habilitado;
 *   - currentUserId: id do usuário corrente, usado na auto-atribuição;
 *   - extras: dados do campo "Responsável" (lista de usuários ou nome).
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - quando `perms.editResponsible === "all"`, `extras.users` deveria conter
 *     a lista de usuários (ausência resulta em droplist sem candidatos).
 *
 * Assertivas de saída:
 *   - ID, Data de Criação, Data de Fechamento e Criador ficam sempre somente
 *     leitura;
 *   - demais campos são habilitados conforme `perms`;
 *   - o campo "Responsável" usa droplist (`"all"`), checkbox de auto-atribuição
 *     (`"self"`, quando aplicável) ou texto fixo (demais casos);
 *   - em `controls`, no máximo um entre `responsibleSelect` e
 *     `selfResponsibleCheckbox` é não nulo;
 *   - o rodapé com botões NÃO é incluído (cabe a quem chama).
 *
 * Retorno:
 *   - `BuiltTaskForm` com o `form` e os `controls` para leitura ao salvar.
 */
export function buildTaskForm(
  task: Task,
  perms: TaskFormPermissions,
  currentUserId: number,
  extras: TaskFormExtras = {},
): BuiltTaskForm {
  const form = document.createElement("form");
  form.className = "task-form";

  // ID — sempre somente leitura.
  form.appendChild(field("ID", disabledText(String(task.id))));

  // Nome — editável apenas com `editFields`.
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 255;
  nameInput.required = true;
  nameInput.value = task.name;
  nameInput.disabled = !perms.editFields;
  form.appendChild(field("Nome", nameInput));

  // Status — editável conforme `editStatus`.
  const statusSelect = document.createElement("select");
  for (const status of STATUS_ORDER) {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = STATUS_LABELS[status];
    statusSelect.appendChild(option);
  }
  statusSelect.value = task.status;
  statusSelect.disabled = !perms.editStatus;
  form.appendChild(field("Status", statusSelect));

  // Descrição — editável apenas com `editFields`.
  const descriptionInput = document.createElement("textarea");
  descriptionInput.value = task.description ?? "";
  descriptionInput.disabled = !perms.editFields;
  form.appendChild(field("Descrição", descriptionInput));

  // Story points — editável apenas com `editFields`.
  const storyPointsInput = document.createElement("input");
  storyPointsInput.type = "number";
  storyPointsInput.min = "0";
  storyPointsInput.max = "100";
  storyPointsInput.value =
    task.story_points === null ? "" : String(task.story_points);
  storyPointsInput.disabled = !perms.editFields;
  form.appendChild(field("Story Points", storyPointsInput));

  // Data de criação — sempre somente leitura.
  form.appendChild(field("Data de Criação", disabledDate(task.created_at)));

  // Data limite — editável apenas com `editFields`.
  const dueDateInput = document.createElement("input");
  dueDateInput.type = "datetime-local";
  dueDateInput.value =
    task.due_date === null ? "" : toDateTimeLocalValue(new Date(task.due_date));
  dueDateInput.disabled = !perms.editFields;
  form.appendChild(field("Data Limite", dueDateInput));

  // Data de fechamento — sempre somente leitura.
  form.appendChild(field("Data de Fechamento", disabledDate(task.closed_at)));

  // Criador — sempre somente leitura (falta endpoint de usuários).
  form.appendChild(field("Criador", disabledText(task.creator_name || "—")));

  // Responsável — o controle varia conforme `perms.editResponsible`.
  let selfResponsibleCheckbox: HTMLInputElement | null = null;
  let responsibleSelect: HTMLSelectElement | null = null;

  // Nome do responsável atual para exibição (texto fixo): o passado em
  // `extras` ou, na falta, o próprio usuário/ID como recurso.
  const responsibleLabel =
    task.responsible === null
      ? "—"
      : (extras.responsibleName ?? String(task.responsible));

  if (perms.editResponsible === "all") {
    // ADMINISTRADOR: droplist com todos os usuários do sistema.
    responsibleSelect = document.createElement("select");
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "— Sem responsável —";
    responsibleSelect.appendChild(noneOption);
    for (const candidate of extras.users ?? []) {
      const option = document.createElement("option");
      option.value = String(candidate.id);
      option.textContent = candidate.name;
      responsibleSelect.appendChild(option);
    }
    responsibleSelect.value =
      task.responsible === null ? "" : String(task.responsible);
    form.appendChild(field("Responsável", responsibleSelect));
  } 
  else if (
    perms.editResponsible === "self" &&
    (task.responsible === null || task.responsible === currentUserId)
  ) {
    // USUARIO: só pode mexer no responsável quando a tarefa está sem
    // responsável ou quando ele próprio já é o responsável.
    selfResponsibleCheckbox = document.createElement("input");
    selfResponsibleCheckbox.type = "checkbox";
    selfResponsibleCheckbox.checked = task.responsible === currentUserId;
    form.appendChild(checkboxField("Sou responsável", selfResponsibleCheckbox));
  } 
  else {
    // Somente leitura: visualização, ou USUARIO vendo outro responsável.
    form.appendChild(field("Responsável", disabledText(responsibleLabel)));
  }

  return {
    form,
    controls: {
      nameInput,
      statusSelect,
      descriptionInput,
      storyPointsInput,
      dueDateInput,
      selfResponsibleCheckbox,
      responsibleSelect,
    },
  };
}

/**
 * Descrição:
 *   Envolve um checkbox em um `<label>`, com o controle ao lado do rótulo (e
 *   não abaixo, como `field`), com `hint` opcional.
 *
 * Objetivo:
 *   Tornar natural a marcação "[ ] Sou responsável", específica do campo de
 *   auto-atribuição.
 *
 * Parâmetros:
 *   - labelText: rótulo exibido ao lado do checkbox;
 *   - control: o `<input type="checkbox">`;
 *   - hint: texto de ajuda opcional.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - `control` é um checkbox válido.
 *
 * Assertivas de saída:
 *   - o `<label>` contém o checkbox seguido do rótulo (e da `hint`, se houver);
 *   - o elemento ainda não está anexado ao DOM.
 *
 * Retorno:
 *   - `HTMLElement` (`<label>`) pronto para ser inserido no formulário.
 */
function checkboxField(
  labelText: string,
  control: HTMLInputElement,
  hint?: string,
): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "form-field form-field-checkbox";

  const span = document.createElement("span");
  span.textContent = labelText;

  wrapper.append(control, span);

  if (hint !== undefined) {
    const hintElement = document.createElement("small");
    hintElement.className = "form-hint";
    hintElement.textContent = hint;
    wrapper.appendChild(hintElement);
  }

  return wrapper;
}

/**
 * Descrição:
 *   Cria um `<input type="text">` desabilitado com o valor informado.
 *
 * Objetivo:
 *   Exibir campos somente leitura (ex.: ID, Criador) com aparência de input.
 *
 * Parâmetros:
 *   - value: texto a exibir no input.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível.
 *
 * Assertivas de saída:
 *   - retorna um input de texto desabilitado contendo `value`.
 *
 * Retorno:
 *   - `HTMLInputElement` desabilitado.
 */
function disabledText(value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.disabled = true;
  return input;
}

/**
 * Descrição:
 *   Cria um `<input type="datetime-local">` desabilitado a partir de uma data
 *   ISO (ou vazio quando `null`).
 *
 * Objetivo:
 *   Exibir datas somente leitura (ex.: criação, fechamento) no fuso local.
 *
 * Parâmetros:
 *   - iso: data em formato ISO 8601, ou `null`.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - se não for `null`, `iso` é uma data válida.
 *
 * Assertivas de saída:
 *   - retorna um input desabilitado com a data formatada no fuso local, ou
 *     vazio quando `iso` for `null`.
 *
 * Retorno:
 *   - `HTMLInputElement` desabilitado.
 */
function disabledDate(iso: string | null): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "datetime-local";
  input.disabled = true;
  input.value = iso === null ? "" : toDateTimeLocalValue(new Date(iso));
  return input;
}
