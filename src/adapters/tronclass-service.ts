import type { TronClass } from '../index.js';
import type {
  DashboardData,
  CourseOverviewData,
  DeadlineItem,
  AnnouncementSummary,
  GradeSummaryData,
} from './adapter-types.js';

export class TronClassService {
  constructor(private tc: TronClass) {}

  async getDashboard(): Promise<DashboardData> {
    const [courses, todos, announcements] = await Promise.all([
      this.tc.courses.getMyCourses(),
      this.tc.todos.getTodos(),
      this.tc.announcements.getAnnouncements(),
    ]);
    return { courses, todos, announcements };
  }

  async getCourseOverview(courseId: number): Promise<CourseOverviewData> {
    const [course, assignments, materials] = await Promise.all([
      this.tc.courses.getCourseById(courseId),
      this.tc.assignments.getHomeworkActivities(courseId),
      this.tc.materials.getCourseMaterials(courseId),
    ]);
    return { course, assignments, materials };
  }

  async getUpcomingDeadlines(days: number = 7): Promise<DeadlineItem[]> {
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const todos = await this.tc.todos.getTodos();

    const deadlines: DeadlineItem[] = todos
      .filter((todo) => {
        if (!todo.due_at) return true;
        const due = new Date(todo.due_at);
        return due >= now && due <= cutoff;
      })
      .map((todo) => ({
        title: todo.title,
        courseName: todo.course_name,
        courseId: todo.course_id,
        dueAt: todo.due_at,
        type: 'todo' as const,
        status: todo.status,
      }));

    deadlines.sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

    return deadlines;
  }

  async getAnnouncementSummaries(limit: number = 10): Promise<AnnouncementSummary[]> {
    const announcements = await this.tc.announcements.getAnnouncements();

    return announcements.slice(0, limit).map((ann) => ({
      id: ann.id,
      title: ann.title,
      author: ann.author,
      courseName: ann.course_name,
      createdAt: ann.created_at,
      preview: ann.content
        ? ann.content.replace(/<[^>]*>/g, '').slice(0, 100)
        : undefined,
    }));
  }

  async getCourseGradeSummary(courseId: number): Promise<GradeSummaryData> {
    const grade = await this.tc.grades.getCourseGrades(courseId);

    return {
      courseId: grade.course_id,
      courseName: grade.course_name,
      totalScore: grade.total_score,
      items: grade.grade_items ?? [],
    };
  }
}
