import type { HttpClient } from '../core/http-client.js';
import type { Rollcall, RollcallSubmitResult } from '../types/index.js';

export class AttendanceApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /**
   * 取得所有正在進行中的簽到 (包含各課程)
   */
  async getActiveRollcalls(): Promise<Rollcall[]> {
    const data = await this.httpClient.getJson<{ rollcalls: Rollcall[] }>(
      `${this.baseUrl}/api/radar/rollcalls?api_version=1.1.0`,
    );
    return data.rollcalls ?? [];
  }

  /**
   * 提交數字雷達簽到 (PIN 碼)
   * @param rollcallId 簽到活動的 ID
   * @param numberCode 教師給的四位數密碼
   */
  async submitNumberRollcall(rollcallId: number, numberCode: string): Promise<RollcallSubmitResult> {
    const response = await this.httpClient.request(
      `${this.baseUrl}/api/rollcall/${rollcallId}/answer_number_rollcall`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numberCode }),
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
}
