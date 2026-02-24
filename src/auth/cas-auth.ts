import { JSDOM } from 'jsdom';
import { HttpClient } from '../core/http-client.js';
import { AuthenticationError } from '../core/errors.js';
import type { LoginOptions, LoginResponse } from '../types/index.js';

const MAX_LOGIN_ATTEMPTS = 5;

export class CasAuth {
  private httpClient: HttpClient;
  private baseUrl: string;
  private loggedIn: boolean = false;
  private savedCredentials?: LoginOptions;

  constructor(httpClient: HttpClient, baseUrl: string) {
    this.httpClient = httpClient;
    this.baseUrl = baseUrl;
  }

  get isLoggedIn(): boolean {
    return this.loggedIn;
  }

  async login(options: LoginOptions): Promise<LoginResponse> {
    const { username, password, ocrFunction } = options;

    if (!username || !password) {
      return { success: false, message: 'Username and password are required.' };
    }

    this.savedCredentials = options;
    this.loggedIn = false;

    for (let attempt = 0; attempt < MAX_LOGIN_ATTEMPTS; attempt++) {
      try {
        const loginPageResponse = await this.httpClient.get(
          `${this.baseUrl}/login?next=/user/index`,
          { redirect: 'follow' },
        );
        const loginPageHtml = await loginPageResponse.text();
        const loginPageUrl = loginPageResponse.url;

        const dom = new JSDOM(loginPageHtml);
        const doc = dom.window.document;

        const form = doc.querySelector('form');
        if (!form) {
          throw new AuthenticationError('Login form not found on page.');
        }

        const actionUrl = this.resolveActionUrl(form.getAttribute('action'), loginPageUrl);

        const isKeycloak = loginPageUrl.includes('/auth/realms/') ||
          !!doc.querySelector('input[name="captchaKey"]');

        let formData: Record<string, string>;

        if (isKeycloak) {
          formData = await this.buildKeycloakForm(doc, username, password, ocrFunction, loginPageUrl);
        } else {
          formData = await this.buildTraditionalCasForm(doc, username, password, ocrFunction, loginPageUrl);
        }

        const loginResponse = await this.httpClient.postForm(actionUrl, formData, {
          redirect: 'manual',
        });

        if (loginResponse.status >= 300 && loginResponse.status < 400) {
          let nextUrl = loginResponse.headers.get('location');
          while (nextUrl) {
            const redirectResponse = await this.httpClient.get(nextUrl, {
              redirect: 'manual',
            });
            if (redirectResponse.status >= 300 && redirectResponse.status < 400) {
              nextUrl = redirectResponse.headers.get('location');
            } else {
              break;
            }
          }

          this.loggedIn = true;
          return { success: true, message: 'Login successful.' };
        }

        const loginResultHtml = await loginResponse.text();

        if (this.isLoginFailure(loginResultHtml)) {
          if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
            continue;
          }
          return { success: false, message: 'Invalid username or password.' };
        }

        if (loginResultHtml.includes('captchaCode') || loginResultHtml.includes('captcha-area')) {
          if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
            continue;
          }
          return { success: false, message: 'Captcha verification failed after multiple attempts.' };
        }

        if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
          continue;
        }
        return { success: false, message: 'Login failed: unexpected response.' };
      } catch (error) {
        if (error instanceof AuthenticationError) {
          return { success: false, message: error.message };
        }

        const errorMessage = error instanceof Error ? error.message : String(error);

        if (attempt < MAX_LOGIN_ATTEMPTS - 1) {
          console.warn(
            `Login attempt ${attempt + 1} failed: ${errorMessage}. Retrying...`,
          );
        } else {
          return {
            success: false,
            message: `Login failed after ${MAX_LOGIN_ATTEMPTS} attempts: ${errorMessage}`,
          };
        }
      }
    }

    return { success: false, message: 'Login failed unexpectedly.' };
  }

  async reAuthenticate(): Promise<void> {
    if (!this.savedCredentials) {
      throw new AuthenticationError(
        'No saved credentials available for re-authentication. Please call login() first.',
      );
    }

    const result = await this.login(this.savedCredentials);
    if (!result.success) {
      throw new AuthenticationError(`Re-authentication failed: ${result.message}`);
    }
  }

  invalidateSession(): void {
    this.loggedIn = false;
  }

  private async buildKeycloakForm(
    doc: Document,
    username: string,
    password: string,
    ocrFunction: ((dataUrl: string) => Promise<string>) | undefined,
    loginPageUrl: string,
  ): Promise<Record<string, string>> {
    const formData: Record<string, string> = {
      username,
      password,
    };

    const hasCaptcha = !!doc.querySelector('.captcha-area') ||
      !!doc.querySelector('input[name="captchaKey"]');

    if (hasCaptcha) {
      if (!ocrFunction) {
        throw new AuthenticationError(
          'Login page requires a captcha but no OCR function was provided.',
        );
      }

      const realm = this.extractRealm(loginPageUrl);
      const keycloakBase = this.extractBaseUrl(loginPageUrl);
      const captchaApiUrl = `${keycloakBase}/auth/realms/${realm}/captcha/code`;

      const captchaResponse = await this.httpClient.get(captchaApiUrl);
      const captchaData = await captchaResponse.json() as { image: string; key: string };

      formData.captchaKey = captchaData.key;
      formData.captchaCode = await ocrFunction(captchaData.image);
    }

    return formData;
  }

  private async buildTraditionalCasForm(
    doc: Document,
    username: string,
    password: string,
    ocrFunction: ((dataUrl: string) => Promise<string>) | undefined,
    loginPageUrl: string,
  ): Promise<Record<string, string>> {
    const ltInput = doc.querySelector('input[name="lt"]') as HTMLInputElement | null;
    const lt = ltInput?.value;

    if (!lt) {
      throw new AuthenticationError(
        'CSRF token (lt) not found on login page. The page structure may have changed.',
      );
    }

    const formData: Record<string, string> = {
      username,
      password,
      lt,
      execution: 'e1s1',
      _eventId: 'submit',
      submit: '登錄',
    };

    const captchaImg = doc.querySelector('img[id*="captcha"], img[src*="captcha"]');
    if (captchaImg) {
      if (!ocrFunction) {
        throw new AuthenticationError(
          'Login page requires a captcha but no OCR function was provided.',
        );
      }

      const casBaseUrl = this.extractBaseUrl(loginPageUrl);
      const captchaUrl = `${casBaseUrl}/cas/captcha.jpg?${Date.now()}`;
      const imgResponse = await this.httpClient.get(captchaUrl);
      const arrayBuffer = await imgResponse.arrayBuffer();
      const imgBuffer = Buffer.from(arrayBuffer);
      const base64Image = imgBuffer.toString('base64');
      const contentType = imgResponse.headers.get('Content-Type') || 'image/jpeg';
      const dataUrl = `data:${contentType};base64,${base64Image}`;

      formData.captcha = await ocrFunction(dataUrl);
    }

    return formData;
  }

  private resolveActionUrl(action: string | null, pageUrl: string): string {
    if (!action) {
      return pageUrl;
    }
    if (action.startsWith('http')) {
      return action;
    }
    try {
      return new URL(action, pageUrl).href;
    } catch {
      const base = this.extractBaseUrl(pageUrl);
      return `${base}${action}`;
    }
  }

  private isLoginFailure(html: string): boolean {
    const failureIndicators = [
      'Authentication failure',
      '密碼錯誤',
      '帳號或密碼錯誤',
      'Invalid username or password',
      'kc-feedback-text',
      'login-error',
      'alert-error',
    ];
    return failureIndicators.some((indicator) => html.includes(indicator));
  }

  private extractBaseUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      const match = url.match(/^(https?:\/\/[^/]+)/);
      return match?.[1] ?? this.baseUrl;
    }
  }

  private extractRealm(url: string): string {
    const match = url.match(/\/auth\/realms\/([^/]+)/);
    if (match) return match[1];
    return 'master';
  }
}
