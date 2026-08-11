/**
 * Sessão/autenticação do frontend.
 *
 * Fonte única do estado de sessão. O token e os dados do usuário retornados
 * pelo backend ficam no localStorage para que o usuário continue logado mesmo
 * após atualizar a página. O cliente HTTP lê o token daqui para montar o
 * header `Authorization`, e as telas leem o usuário corrente.
 */

import type { User } from "../types/user";

const TOKEN_KEY = "kanban_auth_token";
const USER_KEY = "kanban_auth_user";

/**
 * Descrição:
 *   Recupera o token de autenticação armazenado no localStorage.
 *
 * Objetivo:
 *   Fornecer o token às demais partes do app (ex.: cliente HTTP) sem que elas
 *   precisem conhecer a chave de armazenamento.
 *
 * Assertivas de entrada:
 *   - `localStorage` está disponível no ambiente de execução.
 *
 * Assertivas de saída:
 *   - retorna a string do token se houver sessão; caso contrário, `null`.
 *
 * Retorno:
 *   - `string | null` com o token, ou `null` se não houver token salvo.
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Descrição:
 *   Recupera e desserializa o usuário corrente armazenado no localStorage.
 *
 * Objetivo:
 *   Disponibilizar os dados do usuário logado sem nova requisição ao backend,
 *   limpando a sessão caso o conteúdo armazenado esteja corrompido.
 *
 * Assertivas de entrada:
 *   - `localStorage` está disponível no ambiente de execução.
 *
 * Assertivas de saída:
 *   - retorna o objeto `User` quando há JSON válido armazenado;
 *   - retorna `null` quando não há usuário salvo;
 *   - em caso de JSON inválido, a sessão é encerrada (`clearSession()`) e
 *     retorna `null`.
 *
 * Retorno:
 *   - `User | null` com o usuário corrente, ou `null` se ausente/inválido.
 */
export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    clearSession();
    return null;
  }
}

/**
 * Descrição:
 *   Persiste no localStorage o token e os dados do usuário, iniciando a sessão.
 *
 * Objetivo:
 *   Registrar de uma só vez o resultado de um login/cadastro bem-sucedido,
 *   mantendo token e usuário em sincronia.
 *
 * Parâmetros:
 *   - token: token de autenticação retornado pelo backend;
 *   - user: dados do usuário autenticado.
 *
 * Assertivas de entrada:
 *   - `token` é uma string não vazia;
 *   - `user` é um objeto `User` válido e serializável em JSON;
 *   - `localStorage` está disponível no ambiente de execução.
 *
 * Assertivas de saída:
 *   - `getToken()` passa a retornar `token`;
 *   - `getStoredUser()` passa a retornar `user`;
 *   - `isLoggedIn()` passa a retornar `true`.
 */
export function setSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Descrição:
 *   Atualiza apenas os dados do usuário armazenados, preservando o token.
 *
 * Objetivo:
 *   Refletir alterações no perfil do usuário (ex.: edição de dados) sem exigir
 *   novo login.
 *
 * Parâmetros:
 *   - user: dados atualizados do usuário corrente.
 *
 * Assertivas de entrada:
 *   - `user` é um objeto `User` válido e serializável em JSON;
 *   - `localStorage` está disponível no ambiente de execução.
 *
 * Assertivas de saída:
 *   - `getStoredUser()` passa a retornar `user`;
 *   - o token existente permanece inalterado.
 */
export function updateStoredUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Descrição:
 *   Remove token e usuário do localStorage, encerrando a sessão.
 *
 * Objetivo:
 *   Realizar o logout (ou a limpeza após um 401/JSON inválido), garantindo que
 *   nenhum dado de sessão permaneça armazenado.
 *
 * Assertivas de entrada:
 *   - `localStorage` está disponível no ambiente de execução.
 *
 * Assertivas de saída:
 *   - `getToken()` passa a retornar `null`;
 *   - `getStoredUser()` passa a retornar `null`;
 *   - `isLoggedIn()` passa a retornar `false`.
 */
export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Descrição:
 *   Indica se há uma sessão ativa, com base na presença do token.
 *
 * Objetivo:
 *   Servir de guarda para rotas/telas que exigem usuário autenticado.
 *
 * Assertivas de entrada:
 *   - `localStorage` está disponível no ambiente de execução.
 *
 * Assertivas de saída:
 *   - retorna `true` se, e somente se, houver token armazenado.
 *
 * Retorno:
 *   - `boolean` indicando se o usuário está logado.
 */
export function isLoggedIn(): boolean {
  return getToken() !== null;
}

