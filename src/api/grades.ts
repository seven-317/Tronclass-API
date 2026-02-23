import type { HttpClient } from '../core/http-client.js';
import type { CourseGrade } from '../types/index.js';

export class GradesApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /** 課程成績 */
  async getCourseGrades(courseId: number): Promise<CourseGrade> {
    const data = await this.httpClient.getJson<CourseGrade>(
      `${this.baseUrl}/api/courses/${courseId}/exam-scores`,
    );
    return data;
  }

  /** 考試列表 */
  async getExamList(courseId: number): Promise<unknown[]> {
    const data = await this.httpClient.getJson<{ exams: unknown[] }>(
      `${this.baseUrl}/api/courses/${courseId}/exam-list`,
    );
    return data.exams ?? [];
  }
}
