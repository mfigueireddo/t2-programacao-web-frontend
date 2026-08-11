/**
 * Tela de perfil: edição de dados e troca de senha.
 *
 * Este módulo constrói apenas a *seção* do perfil e liga os eventos dos seus
 * formulários e botões; a composição com a barra superior e a inserção no
 * `#app` ficam no `main`. A navegação (voltar ao quadro, logout, re-render
 * após salvar) é feita pelos callbacks recebidos em `attachProfileEvents`. A
 * troca de senha encerra a sessão e leva ao login (via `auth`).
 */

import { changePassword, deleteAccount, updateProfile } from "./api/users";
import { clearSession } from "./api/session";
import { renderLogin } from "./auth";
import { createModalShell } from "./formUtils";
import {
  clearError,
  errorMessage,
  escapeHtml,
  getForm,
  getInput,
  getRequiredElement,
  getSelect,
  setError,
} from "./utils";
import type { ProfileInput, Role, User } from "./types/user";

/** Callbacks de navegação acionados a partir da tela de perfil. */
export interface ProfileCallbacks {
  /** Re-renderizar o perfil com o usuário atualizado após salvar. */
  onSaved: (user: User) => void;
}

/**
 * Descrição:
 *   Constrói o HTML da seção de perfil (formulários de dados e de senha).
 *
 * Objetivo:
 *   Produzir apenas a seção do perfil, deixando a topbar e a inserção no `#app`
 *   a cargo do `main`.
 *
 * Parâmetros:
 *   - user: usuário corrente, usado para preencher e habilitar campos.
 *
 * Assertivas de entrada:
 *   - `user` é um usuário válido; seus dados serão escapados ao interpolar.
 *
 * Assertivas de saída:
 *   - o seletor de permissão fica desabilitado para usuário comum;
 *   - os campos de nome/permissão refletem o usuário atual.
 *
 * Retorno:
 *   - `string` com o HTML da seção de perfil.
 */
export function buildProfileHtml(user: User): string {
  const disabledRole = user.role === "ADMINISTRADOR" ? "" : "disabled";

  return `
    <main class="profile-page">
      <section class="auth-card profile-card">
        <h2>Perfil</h2>

        <form id="profile-form" class="auth-form">
          <label class="auth-field">
            <span>Nome</span>
            <input id="profile-name" type="text" required value="${escapeHtml(user.name)}" />
          </label>

          <label class="auth-field">
            <span>Email</span>
            <input id="profile-email" type="email" required value="${escapeHtml(user.email ?? "")}" />
          </label>

          <label class="auth-field">
            <span>Permissão</span>
            <select id="profile-role" required ${disabledRole}>
              <option value="USUARIO" ${user.role === "USUARIO" ? "selected" : ""}>Usuário</option>
              <option value="ADMINISTRADOR" ${user.role === "ADMINISTRADOR" ? "selected" : ""}>Administrador</option>
            </select>
          </label>

          <p id="profile-error" class="form-error" hidden></p>
          <p id="profile-success" class="success-message" hidden></p>

          <button id="profile-submit" class="btn-add auth-submit" type="submit">Salvar alterações</button>
        </form>

        <h3>Trocar senha</h3>

        <form id="password-form" class="auth-form">
          <label class="auth-field">
            <span>Senha atual</span>
            <input id="current-password" type="password" required />
          </label>

          <label class="auth-field">
            <span>Nova senha</span>
            <input id="new-password" type="password" required minlength="8" />
          </label>

          <label class="auth-field">
            <span>Confirmar nova senha</span>
            <input id="confirm-new-password" type="password" required minlength="8" />
          </label>

          <p id="password-error" class="form-error" hidden></p>

          <button id="password-submit" class="btn-add auth-submit" type="submit">Trocar senha</button>
        </form>

        <h3>Excluir conta</h3>

        <p class="profile-danger-hint">
          A exclusão da conta é permanente e não pode ser desfeita.
        </p>

        <button id="profile-delete" class="btn-danger auth-submit" type="button">Excluir conta</button>
      </section>
    </main>
  `;
}

/**
 * Descrição:
 *   Liga os eventos da seção de perfil (botões e formulários).
 *
 * Objetivo:
 *   Conectar o envio dos formulários de perfil e de senha após a seção ter sido
 *   renderizada.
 *
 * Parâmetros:
 *   - user: usuário corrente, repassado ao salvamento do perfil;
 *   - callbacks: re-render após salvar.
 *
 * Assertivas de entrada:
 *   - a seção de perfil já foi renderizada no DOM.
 *
 * Assertivas de saída:
 *   - o formulário de perfil dispara o salvamento;
 *   - o formulário de senha dispara a troca de senha.
 */
export function attachProfileEvents(user: User, callbacks: ProfileCallbacks): void {
  getForm("profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void handleProfileSave(user, callbacks.onSaved);
  });

  getForm("password-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void handlePasswordChange();
  });

  getRequiredElement<HTMLButtonElement>("#profile-delete").addEventListener(
    "click",
    openAccountDelete,
  );
}

