import type { HttpClient } from '../core/http-client.js';
import type { Course, Semester, AcademicYear } from '../types/index.js';

export class CoursesApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /** 我的所有課程（可用 conditions 篩選） */
  async getMyCourses(conditions?: Record<string, unknown>): Promise<Course[]> {
    let url = `${this.baseUrl}/api/my-courses`;
    if (conditions && Object.keys(conditions).length > 0) {
      url += `?conditions=${encodeURIComponent(JSON.stringify(conditions))}`;
    }
    const data = await this.httpClient.getJson<{ courses: Course[] }>(url);
    return data.courses;
  }

  /** 當前進行中的課程 */
  async getActiveCourses(): Promise<Course[]> {
    return this.getMyCourses({ status: 'ongoing' });
  }

  /** 最近瀏覽的課程 */
  async getRecentCourses(): Promise<Course[]> {
    const data = await this.httpClient.getJson<{ visited_courses: Course[] }>(
      `${this.baseUrl}/api/user/recently-visited-courses`,
    );
    return data.visited_courses;
  }

  /** 單一課程資訊 */
  async getCourseById(courseId: number): Promise<Course> {
    const data = await this.httpClient.getJson<Course>(
      `${this.baseUrl}/api/courses/${courseId}`,
    );
    return data;
  }

  /** 課程模組/章節 */
  async getCourseModules(courseId: number): Promise<unknown[]> {
    const data = await this.httpClient.getJson<{ modules: unknown[] }>(
      `${this.baseUrl}/api/courses/${courseId}/modules`,
    );
    return data.modules ?? [];
  }

  /** 我的學期 */
  async getMySemesters(): Promise<Semester[]> {
    const data = await this.httpClient.getJson<{ semesters: Semester[] }>(
      `${this.baseUrl}/api/my-semesters`,
    );
    return data.semesters;
  }

  /** 我的學年 */
  async getMyAcademicYears(): Promise<AcademicYear[]> {
    const data = await this.httpClient.getJson<{ academic_years: AcademicYear[] }>(
      `${this.baseUrl}/api/my-academic-years`,
    );
    return data.academic_years;
  }
}
