/**
 * Utilitários genéricos de DOM, formatação e tratamento de erro.
 *
 * Funções puras/auxiliares, sem acoplamento às telas da aplicação, para serem
 * reaproveitadas por qualquer módulo (auth, board, profile, main).
 */

const appElement = document.querySelector<HTMLDivElement>("#app");

if (appElement === null) {
  throw new Error('Elemento raiz "#app" não encontrado no index.html.');
}

/**
 * Elemento raiz da aplicação (`#app`), resolvido uma única vez no carregamento.
 * É o contêiner onde todas as telas são renderizadas.
 */
export const app = appElement;

/**
 * Descrição:
 *   Escapa caracteres especiais de HTML em um texto.
 *
 * Objetivo:
 *   Prevenir injeção de HTML/XSS ao interpolar dados em `innerHTML`.
 *
 * Parâmetros:
 *   - value: texto a escapar.
 *
 * Assertivas de entrada:
 *   - `value` é uma string.
 *
 * Assertivas de saída:
 *   - retorna o texto com `& < > " '` substituídos por suas entidades.
 *
 * Retorno:
 *   - `string` segura para interpolar em HTML.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Descrição:
 *   Extrai uma mensagem legível de um erro capturado.
 *
 * Objetivo:
 *   Uniformizar a obtenção de texto de erro, independente do tipo lançado.
 *
 * Parâmetros:
 *   - error: valor capturado (`unknown`).
 *
 * Assertivas de entrada:
 *   - nenhuma (aceita qualquer valor).
 *
 * Assertivas de saída:
 *   - retorna `error.message` se for `Error`; caso contrário, `String(error)`.
 *
 * Retorno:
 *   - `string` com a mensagem de erro.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Descrição:
 *   Busca um elemento pelo seletor, lançando erro se não existir.
 *
 * Objetivo:
 *   Obter elementos obrigatórios com tipo garantido, sem checagens repetidas
 *   de `null` no restante do código.
 *
 * Parâmetros:
 *   - selector: seletor CSS do elemento.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível.
 *
 * Assertivas de saída:
 *   - retorna o elemento tipado quando encontrado;
 *   - lança `Error` quando o elemento não existe.
 *
 * Retorno:
 *   - `T` (subtipo de `HTMLElement`) correspondente ao seletor.
 */
export function getRequiredElement<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Elemento ${selector} não encontrado.`);
  }

  return element;
}

/**
 * Descrição:
 *   Obtém um `<input>` obrigatório pelo seu id.
 *
 * Objetivo:
 *   Encurtar o acesso tipado a inputs do formulário corrente.
 *
 * Parâmetros:
 *   - id: id do elemento (sem o `#`).
 *
 * Assertivas de entrada:
 *   - existe um `<input>` com esse id no DOM atual.
 *
 * Assertivas de saída:
 *   - retorna o input; lança `Error` se ausente.
 *
 * Retorno:
 *   - `HTMLInputElement`.
 */
export function getInput(id: string): HTMLInputElement {
  return getRequiredElement<HTMLInputElement>(`#${id}`);
}

/**
 * Descrição:
 *   Obtém um `<select>` obrigatório pelo seu id.
 *
 * Objetivo:
 *   Encurtar o acesso tipado a selects do formulário corrente.
 *
 * Parâmetros:
 *   - id: id do elemento (sem o `#`).
 *
 * Assertivas de entrada:
 *   - existe um `<select>` com esse id no DOM atual.
 *
 * Assertivas de saída:
 *   - retorna o select; lança `Error` se ausente.
 *
 * Retorno:
 *   - `HTMLSelectElement`.
 */
export function getSelect(id: string): HTMLSelectElement {
  return getRequiredElement<HTMLSelectElement>(`#${id}`);
}

/**
 * Descrição:
 *   Obtém um `<form>` obrigatório pelo seu id.
 *
 * Objetivo:
 *   Encurtar o acesso tipado a formulários do DOM atual.
 *
 * Parâmetros:
 *   - id: id do elemento (sem o `#`).
 *
 * Assertivas de entrada:
 *   - existe um `<form>` com esse id no DOM atual.
 *
 * Assertivas de saída:
 *   - retorna o form; lança `Error` se ausente.
 *
 * Retorno:
 *   - `HTMLFormElement`.
 */
export function getForm(id: string): HTMLFormElement {
  return getRequiredElement<HTMLFormElement>(`#${id}`);
}

/**
 * Descrição:
 *   Exibe uma mensagem de erro no parágrafo de id informado.
 *
 * Objetivo:
 *   Padronizar a exibição de erros de formulário.
 *
 * Parâmetros:
 *   - id: id do parágrafo de erro;
 *   - message: texto a exibir.
 *
 * Assertivas de entrada:
 *   - existe um `<p>` com esse id no DOM atual.
 *
 * Assertivas de saída:
 *   - o parágrafo passa a exibir `message` e fica visível.
 *
 * Retorno:
 *   - `void`.
 */
export function setError(id: string, message: string): void {
  const element = getRequiredElement<HTMLParagraphElement>(`#${id}`);
  element.textContent = message;
  element.hidden = false;
}

/**
 * Descrição:
 *   Limpa e oculta o parágrafo de erro de id informado.
 *
 * Objetivo:
 *   Resetar o estado de erro antes de uma nova tentativa.
 *
 * Parâmetros:
 *   - id: id do parágrafo de erro.
 *
 * Assertivas de entrada:
 *   - existe um `<p>` com esse id no DOM atual.
 *
 * Assertivas de saída:
 *   - o parágrafo fica vazio e oculto.
 *
 * Retorno:
 *   - `void`.
 */
export function clearError(id: string): void {
  const element = getRequiredElement<HTMLParagraphElement>(`#${id}`);
  element.textContent = "";
  element.hidden = true;
}

/**
 * Descrição:
 *   Formata uma data ISO para exibição em pt-BR (data e hora curtas).
 *
 * Objetivo:
 *   Apresentar datas de forma legível nos cartões, com fallback para vazio.
 *
 * Parâmetros:
 *   - value: data em ISO 8601, `null` ou string vazia.
 *
 * Assertivas de entrada:
 *   - quando não vazio, `value` é uma data válida.
 *
 * Assertivas de saída:
 *   - retorna "—" para `null`/vazio; senão a data formatada em pt-BR.
 *
 * Retorno:
 *   - `string` com a data formatada.
 */
export function formatDate(value: string | null): string {
  if (value === null || value === "") {
    return "—";
  }

  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
