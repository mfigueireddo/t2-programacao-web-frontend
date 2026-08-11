/**
 * Telas e handlers de autenticação.
 *
 * Reúne as telas de login, cadastro, recuperação e redefinição de senha,
 * renderizadas no `#app` por cima do mesmo cartão (`renderAuthCard`). A
 * navegação entre essas telas é interna ao módulo; a única saída para fora
 * (ir ao quadro após autenticar) é feita pelo callback configurado em
 * `initAuth`, evitando que este módulo dependa do `main`.
 */

import { forgotPassword, login, resetPassword, signup } from "./api/users";
import {
  app,
  clearError,
  errorMessage,
  escapeHtml,
  getForm,
  getInput,
  getRequiredElement,
  getSelect,
  setError,
} from "./utils";
import type { Role } from "./types/user";

/** Ação executada após uma autenticação bem-sucedida (login/cadastro). */
type AuthenticatedCallback = () => void | Promise<void>;

/**
 * Callback chamado ao autenticar com sucesso. Configurado por `initAuth` antes
 * de qualquer tela ser renderizada; por padrão, é um no-op.
 */
let onAuthenticated: AuthenticatedCallback = () => {};

/**
 * Descrição:
 *   Configura o callback de navegação executado após autenticar.
 *
 * Objetivo:
 *   Permitir que o `main` injete o destino pós-login (ex.: carregar o quadro)
 *   sem que este módulo precise importar o `main`.
 *
 * Parâmetros:
 *   - callback: função chamada após login/cadastro bem-sucedido.
 *
 * Assertivas de entrada:
 *   - `callback` é uma função válida.
 *
 * Assertivas de saída:
 *   - chamadas subsequentes de login/cadastro bem-sucedidas invocam `callback`.
 */
export function initAuth(callback: AuthenticatedCallback): void {
  onAuthenticated = callback;
}

/**
 * Descrição:
 *   Renderiza o cartão padrão das telas de autenticação no `#app`.
 *
 * Objetivo:
 *   Reaproveitar o layout (título + subtítulo + corpo) das telas de auth.
 *
 * Parâmetros:
 *   - title: título do cartão;
 *   - subtitle: subtítulo explicativo;
 *   - body: HTML do corpo (ex.: o formulário).
 *
 * Assertivas de entrada:
 *   - `title` e `subtitle` serão escapados; `body` é HTML confiável (montado
 *     internamente).
 *
 * Assertivas de saída:
 *   - o conteúdo do `#app` é substituído pelo cartão de autenticação.
 */
function renderAuthCard(title: string, subtitle: string, body: string): void {
  app.innerHTML = `
    <main class="auth-page">
      <section class="auth-card">
        <h1>${escapeHtml(title)}</h1>
        <p class="auth-subtitle">${escapeHtml(subtitle)}</p>
        ${body}
      </section>
    </main>
  `;
}

/**
 * Descrição:
 *   Renderiza a tela de login e conecta seus eventos.
 *
 * Objetivo:
 *   Permitir a autenticação e a navegação para cadastro/recuperação.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível.
 *
 * Assertivas de saída:
 *   - exibe o formulário de login com o campo "Nome" focado;
 *   - liga os botões para as telas de cadastro e recuperação.
 */
export function renderLogin(): void {
  renderAuthCard(
    "Entrar no Kanban",
    "Faça login para acessar o quadro de tarefas.",
    `
      <form id="login-form" class="auth-form">
        <label class="auth-field">
          <span>Nome</span>
          <input id="login-name" type="text" required placeholder="Nome do usuário" />
        </label>

        <label class="auth-field">
          <span>Senha</span>
          <input id="login-password" type="password" required placeholder="Senha" />
        </label>

        <p id="login-error" class="form-error" hidden></p>

        <button id="login-submit" class="btn-add auth-submit" type="submit">Entrar</button>

        <div class="auth-links">
          <button id="go-signup" class="link-button" type="button">Criar conta</button>
          <button id="go-forgot" class="link-button" type="button">Esqueci minha senha</button>
        </div>
      </form>
    `,
  );

  getRequiredElement<HTMLButtonElement>("#go-signup").addEventListener("click", renderSignup);
  getRequiredElement<HTMLButtonElement>("#go-forgot").addEventListener("click", renderForgotPassword);

  getForm("login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void handleLogin();
  });

  getInput("login-name").focus();
}

/**
 * Descrição:
 *   Trata o submit do login, autenticando e seguindo para o quadro.
 *
 * Objetivo:
 *   Efetuar o login e, em sucesso, transicionar via callback `onAuthenticated`.
 *
 * Assertivas de entrada:
 *   - a tela de login está renderizada (campos e botão existem).
 *
 * Assertivas de saída:
 *   - durante o envio, o botão de submit fica desabilitado;
 *   - em sucesso, o callback `onAuthenticated` é executado;
 *   - em erro, a mensagem é exibida e o botão é reabilitado.
 */
