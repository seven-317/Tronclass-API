import type { HttpClient } from '../core/http-client.js';
import type { Announcement, Notification } from '../types/index.js';

export class AnnouncementsApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /** 全校公告（機構公告） */
  async getAnnouncements(page: number = 1, pageSize: number = 20): Promise<Announcement[]> {
    const conditions = JSON.stringify({});
    const data = await this.httpClient.getJson<{ bulletins: Announcement[] }>(
      `${this.baseUrl}/api/org-bulletin/bulletins?page=${page}&page_size=${pageSize}&conditions=${encodeURIComponent(conditions)}`,
    );
    return data.bulletins ?? [];
  }

  /** 公告分類 */
  async getClassifications(): Promise<unknown[]> {
    const data = await this.httpClient.getJson<{ classifications: unknown[] }>(
      `${this.baseUrl}/api/org-bulletin/classifications`,
    );
    return data.classifications ?? [];
  }

  /** 最新公告（首頁用） */
  async getLatestBulletins(): Promise<Announcement[]> {
    const data = await this.httpClient.getJson<{ bulletins: Announcement[] }>(
      `${this.baseUrl}/api/bulletins/latest`,
    );
    return data.bulletins ?? [];
  }

  /** 課程公告 */
  async getCourseAnnouncements(courseId: number): Promise<Announcement[]> {
    const data = await this.httpClient.getJson<{ bulletins: Announcement[] }>(
      `${this.baseUrl}/api/courses/${courseId}/bulletins`,
    );
    return data.bulletins ?? [];
  }

  /** 通知/提醒 */
  async getNotifications(): Promise<Notification[]> {
    const data = await this.httpClient.getJson<{ messages: Notification[] }>(
      `${this.baseUrl}/api/alert/messages`,
    );
    return data.messages ?? [];
  }
}
