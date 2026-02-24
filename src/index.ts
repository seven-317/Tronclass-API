import { HttpClient } from './core/http-client.js';
import { CasAuth } from './auth/cas-auth.js';
import { CoursesApi } from './api/courses.js';
import { TodosApi } from './api/todos.js';
import { AssignmentsApi } from './api/assignments.js';
import { MaterialsApi } from './api/materials.js';
import { GradesApi } from './api/grades.js';
import { AnnouncementsApi } from './api/announcements.js';
import { AttendanceApi } from './api/attendance.js';
import type { SchoolConfig, LoginOptions, LoginResponse } from './types/index.js';

export class TronClass {
  private httpClient: HttpClient;
  private auth: CasAuth;
  private baseUrl: string;
  private schoolConfig: SchoolConfig;

  public readonly courses: CoursesApi;
  public readonly todos: TodosApi;
  public readonly assignments: AssignmentsApi;
  public readonly materials: MaterialsApi;
  public readonly grades: GradesApi;
  public readonly announcements: AnnouncementsApi;
  public readonly attendance: AttendanceApi;

  constructor(
    config: SchoolConfig | string,
    options?: { maxRetries?: number; rpm?: number },
  ) {
    if (typeof config === 'string') {
      this.schoolConfig = { name: 'Custom', baseUrl: config };
    } else {
      this.schoolConfig = config;
    }

    this.baseUrl = this.schoolConfig.baseUrl.replace(/\/+$/, '');

    const maxRetries = options?.maxRetries ?? 3;
    const rpm = options?.rpm ?? 60;

    this.httpClient = new HttpClient(maxRetries, rpm);
    this.auth = new CasAuth(this.httpClient, this.baseUrl);

    this.courses = new CoursesApi(this.httpClient, this.baseUrl);
    this.todos = new TodosApi(this.httpClient, this.baseUrl);
    this.assignments = new AssignmentsApi(this.httpClient, this.baseUrl);
    this.materials = new MaterialsApi(this.httpClient, this.baseUrl);
    this.grades = new GradesApi(this.httpClient, this.baseUrl);
    this.announcements = new AnnouncementsApi(this.httpClient, this.baseUrl);
    this.attendance = new AttendanceApi(this.httpClient, this.baseUrl);
  }

  get school(): SchoolConfig {
    return this.schoolConfig;
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn;
  }

  set rpm(value: number) {
    this.httpClient.limiter.setMaxRequests(value);
  }

  get rpm(): number {
    return this.httpClient.limiter.getMaxRequests();
  }

  async login(options: LoginOptions): Promise<LoginResponse> {
    return this.auth.login(options);
  }

  async call(endpoint: string, init?: RequestInit): Promise<Response> {
    if (!this.auth.isLoggedIn) {
      await this.auth.reAuthenticate();
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.httpClient.request(url, init);
  }

  async callJson<T = unknown>(endpoint: string, init?: RequestInit): Promise<T> {
    if (!this.auth.isLoggedIn) {
      await this.auth.reAuthenticate();
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    return this.httpClient.getJson<T>(url, init);
  }
}

export { Schools, createSchoolConfig } from './config/schools.js';
export * from './types/index.js';
export {
  TronClassError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ApiError,
} from './core/errors.js';

// ─── Bot Adapters ────────────────────────────────────────────
export { TronClassService } from './adapters/tronclass-service.js';
export { DiscordFormatter } from './adapters/discord-formatter.js';
export { LineFormatter } from './adapters/line-formatter.js';
export * from './adapters/adapter-types.js';

export { solveCaptcha } from './utils/captcha-ocr.js';

export default TronClass;