async function handleLogin(): Promise<void> {
  clearError("login-error");
  const submitButton = getRequiredElement<HTMLButtonElement>("#login-submit");
  submitButton.disabled = true;

  try {
    await login({
      name: getInput("login-name").value.trim(),
      password: getInput("login-password").value,
    });
    await onAuthenticated();
  } catch (error) {
    setError("login-error", `Não foi possível fazer login: ${errorMessage(error)}`);
    submitButton.disabled = false;
  }
}

/**
 * Descrição:
 *   Renderiza a tela de cadastro e conecta seus eventos.
 *
 * Objetivo:
 *   Permitir o cadastro de um novo usuário e voltar ao login.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível.
 *
 * Assertivas de saída:
 *   - exibe o formulário de cadastro com o campo "Nome" focado;
 *   - liga o botão de retorno ao login.
 */
function renderSignup(): void {
  renderAuthCard(
    "Criar conta",
    "Cadastre um novo usuário para acessar o quadro Kanban.",
    `
      <form id="signup-form" class="auth-form">
        <label class="auth-field">
          <span>Nome</span>
          <input id="signup-name" type="text" required placeholder="Nome do usuário" />
        </label>

        <label class="auth-field">
          <span>Email</span>
          <input id="signup-email" type="email" required placeholder="email@exemplo.com" />
        </label>

        <label class="auth-field">
          <span>Senha</span>
          <input id="signup-password" type="password" required minlength="8" placeholder="Senha com no mínimo 8 caracteres" />
        </label>

        <label class="auth-field">
          <span>Confirmar senha</span>
          <input id="signup-confirm-password" type="password" required minlength="8" placeholder="Confirme a senha" />
        </label>

        <label class="auth-field">
          <span>Permissão</span>
          <select id="signup-role" required>
            <option value="USUARIO">Usuário</option>
            <option value="ADMINISTRADOR">Administrador</option>
          </select>
        </label>

        <p id="signup-error" class="form-error" hidden></p>

        <button id="signup-submit" class="btn-add auth-submit" type="submit">Cadastrar</button>

        <div class="auth-links">
          <button id="go-login" class="link-button" type="button">Já tenho conta</button>
        </div>
      </form>
    `,
  );

  getRequiredElement<HTMLButtonElement>("#go-login").addEventListener("click", renderLogin);

  getForm("signup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void handleSignup();
  });

  getInput("signup-name").focus();
}

/**
 * Descrição:
 *   Trata o submit do cadastro, validando a confirmação de senha e criando a
 *   conta.
 *
 * Objetivo:
 *   Cadastrar o usuário e, em sucesso, transicionar via callback `onAuthenticated`.
 *
 * Assertivas de entrada:
 *   - a tela de cadastro está renderizada.
 *
 * Assertivas de saída:
 *   - se as senhas não coincidirem, exibe erro e não envia;
 *   - durante o envio, o botão de submit fica desabilitado;
 *   - em sucesso, o callback `onAuthenticated` é executado;
 *   - em erro, a mensagem é exibida e o botão é reabilitado.
 */
async function handleSignup(): Promise<void> {
  clearError("signup-error");

  const password = getInput("signup-password").value;
  const confirmPassword = getInput("signup-confirm-password").value;

  if (password !== confirmPassword) {
    setError("signup-error", "As senhas não coincidem.");
    return;
  }

  const submitButton = getRequiredElement<HTMLButtonElement>("#signup-submit");
  submitButton.disabled = true;

  try {
    await signup({
      name: getInput("signup-name").value.trim(),
      email: getInput("signup-email").value.trim(),
      password,
      role: getSelect("signup-role").value as Role,
    });
    await onAuthenticated();
  } catch (error) {
    setError("signup-error", `Não foi possível criar a conta: ${errorMessage(error)}`);
    submitButton.disabled = false;
  }
}

/**
 * Descrição:
 *   Renderiza a tela de recuperação de senha e conecta seus eventos.
 *
 * Objetivo:
 *   Permitir solicitar o envio de um token de recuperação e navegar para
 *   redefinição/login.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível.
 *
 * Assertivas de saída:
 *   - exibe o formulário com o campo "Nome" focado;
 *   - liga os botões para a redefinição e para o login.
 */
