import type {
  Course,
  TodoItem,
  Announcement,
  HomeworkActivity,
  CourseMaterial,
  CourseGrade,
} from '../types/index.js';

export interface DashboardData {
  activeCourses: Course[];
  recentTodos: TodoItem[];
  recentAnnouncements: Announcement[];
}

export interface CourseOverview {
  course: Course;
  assignments: HomeworkActivity[];
  materials: CourseMaterial[];
  announcements: Announcement[];
}

export interface DeadlineItem {
  courseName: string;
  title: string;
  dueAt: string;
  type: 'todo' | 'assignment';
  url?: string;
}

export interface AnnouncementSummary {
  courseName?: string;
  title: string;
  author?: string;
  createdAt?: string;
}

export interface CourseGradeSummary {
  courseName?: string;
  totalScore?: number;
  gradeItems: {
    title: string;
    score?: number;
    maxScore?: number;
    weight?: number;
  }[];
}
