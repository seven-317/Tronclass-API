import type {
  Course,
  TodoItem,
  Announcement,
  HomeworkActivity,
  CourseMaterial,
  CourseGrade,
  GradeItem,
  Notification,
} from '../types/index.js';

export interface DashboardData {
  courses: Course[];
  todos: TodoItem[];
  announcements: Announcement[];
}

export interface CourseOverviewData {
  course: Course;
  assignments: HomeworkActivity[];
  materials: CourseMaterial[];
}

export interface DeadlineItem {
  title: string;
  courseName?: string;
  courseId?: number;
  dueAt?: string;
  type: 'todo' | 'assignment';
  status?: string;
}

export interface AnnouncementSummary {
  id: number;
  title: string;
  author?: string;
  courseName?: string;
  createdAt?: string;
  preview?: string;
}

export interface GradeSummaryData {
  courseId: number;
  courseName?: string;
  totalScore?: number;
  items: GradeItem[];
}

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedFooter {
  text: string;
  icon_url?: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: DiscordEmbedFooter;
  timestamp?: string;
  url?: string;
}

export interface LineFlexText {
  type: 'text';
  text: string;
  size?: string;
  weight?: string;
  color?: string;
  wrap?: boolean;
  margin?: string;
  flex?: number;
}

export interface LineFlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: LineFlexComponent[];
  margin?: string;
  spacing?: string;
  paddingAll?: string;
  backgroundColor?: string;
  cornerRadius?: string;
}

export interface LineFlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

export type LineFlexComponent = LineFlexText | LineFlexBox | LineFlexSeparator;

export interface LineFlexBubble {
  type: 'bubble';
  size?: string;
  header?: LineFlexBox;
  body?: LineFlexBox;
  footer?: LineFlexBox;
}

export interface LineFlexCarousel {
  type: 'carousel';
  contents: LineFlexBubble[];
}

export interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: LineFlexBubble | LineFlexCarousel;
}
