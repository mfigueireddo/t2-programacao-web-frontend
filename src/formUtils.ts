/**
 * Utilitários compartilhados de formulário/modal.
 *
 * Centralizados aqui para que criação, visualização e edição de
 * tarefas reaproveitem a mesma marcação e estilo.
 */

/**
 * Descrição:
 *   Cria o "casco" de um modal (overlay escurecido + caixa branca com título)
 *   e o anexa ao `body`. Fecha automaticamente ao clicar no fundo escurecido.
 *
 * Objetivo:
 *   Reaproveitar a mesma estrutura/estilo de modal entre criação, visualização
 *   e edição de tarefas.
 *
 * Parâmetros:
 *   - headingText: título exibido no topo do modal.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível (`document`/`document.body` existem).
 *
 * Assertivas de saída:
 *   - o overlay é inserido no `body` ao final da chamada;
 *   - `close()` remove o overlay do DOM;
 *   - clicar fora da caixa (no overlay) dispara o fechamento.
 *
 * Retorno:
 *   - objeto com `modal` (caixa a ser preenchida) e `close` (remove o modal).
 */
export function createModalShell(headingText: string): {
  modal: HTMLDivElement;
  close: () => void;
} {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const modal = document.createElement("div");
  modal.className = "modal";

  const heading = document.createElement("h2");
  heading.textContent = headingText;
  modal.appendChild(heading);

  overlay.appendChild(modal);

  const close = (): void => {
    overlay.remove();
  };

  // Fecha ao clicar no fundo escurecido (fora da caixa).
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  document.body.appendChild(overlay);
  return { modal, close };
}

/**
 * Descrição:
 *   Envolve um controle de formulário em um `<label>` com texto e, opcional-
 *   mente, um texto de ajuda exibido logo abaixo do título.
 *
 * Objetivo:
 *   Padronizar a marcação dos campos de formulário, evitando repetição.
 *
 * Parâmetros:
 *   - labelText: rótulo do campo;
 *   - control: elemento de controle a ser rotulado (ex.: `<input>`);
 *   - hint: texto de ajuda opcional, exibido sob o rótulo.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - `control` é um elemento HTML válido.
 *
 * Assertivas de saída:
 *   - o `<label>` retornado contém o rótulo, a `hint` (se informada) e o
 *     `control`, nessa ordem;
 *   - o elemento ainda não está anexado ao DOM (cabe ao chamador inseri-lo).
 *
 * Retorno:
 *   - `HTMLElement` (`<label>`) pronto para ser inserido no formulário.
 */
export function field(
  labelText: string,
  control: HTMLElement,
  hint?: string,
): HTMLElement {
  const wrapper = document.createElement("label");
  wrapper.className = "form-field";

  const span = document.createElement("span");
  span.textContent = labelText;
  wrapper.appendChild(span);

  if (hint !== undefined) {
    const hintElement = document.createElement("small");
    hintElement.className = "form-hint";
    hintElement.textContent = hint;
    wrapper.appendChild(hintElement);
  }

  wrapper.appendChild(control);
  return wrapper;
}

/**
 * Descrição:
 *   Formata uma data no valor esperado por um input `datetime-local`
 *   ("YYYY-MM-DDTHH:MM"), usando o fuso horário local do navegador.
 *
 * Objetivo:
 *   Preencher inputs de data/hora a partir de objetos `Date` sem desvios de
 *   fuso (evitando a conversão para UTC do `toISOString`).
 *
 * Parâmetros:
 *   - date: data a ser formatada.
 *
 * Assertivas de entrada:
 *   - `date` é um `Date` válido (não `Invalid Date`).
 *
 * Assertivas de saída:
 *   - retorna uma string no formato "YYYY-MM-DDTHH:MM" no horário local;
 *   - mês, dia, hora e minuto têm sempre dois dígitos.
 *
 * Retorno:
 *   - `string` formatada para uso direto em `input[type="datetime-local"]`.
 */
export function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
