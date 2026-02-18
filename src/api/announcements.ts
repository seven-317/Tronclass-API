import type { HttpClient } from '../core/http-client.js';
import type { Announcement, Notification } from '../types/index.js';

export class AnnouncementsApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  async getAnnouncements(): Promise<Announcement[]> {
    const data = await this.httpClient.getJson<{ announcements: Announcement[] }>(
      `${this.baseUrl}/api/announcements`,
    );
    return data.announcements;
  }

  async getCourseAnnouncements(courseId: number): Promise<Announcement[]> {
    const data = await this.httpClient.getJson<{ announcements: Announcement[] }>(
      `${this.baseUrl}/api/courses/${courseId}/announcements`,
    );
    return data.announcements;
  }

  async getNotifications(): Promise<Notification[]> {
    const data = await this.httpClient.getJson<{ notifications: Notification[] }>(
      `${this.baseUrl}/api/notifications`,
    );
    return data.notifications;
  }
}
