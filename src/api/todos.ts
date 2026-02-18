import type { HttpClient } from '../core/http-client.js';
import type { TodoItem } from '../types/index.js';

export class TodosApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  async getTodos(): Promise<TodoItem[]> {
    const data = await this.httpClient.getJson<{ todo_list: TodoItem[] }>(
      `${this.baseUrl}/api/todos`,
    );
    return data.todo_list;
  }
}
