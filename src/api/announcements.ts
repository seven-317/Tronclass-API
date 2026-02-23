import type { HttpClient } from '../core/http-client.js';
import type { Announcement, Notification } from '../types/index.js';

export class AnnouncementsApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  async getAnnouncements(page: number = 1, perPage: number = 20): Promise<Announcement[]> {
    const data = await this.httpClient.getJson<{ bulletins: Announcement[] }>(
      `${this.baseUrl}/api/org-bulletin/bulletins?page=${page}&per_page=${perPage}`,
    );
    return data.bulletins ?? [];
  }

  async getCourseAnnouncements(courseId: number): Promise<Announcement[]> {
    const data = await this.httpClient.getJson<{ bulletins: Announcement[] }>(
      `${this.baseUrl}/api/courses/${courseId}/bulletins`,
    );
    return data.bulletins ?? [];
  }

  async getNotifications(page: number = 1, perPage: number = 20): Promise<Notification[]> {
    const data = await this.httpClient.getJson<{ notifications: Notification[] }>(
      `${this.baseUrl}/api/user/notifications?page=${page}&per_page=${perPage}`,
    );
    return data.notifications ?? [];
  }
}
