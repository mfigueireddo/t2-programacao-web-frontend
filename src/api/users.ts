/**
 * Serviços de usuários, autenticação e perfil.
 *
 * Reúne as chamadas aos endpoints `/auth/*` e `/users/*` do backend. As
 * operações de entrada na sessão (signup/login) gravam o token e o usuário
 * via `setSession`, enquanto logout e respostas de perfil sincronizam o
 * estado local da sessão (`clearSession`/`updateStoredUser`).
 */

import { apiFetch } from "./client";
import { clearSession, setSession, updateStoredUser } from "./session";
import type {
  AuthResponse,
  ChangePasswordInput,
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  ProfileInput,
  ResetPasswordInput,
  SignupInput,
  User,
} from "../types/user";

/**
 * Descrição:
 *   Cria uma conta (`POST /auth/signup/`) e inicia a sessão com o token e o
 *   usuário retornados.
 *
 * Objetivo:
 *   Registrar um novo usuário e deixá-lo imediatamente autenticado.
 *
 * Parâmetros:
 *   - data: dados de cadastro (`SignupInput`).
 *
 * Assertivas de entrada:
 *   - `data` contém os campos obrigatórios de cadastro válidos.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, a sessão é iniciada (`setSession`) e `isLoggedIn()`
 *     passa a retornar `true`;
 *   - em caso de falha, lança `ApiError` e a sessão não é alterada.
 *
 * Retorno:
 *   - `Promise<AuthResponse>` com o token e o usuário criado.
 */
export async function signup(data: SignupInput): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>(
    "/auth/signup/",
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  setSession(response.token, response.user);
  return response;
}

/**
 * Descrição:
 *   Autentica por nome e senha (`POST /auth/login/`) e inicia a sessão com o
 *   token e o usuário retornados.
 *
 * Objetivo:
 *   Realizar o login e persistir a sessão localmente.
 *
 * Parâmetros:
 *   - data: credenciais de acesso (`LoginInput`).
 *
 * Assertivas de entrada:
 *   - `data` contém nome e senha não vazios.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, a sessão é iniciada (`setSession`) e `isLoggedIn()`
 *     passa a retornar `true`;
 *   - em caso de credenciais inválidas, lança `ApiError` e a sessão não é
 *     alterada.
 *
 * Retorno:
 *   - `Promise<AuthResponse>` com o token e o usuário autenticado.
 */
export async function login(data: LoginInput): Promise<AuthResponse> {
  const response = await apiFetch<AuthResponse>(
    "/auth/login/", 
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );

  setSession(response.token, response.user);
  return response;
}

/**
 * Descrição:
 *   Encerra a sessão no backend (`POST /auth/logout/`) e limpa a sessão local.
 *
 * Objetivo:
 *   Realizar o logout garantindo que os dados locais sejam removidos mesmo se
 *   a chamada ao backend falhar.
 *
 * Assertivas de entrada:
 *   - há (ou houve) uma sessão ativa cujo token será invalidado.
 *
 * Assertivas de saída:
 *   - a sessão local é sempre encerrada (`clearSession`), independentemente do
 *     sucesso da requisição, pois é executada no bloco `finally`;
 *   - após a chamada, `isLoggedIn()` retorna `false`.
 *
 * Retorno:
 *   - `Promise<void>`.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>(
      "/auth/logout/", 
      { method: "POST", }
    );
  } finally {
    clearSession();
  }
}

/**
 * Descrição:
 *   Busca o usuário logado a partir do token (`GET /auth/me/`) e atualiza o
 *   usuário armazenado localmente.
 *
 * Objetivo:
 *   Validar a sessão atual e obter os dados mais recentes do usuário, sem
 *   propagar erro caso o token seja inválido/expirado.
 *
 * Assertivas de entrada:
 *   - há um token armazenado a ser enviado pelo cliente HTTP.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, o usuário local é atualizado (`updateStoredUser`) e
 *     retornado;
 *   - em caso de falha, o erro é registrado em log e retorna `null` (não
 *     lança exceção).
 *
 * Retorno:
 *   - `Promise<User | null>` com o usuário corrente, ou `null` em caso de erro.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await apiFetch<User>(
      "/auth/me/", 
      { method: "GET", }
    );

    updateStoredUser(user);
    return user;
  } catch (error) {
    console.error("Falha ao buscar o usuário atual:", error);
    return null;
  }
}

/**
 * Descrição:
 *   Atualiza o perfil do usuário logado (`PATCH /auth/me/`) e sincroniza o
 *   usuário armazenado localmente.
 *
 * Objetivo:
 *   Alterar nome e, quando permitido, a permissão do usuário, mantendo a
 *   sessão local atualizada.
 *
 * Parâmetros:
 *   - data: campos do perfil a atualizar (`ProfileInput`).
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa;
 *   - `data` contém os campos de perfil válidos.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, o usuário local é atualizado (`updateStoredUser`);
 *   - em caso de falha, lança `ApiError` e a sessão não é alterada.
 *
 * Retorno:
 *   - `Promise<User>` com o usuário atualizado.
 */
