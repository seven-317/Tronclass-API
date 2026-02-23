import type { HttpClient } from '../core/http-client.js';
import type { CourseMaterial } from '../types/index.js';

export class MaterialsApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /** 課程教材/活動 */
  async getCourseMaterials(courseId: number): Promise<CourseMaterial[]> {
    const data = await this.httpClient.getJson<{ activities: CourseMaterial[] }>(
      `${this.baseUrl}/api/courses/${courseId}/activities?sub_course_id=0`,
    );
    return data.activities;
  }

  async downloadFile(fileUrl: string): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
  }> {
    const url = fileUrl.startsWith('http') ? fileUrl : `${this.baseUrl}${fileUrl}`;
    const response = await this.httpClient.get(url);

    if (!response.ok) {
      throw new Error(
        `Failed to download file: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const disposition = response.headers.get('Content-Disposition');
    let filename = 'download';
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
      if (match) {
        filename = decodeURIComponent(match[1].replace(/"/g, ''));
      }
    }

    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

    return { buffer, filename, contentType };
  }
}
