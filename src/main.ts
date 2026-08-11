/**
 * Ponto de entrada da aplicação.
 *
 * Orquestra a navegação entre as telas renderizadas no `#app`: delega a
 * autenticação para `auth.ts`, o quadro para `board.ts` e o perfil para
 * `profile.ts`, mantendo aqui a barra superior (`renderTopbar`) e a composição
 * de cada página. Decide a tela inicial pela presença do token (`start`) e
 * recarrega o quadro após cada ação relevante (`refreshBoard`).
 */

import "bootstrap-icons/font/bootstrap-icons.css";
import "./style.css";
import { listTasks } from "./api/tasks";
import { getCurrentUser, logout } from "./api/users";
import { getToken } from "./api/session";
import { initAuth, renderLogin } from "./auth";
import { attachBoardEvents, buildBoardHtml } from "./board";
import { attachProfileEvents, buildProfileHtml } from "./profile";
import {
  app,
  errorMessage,
  escapeHtml,
  getRequiredElement,
} from "./utils";
import type { User } from "./types/user";

/**
 * Descrição:
 *   Resolve o rótulo legível do papel do usuário.
 *
 * Objetivo:
 *   Exibir o papel de forma amigável, preferindo o `role_display` do backend.
 *
 * Parâmetros:
 *   - user: usuário cujo papel será rotulado.
 *
 * Assertivas de entrada:
 *   - `user.role` é um papel válido.
 *
 * Assertivas de saída:
 *   - retorna `role_display` se presente; senão "Administrador"/"Usuário".
 *
 * Retorno:
 *   - `string` com o rótulo do papel.
 */
function roleLabel(user: User): string {
  return user.role_display ?? (user.role === "ADMINISTRADOR" ? "Administrador" : "Usuário");
}

/**
 * Descrição:
 *   Monta o HTML da barra superior, com ações de perfil/logout quando logado.
 *
 * Objetivo:
 *   Reaproveitar o cabeçalho entre o quadro, o perfil e os estados de carga.
 *
 * Parâmetros:
 *   - user: usuário logado, ou `null` (sem ações).
 *
 * Assertivas de entrada:
 *   - quando não nulo, `user.name` e `user.role` são válidos.
 *
 * Assertivas de saída:
 *   - retorna o HTML da topbar; inclui as ações apenas quando há usuário.
 *
 * Retorno:
 *   - `string` com o HTML do cabeçalho.
 */
function renderTopbar(user: User | null): string {
  const userActions = user === null
    ? ""
    : `
      <div class="topbar-actions">
        <span class="topbar-user">${escapeHtml(user.name)} (${escapeHtml(roleLabel(user))})</span>
        <button id="profile-button" class="btn-secondary btn-small" type="button">Perfil</button>
        <button id="logout-button" class="btn-danger btn-small" type="button">Logout</button>
      </div>
    `;

  return `
    <header class="topbar">
      <h1 id="board-title" class="topbar-title">Quadro Kanban</h1>
      ${userActions}
    </header>
  `;
}

/**
 * Descrição:
 *   Liga os eventos dos botões da barra superior (Perfil e Logout).
 *
 * Objetivo:
 *   Ativar a navegação para o perfil e a ação de logout após renderizar a topbar.
 *
 * Parâmetros:
 *   - user: usuário logado, repassado à tela de perfil.
 *
 * Assertivas de entrada:
 *   - a topbar com os botões já foi renderizada no DOM.
 *
 * Assertivas de saída:
 *   - "Perfil" abre a tela de perfil; "Logout" dispara o logout.
 */
function attachTopbarEvents(user: User): void {
  getRequiredElement<HTMLHeadingElement>("#board-title").addEventListener("click", () => {
    void refreshBoard();
  });

  getRequiredElement<HTMLButtonElement>("#profile-button").addEventListener("click", () => {
    showProfile(user);
  });

  getRequiredElement<HTMLButtonElement>("#logout-button").addEventListener("click", () => {
    void handleLogout();
  });
}

/**
 * Descrição:
 *   Executa o logout e volta para a tela de login.
 *
 * Objetivo:
 *   Encerrar a sessão e devolver o usuário à autenticação.
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa (ou ao menos um token a invalidar).
 *
 * Assertivas de saída:
 *   - a sessão é encerrada (ver `logout`) e a tela de login é exibida.
 */
async function handleLogout(): Promise<void> {
  await logout();
  renderLogin();
}

/**
 * Descrição:
 *   Recarrega o quadro: valida a sessão, busca tarefas e usuários e renderiza.
 *
 * Objetivo:
 *   Ponto central de atualização da tela principal, chamado após cada ação.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível.
 *
 * Assertivas de saída:
 *   - exibe estado de carregamento durante a busca;
 *   - se não houver usuário (token inválido/expirado), vai para o login;
 *   - em sucesso, renderiza o quadro;
 *   - em erro de carga, exibe a mensagem mantendo a topbar.
 */
async function refreshBoard(): Promise<void> {
  app.innerHTML = `${renderTopbar(null)}<p class="empty-message empty-message--info">Carregando tarefas…</p>`;

  const user = await getCurrentUser();
  if (user === null) {
    renderLogin();
    return;
  }

  try {
    const tasks = await listTasks();
    app.innerHTML = `${renderTopbar(user)}${buildBoardHtml(tasks, user)}`;
    attachTopbarEvents(user);
    attachBoardEvents(tasks, user, () => void refreshBoard());
  } catch (error) {
    app.innerHTML = `${renderTopbar(user)}<p class="empty-message">Não foi possível carregar as tarefas: ${escapeHtml(errorMessage(error))}</p>`;
    attachTopbarEvents(user);
  }
}

/**
 * Descrição:
 *   Compõe e exibe a tela de perfil (topbar + seção) e liga seus eventos.
 *
 * Objetivo:
 *   Montar a página de perfil reaproveitando a topbar do `main` e delegando a
 *   seção e os formulários ao `profile.ts`.
 *
 * Parâmetros:
 *   - user: usuário corrente a exibir/editar.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível;
 *   - há uma sessão ativa.
 *
 * Assertivas de saída:
 *   - o `#app` passa a exibir topbar + seção de perfil;
 *   - salvar o perfil re-renderiza a tela com o usuário atualizado.
 */
function showProfile(user: User): void {
  app.innerHTML = `${renderTopbar(user)}${buildProfileHtml(user)}`;
  attachTopbarEvents(user);
  attachProfileEvents(user, {
    onSaved: () => void refreshBoard(),
  });
}

/**
 * Descrição:
 *   Ponto de partida da aplicação: configura a auth e decide a primeira tela
 *   pela presença do token.
 *
 * Objetivo:
 *   Levar ao quadro quando há sessão salva, ou ao login caso contrário.
 *
 * Assertivas de entrada:
 *   - o `#app` está disponível.
 *
 * Assertivas de saída:
 *   - a navegação pós-login é configurada (`initAuth` → `refreshBoard`);
 *   - sem token: exibe o login;
 *   - com token: tenta carregar o quadro (`refreshBoard`).
 */
async function start(): Promise<void> {
  initAuth(refreshBoard);

  if (getToken() === null) {
    renderLogin();
    return;
  }

  await refreshBoard();
}

void start();
