import type { TronClass } from '../index.js';
import type {
  DashboardData,
  CourseOverview,
  DeadlineItem,
  AnnouncementSummary,
  CourseGradeSummary,
} from './adapter-types.js';

export class TronClassService {
  constructor(private tc: TronClass) {}

  async getDashboard(): Promise<DashboardData> {
    const [activeCourses, activeRollcalls, recentTodos, recentAnnouncements] = await Promise.all([
      this.tc.courses.getActiveCourses().catch(() => []),
      this.tc.attendance.getActiveRollcalls().catch(() => []),
      this.tc.todos.getTodos().catch(() => []),
      this.tc.announcements.getLatestBulletins().catch(() => []),
    ]);

    return {
      activeCourses,
      activeRollcalls,
      recentTodos,
      recentAnnouncements,
    };
  }

  async getCourseOverview(courseId: number): Promise<CourseOverview> {
    const [course, assignments, materials, announcements] = await Promise.all([
      this.tc.courses.getCourseById(courseId).catch(() => null),
      this.tc.assignments.getHomeworkActivities(courseId).catch(() => []),
      this.tc.materials.getCourseMaterials(courseId).catch(() => []),
      this.tc.announcements.getCourseAnnouncements(courseId).catch(() => []),
    ]);

    if (!course) {
      throw new Error(`Course not found: ${courseId}`);
    }

    return {
      course,
      assignments,
      materials,
      announcements,
    };
  }

  async getUpcomingDeadlines(days: number = 7): Promise<DeadlineItem[]> {
    const todos = await this.tc.todos.getTodos().catch(() => []);
    const courses = await this.tc.courses.getActiveCourses().catch(() => []);
    
    const deadlines: DeadlineItem[] = [];
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() + days);

    for (const todo of todos) {
      if (todo.due_at) {
        const dueDate = new Date(todo.due_at);
        if (dueDate >= now && dueDate <= cutoffDate) {
          deadlines.push({
            courseName: todo.course_name || 'System',
            title: todo.title,
            dueAt: todo.due_at,
            type: 'todo',
          });
        }
      }
    }

    await Promise.all(
      courses.map(async (course) => {
        const assignments = await this.tc.assignments.getHomeworkActivities(course.id).catch(() => []);
        for (const assign of assignments) {
          if (assign.due_at) {
            const dueDate = new Date(assign.due_at);
            if (dueDate >= now && dueDate <= cutoffDate) {
              deadlines.push({
                courseName: course.name,
                title: assign.title,
                dueAt: assign.due_at,
                type: 'assignment',
              });
            }
          }
        }
      })
    );

    deadlines.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
    return deadlines;
  }

  async getAnnouncementSummaries(limit: number = 5): Promise<AnnouncementSummary[]> {
    const announcements = await this.tc.announcements.getLatestBulletins().catch(() => []);
    
    return announcements.slice(0, limit).map(ann => ({
      courseName: ann.course_name,
      title: ann.title,
      author: ann.author,
      createdAt: ann.created_at,
    }));
  }

  async getCourseGradeSummary(courseId: number): Promise<CourseGradeSummary> {
    const gradeData = await this.tc.grades.getCourseGrades(courseId).catch(() => null);
    
    if (!gradeData) {
      throw new Error(`Grade data not available for course: ${courseId}`);
    }

    return {
      courseName: gradeData.course_name,
      totalScore: gradeData.total_score,
      gradeItems: (gradeData.grade_items || []).map(item => ({
        title: item.title,
        score: item.score,
        maxScore: item.max_score,
        weight: item.weight,
      })),
    };
  }
}
