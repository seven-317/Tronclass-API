import type { HttpClient } from '../core/http-client.js';
import type { HomeworkActivity, HomeworkDetail } from '../types/index.js';

export class AssignmentsApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  async getHomeworkActivities(courseId: number): Promise<HomeworkActivity[]> {
    const data = await this.httpClient.getJson<{ homework_activities: HomeworkActivity[] }>(
      `${this.baseUrl}/api/courses/${courseId}/homework-activities`,
    );
    return data.homework_activities;
  }

  async getHomeworkDetail(courseId: number, activityId: number): Promise<HomeworkDetail> {
    const data = await this.httpClient.getJson<HomeworkDetail>(
      `${this.baseUrl}/api/courses/${courseId}/homework-activities/${activityId}`,
    );
    return data;
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
