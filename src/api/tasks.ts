/**
 * Serviço de tarefas: uma função por operação do CRUD de `/tasks/`.
 *
 * As telas chamam estas funções e não precisam saber nada sobre URLs,
 * headers ou JSON — isso fica todo no cliente HTTP.
 */

import { apiFetch } from "./client";
import type { Task, TaskInput } from "../types/task";

/** GET /tasks/ — lista todas as tarefas. */
export function listTasks(): Promise<Task[]> {
  return apiFetch<Task[]>(
    "/tasks/", 
    { method: "GET", }
  );
}

/** GET /tasks/<id>/ — detalha uma tarefa. */
export function getTask(id: number): Promise<Task> {
  return apiFetch<Task>(
    `/tasks/${id}/`, 
    { method: "GET", }
  );
}

/** POST /tasks/ — cria uma tarefa. */
export function createTask(data: TaskInput): Promise<Task> {
  return apiFetch<Task>(
    "/tasks/", 
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );  
}

/** PUT /tasks/<id>/ — substitui todos os campos editáveis. */
export function updateTask(id: number, data: TaskInput): Promise<Task> {
  return apiFetch<Task>(
    `/tasks/${id}/`, 
    {
      method: "PUT",
      body: JSON.stringify(data),
    }
  );
}

/** PATCH /tasks/<id>/ — atualiza apenas os campos enviados. */
export function patchTask(id: number, data: Partial<TaskInput>): Promise<Task> {
  return apiFetch<Task>(
    `/tasks/${id}/`, 
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

/** DELETE /tasks/<id>/ — remove uma tarefa. */
export function deleteTask(id: number): Promise<void> {
  return apiFetch<void>(
    `/tasks/${id}/`, 
    { method: "DELETE" }
  );
}