/**
 * Descrição:
 *   Trata o salvamento do perfil, enviando nome e (para admin) a permissão.
 *
 * Objetivo:
 *   Atualizar o perfil respeitando o que cada papel pode alterar e refletir o
 *   resultado na tela.
 *
 * Parâmetros:
 *   - user: usuário corrente (define se a permissão é enviada);
 *   - onSaved: callback chamado com o usuário atualizado em caso de sucesso.
 *
 * Assertivas de entrada:
 *   - a seção de perfil está renderizada.
 *
 * Assertivas de saída:
 *   - `role` só é incluído no payload para ADMINISTRADOR;
 *   - durante o envio, o botão fica desabilitado;
 *   - em sucesso, exibe mensagem e chama `onSaved` com o usuário atualizado;
 *   - em erro, exibe a mensagem e reabilita o botão.
 */
async function handleProfileSave(
  user: User,
  onSaved: (user: User) => void,
): Promise<void> {
  clearError("profile-error");
  const success = getRequiredElement<HTMLParagraphElement>("#profile-success");
  success.hidden = true;

  const submitButton = getRequiredElement<HTMLButtonElement>("#profile-submit");
  submitButton.disabled = true;

  const payload: ProfileInput = {
    name: getInput("profile-name").value.trim(),
    email: getInput("profile-email").value.trim(),
  };

  if (user.role === "ADMINISTRADOR") {
    payload.role = getSelect("profile-role").value as Role;
  }

  try {
    const updatedUser = await updateProfile(payload);
    success.textContent = "Perfil atualizado com sucesso.";
    success.hidden = false;
    submitButton.disabled = false;
    onSaved(updatedUser);
  } catch (error) {
    setError("profile-error", `Não foi possível salvar o perfil: ${errorMessage(error)}`);
    submitButton.disabled = false;
  }
}

/**
 * Descrição:
 *   Trata a troca de senha, validando a confirmação e encerrando a sessão.
 *
 * Objetivo:
 *   Alterar a senha do usuário logado e forçar novo login com a nova senha.
 *
 * Assertivas de entrada:
 *   - a seção de perfil está renderizada.
 *
 * Assertivas de saída:
 *   - se as senhas não coincidirem, exibe erro e não envia;
 *   - durante o envio, o botão fica desabilitado;
 *   - em sucesso, encerra a sessão (`clearSession`) e exibe o login;
 *   - em erro, exibe a mensagem e reabilita o botão.
 */
async function handlePasswordChange(): Promise<void> {
  clearError("password-error");

  const newPassword = getInput("new-password").value;
  const confirmNewPassword = getInput("confirm-new-password").value;

  if (newPassword !== confirmNewPassword) {
    setError("password-error", "As senhas não coincidem.");
    return;
  }

  const submitButton = getRequiredElement<HTMLButtonElement>("#password-submit");
  submitButton.disabled = true;

  try {
    await changePassword({
      current_password: getInput("current-password").value,
      new_password: newPassword,
    });
    clearSession();
    renderLogin();
  } catch (error) {
    setError("password-error", `Não foi possível trocar a senha: ${errorMessage(error)}`);
    submitButton.disabled = false;
  }
}

/**
 * Descrição:
 *   Abre o modal de confirmação de exclusão da conta do usuário logado e, ao
 *   confirmar, executa a exclusão no backend, encerra a sessão e leva ao login.
 *
 * Objetivo:
 *   Evitar exclusões acidentais, exigindo confirmação explícita antes de uma
 *   operação irreversível, espelhando o fluxo de exclusão de tarefas.
 *
 * Assertivas de entrada:
 *   - o DOM está disponível;
 *   - há uma sessão ativa.
 *
 * Assertivas de saída:
 *   - o modal é exibido com a mensagem de confirmação;
 *   - "Cancelar" fecha o modal sem excluir;
 *   - em sucesso, a sessão é encerrada (`deleteAccount`) e o login é exibido;
 *   - em erro, a mensagem é exibida e o modal permanece aberto.
 */
function openAccountDelete(): void {
  const { modal, close } = createModalShell("Confirmar Exclusão");

  const message = document.createElement("p");
  message.textContent =
    "Tem certeza de que deseja excluir a sua conta? " +
    "Esta operação não pode ser desfeita.";
  modal.appendChild(message);

  // Mensagem de erro (escondida até falhar).
  const error = document.createElement("p");
  error.className = "form-error";
  error.hidden = true;
  modal.appendChild(error);

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
  deleteButton.textContent = "Excluir conta";
  deleteButton.addEventListener("click", () => {
    void handleDelete();
  });

  actions.append(cancelButton, deleteButton);
  modal.appendChild(actions);

  /**
   * Descrição:
   *   Executa a exclusão da conta no backend e trata o resultado.
   *
   * Objetivo:
   *   Concluir a exclusão ao confirmar, exibindo erros sem fechar o modal.
   *
   * Assertivas de entrada:
   *   - `deleteButton`, `error` e demais elementos existem no closure.
   *
   * Assertivas de saída:
   *   - durante o envio, o botão "Excluir conta" fica desabilitado;
   *   - em sucesso: fecha o modal e exibe o login;
   *   - em erro: exibe a mensagem e reabilita o botão.
   */
  async function handleDelete(): Promise<void> {
    error.hidden = true;
    deleteButton.disabled = true;

    try {
      await deleteAccount();
      close();
      renderLogin();
    } catch (caught) {
      error.textContent = `Não foi possível excluir a conta: ${errorMessage(caught)}`;
      error.hidden = false;
      deleteButton.disabled = false;
    }
  }
}