export async function updateProfile(data: ProfileInput): Promise<User> {
  const user = await apiFetch<User>(
    "/auth/me/", 
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );

  updateStoredUser(user);
  return user;
}

/**
 * Descrição:
 *   Exclui a conta do usuário logado (`DELETE /auth/me/`) e limpa a sessão
 *   local.
 *
 * Objetivo:
 *   Permitir que o usuário autenticado apague a própria conta, garantindo que
 *   nenhum dado de sessão permaneça armazenado após a exclusão.
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa cujo token será invalidado.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, a conta é removida no backend e a sessão local é
 *     encerrada (`clearSession`), passando `isLoggedIn()` a retornar `false`;
 *   - em caso de falha, lança `ApiError` e a sessão não é alterada.
 *
 * Retorno:
 *   - `Promise<void>`.
 */
export async function deleteAccount(): Promise<void> {
  await apiFetch<void>(
    "/auth/me/",
    { method: "DELETE" }
  );

  clearSession();
}

/**
 * Descrição:
 *   Troca a senha do usuário logado (`POST /auth/change-password/`).
 *
 * Objetivo:
 *   Permitir que o usuário autenticado altere sua própria senha.
 *
 * Parâmetros:
 *   - data: senha atual e nova senha (`ChangePasswordInput`).
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa;
 *   - `data` contém a senha atual e a nova senha válidas.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, a senha é alterada no backend;
 *   - em caso de falha (ex.: senha atual incorreta), lança `ApiError`.
 *
 * Retorno:
 *   - `Promise<{ detail: string }>` com a mensagem de confirmação.
 */
export function changePassword(data: ChangePasswordInput,): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>(
    "/auth/change-password/", 
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Descrição:
 *   Solicita a recuperação de senha (`POST /auth/forgot-password/`), gerando um
 *   token de redefinição.
 *
 * Objetivo:
 *   Iniciar o fluxo de "esqueci minha senha" para um usuário não autenticado.
 *
 * Parâmetros:
 *   - data: email cadastrado do usuário (`ForgotPasswordInput`).
 *
 * Assertivas de entrada:
 *   - `data.email` é um email cadastrado válido.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, o backend gera o token de recuperação;
 *   - em caso de falha, lança `ApiError`.
 *
 * Retorno:
 *   - `Promise<ForgotPasswordResponse>` com os dados de recuperação.
 */
export function forgotPassword(data: ForgotPasswordInput,): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>(
    "/auth/forgot-password/", 
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Descrição:
 *   Redefine a senha usando o token de recuperação
 *   (`POST /auth/reset-password/`).
 *
 * Objetivo:
 *   Concluir o fluxo de recuperação, definindo a nova senha do usuário.
 *
 * Parâmetros:
 *   - data: token de recuperação e nova senha (`ResetPasswordInput`).
 *
 * Assertivas de entrada:
 *   - `data` contém um token válido e a nova senha.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, a senha é redefinida no backend;
 *   - em caso de token inválido/expirado, lança `ApiError`.
 *
 * Retorno:
 *   - `Promise<{ detail: string }>` com a mensagem de confirmação.
 */
export function resetPassword(data: ResetPasswordInput,): Promise<{ detail: string }> {
  return apiFetch<{ detail: string }>(
    "/auth/reset-password/", 
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

/**
 * Descrição:
 *   Lista todos os usuários do sistema (`GET /users/`).
 *
 * Objetivo:
 *   Obter os usuários disponíveis, ex.: para atribuir responsáveis a tarefas.
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa com permissão para listar usuários.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, retorna o array de usuários;
 *   - em caso de falha, lança `ApiError`.
 *
 * Retorno:
 *   - `Promise<User[]>` com a lista de usuários.
 */
export function listUsers(): Promise<User[]> {
  return apiFetch<User[]>(
    "/users/", 
    { method: "GET", }
  );
}

/**
 * Descrição:
 *   Detalha um usuário pelo id (`GET /users/<id>/`).
 *
 * Objetivo:
 *   Obter os dados de um usuário específico.
 *
 * Parâmetros:
 *   - id: identificador numérico do usuário.
 *
 * Assertivas de entrada:
 *   - há uma sessão ativa;
 *   - `id` corresponde a um usuário existente.
 *
 * Assertivas de saída:
 *   - em caso de sucesso, retorna o usuário correspondente;
 *   - se o usuário não existir ou faltar permissão, lança `ApiError`.
 *
 * Retorno:
 *   - `Promise<User>` com o usuário solicitado.
 */
export function getUser(id: number): Promise<User> {
  return apiFetch<User>(
    `/users/${id}/`, 
    { method: "GET", } 
  );
}
