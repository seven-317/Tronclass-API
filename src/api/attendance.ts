import type { HttpClient } from '../core/http-client.js';
import type { Rollcall, RollcallSubmitResult } from '../types/index.js';

/**
 * Training Activity structure from /api/training/activities endpoint
 */
interface Activity {
  id: number;
  type: number;
  status: number;
  allow_checkin: boolean;
  course_id?: number;
  course_title?: string;
  created_by_name?: string;
  source?: string;
  created_at?: string;
  start_time?: string;
  option?: {
    answer?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class AttendanceApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /**
   * 取得特定課程的點名任務列表 (包含手動、數字等，這裡抓得到 number_code)
   */
  async getCourseRollcalls(courseId: number): Promise<Rollcall[]> {
    const data = await this.httpClient.getJson<{ rollcalls: Rollcall[] }>(
      `${this.baseUrl}/api/course/${courseId}/rollcalls`,
    );
    return data.rollcalls ?? [];
  }

  /**
   * 取得特定課程的學生個人出缺席紀錄
   */
  async getStudentRollcalls(courseId: number): Promise<unknown[]> {
    // 根據你截圖的 students_rollcalls API 實作
    const data = await this.httpClient.getJson<{ students: unknown[] }>(
      `${this.baseUrl}/api/course/${courseId}/students_rollcalls`,
    );
    return data.students ?? [];
  }

  /**
   * 送出數字點名 PIN 碼
   */
  async submitNumberRollcall(rollcallId: number, numberCode: string): Promise<RollcallSubmitResult> {
    const response = await this.httpClient.request(
      `${this.baseUrl}/api/rollcall/${rollcallId}/answer_number_rollcall`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // ⚠️ 重要：官方 API 接收的欄位名稱通常是 snake_case
        body: JSON.stringify({ number_code: numberCode }), 
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Failed to submit rollcall: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    return response.json() as Promise<RollcallSubmitResult>;
  }

  /**
   * 取得雷達簽到任務
   * 
   * 注意：此方法會掃描所有課程的活動，以維持原有的「全域掃描」行為
   */
  async getActiveRollcalls(): Promise<Rollcall[]> {
    // Step 1: Get all courses for the user
    const coursesData = await this.httpClient.getJson<{ courses: Array<{ id: number }> }>(
      `${this.baseUrl}/api/my-courses`,
    );
    const courses = coursesData.courses ?? [];
    
    // Step 2: Fetch activities for all courses in parallel
    const activitiesPromises = courses.map(async (course) => {
      try {
        const data = await this.httpClient.getJson<{ activities: Activity[] }>(
          `${this.baseUrl}/api/training/activities?course_id=${course.id}`,
        );
        return data.activities ?? [];
      } catch (error) {
        // If a course fails, log and continue with other courses
        console.warn(`Failed to fetch activities for course ${course.id}:`, error);
        return [];
      }
    });
    
    const allActivitiesArrays = await Promise.all(activitiesPromises);
    
    // Step 3: Flatten all activities from all courses
    const allActivities = allActivitiesArrays.flat();
    
    // Step 4: Filter for active attendance activities
    const attendanceActivities = allActivities.filter(
      (activity) => 
        activity.type === 16 &&           // Attendance type
        activity.status === 1 &&          // Active status
        activity.allow_checkin === true   // Check-in allowed
    );
    
    // Step 5: Map activities to Rollcall structure with number_code extraction
    return attendanceActivities.map((activity) => {
      const { type, allow_checkin, option, ...rest } = activity;
      return {
        ...rest,
        is_number: true,
        number_code: option?.answer ?? undefined,  // Extract from option.answer
        status: activity.status === 1 ? "on_call" : "ended",
        rollcall_time: activity.created_at ?? activity.start_time ?? new Date().toISOString(),
      };
    });
  }
}