/**
 * Tipos do usuário e dos payloads de autenticação/perfil.
 *
 * `User` espelha o serializer de User do backend; os demais tipos descrevem
 * as entradas e respostas das chamadas de autenticação (ver `api/users.ts`).
 */

/**
 * Papéis possíveis (códigos do `TextChoices` do backend). O papel determina o
 * que o usuário pode fazer no CRUD de tarefas (ver `permissions.ts`).
 */
export type Role = "ADMINISTRADOR" | "USUARIO";

/** Usuário do sistema, conforme serializado pelo backend. */
export interface User {
  /** Identificador único, definido pelo backend. */
  readonly id: number;
  /** Nome de usuário. */
  name: string;
  /** Email do usuário; pode ser nulo enquanto não cadastrado. */
  email: string | null;
  /** Papel que define as permissões. */
  role: Role;
  /** Rótulo legível do papel, para exibição. */
  readonly role_display?: string;
  /** Data de criação (ISO 8601), preenchida pelo backend. */
  readonly created_at?: string;
}

/** Resposta de signup/login: token de sessão e usuário autenticado. */
export interface AuthResponse {
  token: string;
  user: User;
}

/** Credenciais enviadas no login. */
export interface LoginInput {
  name: string;
  password: string;
}

/** Dados enviados no cadastro de um novo usuário. */
export interface SignupInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/** Campos editáveis do perfil; todos opcionais (atualização parcial). */
export interface ProfileInput {
  name?: string;
  email?: string;
  role?: Role;
}

/** Dados para troca de senha do usuário logado. */
export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

/** Identificação do usuário para iniciar a recuperação de senha. */
export interface ForgotPasswordInput {
  email: string;
}

/** Resposta da recuperação: mensagem exibida ao usuário. */
export interface ForgotPasswordResponse {
  detail: string;
}

/** Dados para redefinir a senha usando o token de recuperação. */
export interface ResetPasswordInput {
  token: string;
  new_password: string;
}
