import type { HttpClient } from '../core/http-client.js';
import type { CourseGrade } from '../types/index.js';

export class GradesApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  async getCourseGrades(courseId: number): Promise<CourseGrade> {
    const data = await this.httpClient.getJson<CourseGrade>(
      `${this.baseUrl}/api/courses/${courseId}/grade`,
    );
    return data;
  }
}
