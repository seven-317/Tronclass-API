import { ApiError } from '../core/errors.js';
import type { HttpClient } from '../core/http-client.js';
import type {
  HomeworkActivitiesResponse,
  HomeworkActivity,
  HomeworkDetail,
  PaginationOptions,
} from '../types/index.js';

/** Guard against runaway loops if a tenant returns inconsistent pagination metadata. */
const MAX_HOMEWORK_PAGES = 100;

export class AssignmentsApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /**
   * 列出某課程的作業。
   *
   * 此端點在部分租戶（例如 FJU `elearn2.fju.edu.tw`）有分頁，預設 `page_size=10`，
   * 因此預設會**自動翻完所有頁**並回傳完整清單（GitHub issue #2）。
   * 若只想取單一頁，傳入 `{ page }`（搭配可選的 `pageSize`）。
   */
  async getHomeworkActivities(
    courseId: number,
    opts?: PaginationOptions,
  ): Promise<HomeworkActivity[]> {
    const pageSize = opts?.pageSize ?? 100;

    // 明確指定單頁 → 尊重 caller,只取該頁。
    if (opts?.page !== undefined) {
      const data = await this.fetchHomeworkPage(courseId, opts.page, pageSize);
      return data.homework_activities ?? [];
    }

    // 預設:翻完所有頁,符合「列出所有作業」契約。
    const first = await this.fetchHomeworkPage(courseId, 1, pageSize);
    const all = [...(first.homework_activities ?? [])];

    const totalPages =
      first.pages ??
      (first.total !== undefined && first.page_size
        ? Math.ceil(first.total / first.page_size)
        : 1);

    for (let page = 2; page <= Math.min(totalPages, MAX_HOMEWORK_PAGES); page++) {
      const items = (await this.fetchHomeworkPage(courseId, page, pageSize)).homework_activities ?? [];
      if (items.length === 0) break;
      all.push(...items);
    }

    return all;
  }

  private fetchHomeworkPage(
    courseId: number,
    page: number,
    pageSize: number,
  ): Promise<HomeworkActivitiesResponse> {
    return this.httpClient.getJson<HomeworkActivitiesResponse>(
      `${this.baseUrl}/api/courses/${courseId}/homework-activities?page=${page}&page_size=${pageSize}`,
    );
  }

  async getHomeworkDetail(courseId: number, activityId: number): Promise<HomeworkDetail> {
    const primaryUrl = `${this.baseUrl}/api/courses/${courseId}/homework-activities/${activityId}`;
    const response = await this.httpClient.get(primaryUrl, {
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      return response.json() as Promise<HomeworkDetail>;
    }

    // Tenants such as elearn2.fju.edu.tw do not expose homework detail under the course-scoped URL
    // and return 404, while `/api/activities/{id}` still works (GitHub issue #1).
    if (response.status === 404) {
      return this.httpClient.getJson<HomeworkDetail>(
        `${this.baseUrl}/api/activities/${activityId}`,
      );
    }

    const body = await response.text().catch(() => '');
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  async submitHomework(
    courseId: number,
    activityId: number,
    content: string,
    files?: { name: string; data: Buffer }[],
  ): Promise<unknown> {
    const response = await this.httpClient.request(
      `${this.baseUrl}/api/courses/${courseId}/homework-activities/${activityId}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Failed to submit homework: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    return response.json();
  }
}
