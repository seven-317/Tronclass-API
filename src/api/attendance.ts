import type { HttpClient } from '../core/http-client.js';
import type { Rollcall, RollcallSubmitResult } from '../types/index.js';

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
   * 取得全域雷達簽到任務 (保留你原本的功能，通常用來掃描全校廣播的雷達)
   */
  async getRadarRollcalls(): Promise<Rollcall[]> {
    const data = await this.httpClient.getJson<{ rollcalls: Rollcall[] }>(
      `${this.baseUrl}/api/radar/rollcalls?api_version=1.1.0`,
    );
    return data.rollcalls ?? [];
  }
}