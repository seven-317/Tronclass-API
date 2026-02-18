import type { HttpClient } from '../core/http-client.js';
import type { Course } from '../types/index.js';

export class CoursesApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  async getMyCourses(): Promise<Course[]> {
    const data = await this.httpClient.getJson<{ courses: Course[] }>(
      `${this.baseUrl}/api/my-courses`,
    );
    return data.courses;
  }

  async getRecentCourses(): Promise<Course[]> {
    const data = await this.httpClient.getJson<Course[]>(
      `${this.baseUrl}/api/user/recently-visited-courses`,
    );
    return data;
  }

  async getCourseById(courseId: number): Promise<Course> {
    const data = await this.httpClient.getJson<Course>(
      `${this.baseUrl}/api/courses/${courseId}`,
    );
    return data;
  }
}
