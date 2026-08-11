/**
 * Cliente HTTP central. Toda comunicação com o backend passa por aqui.
 *
 * Responsabilidades:
 *  - montar a URL completa a partir da URL base (`VITE_API_URL`);
 *  - enviar/receber JSON;
 *  - anexar o token salvo no localStorage ao header `Authorization`
 *    (`Bearer <token>`), quando houver sessão ativa;
 *  - encerrar a sessão automaticamente ao receber status 401;
 *  - transformar respostas de erro em uma exceção tratável (`ApiError`).
 */

import { clearSession, getToken } from "./session";

const API_URL = import.meta.env.VITE_API_URL;

/** Erro lançado quando o backend responde com status fora da faixa 2xx. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Descrição:
 *   Monta o conjunto de headers HTTP de uma requisição, combinando os headers
 *   padrão do cliente com os headers específicos informados em `options`.
 *
 * Objetivo:
 *   Centralizar a definição do `Content-Type` e a injeção do token de
 *   autenticação (`Authorization: Bearer <token>`) quando houver sessão ativa,
 *   permitindo que cada chamada sobrescreva ou acrescente headers próprios.
 *
 * Parâmetros:
 *   - options: objeto `RequestInit` da requisição. Apenas o campo `headers`
 *     é consultado; quando presente, é mesclado por cima dos headers padrão.
 *
 * Assertivas de entrada:
 *   - `options` é um objeto válido (não nulo);
 *   - `options.headers`, se presente, é compatível com
 *     `Record<string, string>`.
 *
 * Assertivas de saída:
 *   - o objeto retornado sempre contém `Content-Type: application/json`,
 *     salvo se explicitamente sobrescrito por `options.headers`;
 *   - o header `Authorization` está presente se, e somente se, `getToken()`
 *     retornar um token não nulo (e não tiver sido sobrescrito);
 *   - os headers de `options.headers` têm precedência sobre os padrão.
 *
 * Retorno:
 *   - `HeadersInit` com os headers finais a serem enviados na requisição.
 */
function buildHeaders(options: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token !== null) {
    headers.Authorization = `Bearer ${token}`;
  }

  return {
    ...headers,
    ...(options.headers as Record<string, string> | undefined),
  };
}

/**
 * Descrição:
 *   Extrai uma mensagem de erro legível a partir do corpo de uma resposta de
 *   erro do backend, que pode vir como string, objeto com campo `detail` ou
 *   objeto com erros por campo (inclusive listas de mensagens).
 *
 * Objetivo:
 *   Normalizar os diferentes formatos de erro retornados pela API em uma única
 *   string apresentável ao usuário, recorrendo a um texto padrão quando o
 *   corpo não traz informação aproveitável.
 *
 * Parâmetros:
 *   - data: corpo da resposta já desserializado (string, objeto ou `null`);
 *   - fallback: mensagem padrão usada quando nenhuma mensagem pode ser
 *     extraída de `data`.
 *
 * Assertivas de entrada:
 *   - `fallback` é uma string não vazia;
 *   - `data` pode ser de qualquer tipo (`unknown`), inclusive `null`.
 *
 * Assertivas de saída:
 *   - o valor retornado é sempre uma string;
 *   - se `data` for string, ela é retornada como está;
 *   - se `data` for objeto com `detail` string, `detail` é retornado;
 *   - se `data` for objeto com campos, retorna as mensagens no formato
 *     `"campo: valor"` unidas por `" | "`;
 *   - em qualquer outro caso, retorna `fallback`.
 *
 * Retorno:
 *   - `string` com a mensagem de erro mais descritiva disponível.
 */
function extractErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string") {
    return data;
  }

  if (data !== null && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (typeof record.detail === "string") {
      return record.detail;
    }

    const messages = Object.entries(record).flatMap(([fieldName, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => `${fieldName}: ${String(item)}`);
      }

      return [`${fieldName}: ${String(value)}`];
    });

    if (messages.length > 0) {
      return messages.join(" | ");
    }
  }

  return fallback;
}

/**
 * Descrição:
 *   Executa uma requisição HTTP ao backend, anexando os headers padrão e o
 *   token de autenticação, e devolve o corpo da resposta já desserializado.
 *   Em caso de falha, lança um `ApiError` com status e mensagem tratada.
 *
 * Objetivo:
 *   Servir como ponto único de comunicação com a API, encapsulando montagem
 *   de URL, headers, tratamento de erros e encerramento de sessão em 401.
 *
 * Parâmetros:
 *   - path: caminho do endpoint, concatenado à URL base (`VITE_API_URL`).
 *     Deve começar com `/` (ex.: `/tasks`);
 *   - options: opções da requisição (`method`, `body`, `headers`, etc.).
 *     Padrão é um objeto vazio (requisição `GET` sem corpo).
 *
 * Assertivas de entrada:
 *   - `path` é uma string que representa um caminho válido do backend;
 *   - `VITE_API_URL` está definido no ambiente;
 *   - `options`, se informado, é um `RequestInit` válido.
 *
 * Assertivas de saída:
 *   - se a resposta for 2xx: retorna o corpo desserializado como `T`, ou
 *     `undefined` quando o status for 204 (sem conteúdo);
 *   - se a resposta for 401: a sessão é encerrada (`clearSession()`) antes de
 *     lançar o erro;
 *   - se a resposta estiver fora da faixa 2xx: lança `ApiError` contendo o
 *     status, a mensagem extraída e os dados originais do erro.
 *
 * Retorno:
 *   - `Promise<T>` resolvida com o corpo da resposta (ou `undefined` em 204).
 *
 * @throws {ApiError} quando o backend responde com status fora da faixa 2xx.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: buildHeaders(options),
  });

  if (!response.ok) {
    let data: unknown = null;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (response.status === 401) {
      clearSession();
    }

    throw new ApiError(
      response.status,
      extractErrorMessage(
        data,
        `Requisição a ${path} falhou com status ${response.status}.`,
      ),
      data,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}