function renderForgotPassword(): void {
  renderAuthCard(
    "Recuperar senha",
    "Informe o email cadastrado para receber um token de recuperação no terminal do backend.",
    `
      <form id="forgot-form" class="auth-form">
        <label class="auth-field">
          <span>Email</span>
          <input id="forgot-email" type="email" required placeholder="email@exemplo.com" />
        </label>

        <p id="forgot-error" class="form-error" hidden></p>
        <p id="forgot-success" class="success-message" hidden></p>

        <button id="forgot-submit" class="btn-add auth-submit" type="submit">Gerar token</button>

        <div class="auth-links">
          <button id="go-reset" class="link-button" type="button">Já tenho um token</button>
          <button id="forgot-go-login" class="link-button" type="button">Voltar para login</button>
        </div>
      </form>
    `,
  );

  getRequiredElement<HTMLButtonElement>("#go-reset").addEventListener("click", renderResetPassword);
  getRequiredElement<HTMLButtonElement>("#forgot-go-login").addEventListener("click", renderLogin);

  getForm("forgot-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void handleForgotPassword();
  });

  getInput("forgot-email").focus();
}

/**
 * Descrição:
 *   Trata o submit da recuperação, solicitando o envio do token de redefinição.
 *
 * Objetivo:
 *   Disparar a recuperação a partir do email cadastrado; o backend gera o token
 *   e o disponibiliza ao usuário (ex.: no terminal do backend).
 *
 * Assertivas de entrada:
 *   - a tela de recuperação está renderizada.
 *
 * Assertivas de saída:
 *   - durante o envio, o botão de submit fica desabilitado;
 *   - em sucesso, exibe a mensagem retornada pelo backend e reabilita o botão;
 *   - em erro, a mensagem é exibida e o botão é reabilitado.
 */
async function handleForgotPassword(): Promise<void> {
  clearError("forgot-error");
  const success = getRequiredElement<HTMLParagraphElement>("#forgot-success");
  success.hidden = true;

  const submitButton = getRequiredElement<HTMLButtonElement>("#forgot-submit");
  submitButton.disabled = true;

  try {
    const response = await forgotPassword({
      email: getInput("forgot-email").value.trim(),
    });
    success.textContent = response.detail;
    success.hidden = false;
    submitButton.disabled = false;
  } catch (error) {
    setError("forgot-error", `Não foi possível gerar o token: ${errorMessage(error)}`);
    submitButton.disabled = false;
  }
}

/**
 * Descrição:
 *   Renderiza a tela de redefinição de senha e conecta seus eventos.
 *
 * Objetivo:
 *   Permitir cadastrar uma nova senha usando o token de recuperação.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível.
 *
 * Assertivas de saída:
 *   - exibe o formulário com o campo "Token" focado;
 *   - liga o botão de retorno ao login.
 */
function renderResetPassword(): void {
  renderAuthCard(
    "Redefinir senha",
    "Use o token de recuperação para cadastrar uma nova senha.",
    `
      <form id="reset-form" class="auth-form">
        <label class="auth-field">
          <span>Token</span>
          <input id="reset-token" type="text" required placeholder="Token de recuperação" />
        </label>

        <label class="auth-field">
          <span>Nova senha</span>
          <input id="reset-password" type="password" required minlength="8" placeholder="Nova senha" />
        </label>

        <label class="auth-field">
          <span>Confirmar nova senha</span>
          <input id="reset-confirm-password" type="password" required minlength="8" placeholder="Confirme a nova senha" />
        </label>

        <p id="reset-error" class="form-error" hidden></p>

        <button id="reset-submit" class="btn-add auth-submit" type="submit">Redefinir senha</button>

        <div class="auth-links">
          <button id="reset-go-login" class="link-button" type="button">Voltar para login</button>
        </div>
      </form>
    `,
  );

  getRequiredElement<HTMLButtonElement>("#reset-go-login").addEventListener("click", renderLogin);

  getForm("reset-form").addEventListener("submit", (event) => {
    event.preventDefault();
    void handleResetPassword();
  });

  getInput("reset-token").focus();
}

/**
 * Descrição:
 *   Trata o submit da redefinição, validando a confirmação e redefinindo a
 *   senha via token.
 *
 * Objetivo:
 *   Concluir a recuperação e levar o usuário de volta ao login.
 *
 * Assertivas de entrada:
 *   - a tela de redefinição está renderizada.
 *
 * Assertivas de saída:
 *   - se as senhas não coincidirem, exibe erro e não envia;
 *   - durante o envio, o botão de submit fica desabilitado;
 *   - em sucesso, exibe a tela de login;
 *   - em erro, a mensagem é exibida e o botão é reabilitado.
 */
async function handleResetPassword(): Promise<void> {
  clearError("reset-error");

  const password = getInput("reset-password").value;
  const confirmPassword = getInput("reset-confirm-password").value;

  if (password !== confirmPassword) {
    setError("reset-error", "As senhas não coincidem.");
    return;
  }

  const submitButton = getRequiredElement<HTMLButtonElement>("#reset-submit");
  submitButton.disabled = true;

  try {
    await resetPassword({
      token: getInput("reset-token").value.trim(),
      new_password: password,
    });
    renderLogin();
  } catch (error) {
    setError("reset-error", `Não foi possível redefinir a senha: ${errorMessage(error)}`);
    submitButton.disabled = false;
  }
}
