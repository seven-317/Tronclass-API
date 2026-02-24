export interface SchoolConfig {
  name: string;
  baseUrl: string;
  casUrl?: string;
  hasCaptcha?: boolean;
}

export interface LoginOptions {
  username: string;
  password: string;
  ocrFunction?: (dataUrl: string) => Promise<string>;
}

export interface LoginResponse {
  success: boolean;
  message: string;
}

export interface Course {
  id: number;
  name: string;
  course_code?: string;
  department?: string;
  semester?: string;
  instructor?: string;
  cover_image?: string;
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

export interface TodoItem {
  id: number;
  title: string;
  course_id?: number;
  course_name?: string;
  type?: string;
  due_at?: string;
  status?: string;
  [key: string]: unknown;
}

export interface TodoList {
  todo_list: TodoItem[];
  [key: string]: unknown;
}

export interface HomeworkActivity {
  id: number;
  title: string;
  course_id?: number;
  description?: string;
  due_at?: string;
  score?: number;
  max_score?: number;
  status?: string;
  type?: string;
  [key: string]: unknown;
}

export interface HomeworkDetail extends HomeworkActivity {
  content?: string;
  attachments?: MaterialFile[];
  submissions?: HomeworkSubmission[];
}

export interface HomeworkSubmission {
  id: number;
  status?: string;
  submitted_at?: string;
  score?: number;
  feedback?: string;
  attachments?: MaterialFile[];
  [key: string]: unknown;
}

export interface CourseMaterial {
  id: number;
  title: string;
  type?: string;
  description?: string;
  created_at?: string;
  files?: MaterialFile[];
  [key: string]: unknown;
}

export interface MaterialFile {
  id: number;
  name: string;
  url?: string;
  size?: number;
  mime_type?: string;
  [key: string]: unknown;
}

export interface GradeItem {
  id: number;
  title: string;
  score?: number;
  max_score?: number;
  weight?: number;
  type?: string;
  [key: string]: unknown;
}

export interface CourseGrade {
  course_id: number;
  course_name?: string;
  total_score?: number;
  grade_items?: GradeItem[];
  [key: string]: unknown;
}

export interface Announcement {
  id: number;
  title: string;
  content?: string;
  author?: string;
  course_id?: number;
  course_name?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: number;
  title: string;
  content?: string;
  type?: string;
  read?: boolean;
  created_at?: string;
  [key: string]: unknown;
}

export interface Rollcall {
  rollcall_id: number;
  course_id?: number;
  course_title?: string;
  created_by_name?: string;
  is_number?: boolean;
  status: string; // e.g., "on_call", "ended"
  source?: string;
  [key: string]: unknown;
}

export interface RollcallSubmitResult {
  status: string;
  [key: string]: unknown;
}

export interface Semester {
  id: number;
  name: string;
  academic_year_id: number;
  is_active: boolean;
  [key: string]: unknown;
}

export interface AcademicYear {
  id: number;
  name: string;
  is_active: boolean;
  sort?: number;
  [key: string]: unknown;
}
