# TronClass API(Currently Developing)

> Unofficial Node.js / TypeScript client for the [TronClass](https://www.tronclass.com/) Learning Management System.

Authenticate via CAS SSO (with optional captcha OCR), then query courses, todos, assignments, materials, grades, and announcements — all through a single, typed API.

## Features

- 🔐 **CAS SSO Authentication** — automated login flow with CSRF handling and optional captcha support
- 📚 **Full API Coverage** — courses, todos, assignments, materials, grades, announcements
- 🏫 **Multi-School Support** — preconfigured or custom school instances
- ⚡ **Rate Limiting** — built-in, configurable request throttling (RPM)
- � **Auto Retry** — automatic retries with session re-authentication
- 🍪 **Cookie Jar** — persistent session via `tough-cookie` + `fetch-cookie`
- 🛡️ **Typed Errors** — `RateLimitError`, `AuthenticationError`, `NetworkError`, `ApiError`

## Installation

Since this package is currently in development and not yet published to npm, you can install it directly from GitHub or clone it for local development.

> **Note:** This package is ESM-only and requires Node.js 18+.

## Quick Start

### 1. Configure Environment Variables

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

```env
TRON_USER=your_student_id
TRON_PASS=your_password
TRON_SCHOOL=EXAMPLE_UNIVERSITY
```

### 2. Use the Library

```ts
import { TronClass, Schools } from 'tronclass-api';

const tc = new TronClass(Schools.ASIA_UNIVERSITY);

await tc.login({ username: 'your_id', password: 'your_pass' });

// Fetch courses
const courses = await tc.courses.getMyCourses();
console.log(courses);

// Fetch todos
const todos = await tc.todos.getTodos();
console.log(todos);
```

### Using a Custom School

If your school isn't preconfigured, pass a URL string or a `SchoolConfig` object:

```ts
import { TronClass, createSchoolConfig } from 'tronclass-api';

// Option 1: URL string
const tc = new TronClass('https://tronclass.your-school.edu');

// Option 2: Full config
const tc2 = new TronClass(
  createSchoolConfig({
    name: 'My University',
    baseUrl: 'https://tronclass.your-school.edu.tw',
    hasCaptcha: true,
  })
);
```

## API Reference

### `new TronClass(config, options?)`

| Parameter | Type | Description |
|---|---|---|
| `config` | `SchoolConfig \| string` | A preconfigured school or a base URL string |
| `options.maxRetries` | `number` | Max retry attempts (default: `3`) |
| `options.rpm` | `number` | Requests per minute limit (default: `60`) |

### Authentication

| Method | Returns | Description |
|---|---|---|
| `tc.login({ username, password, ocrFunction? })` | `Promise<LoginResponse>` | Log in via CAS SSO. Provide `ocrFunction` if captcha is required. |
| `tc.isLoggedIn` | `boolean` | Whether the session is active |

### API Modules

| Module | Method | Description |
|---|---|---|
| `tc.courses` | `.getMyCourses()` | List enrolled courses |
| `tc.todos` | `.getTodos()` | List pending todo items |
| `tc.assignments` | `.getAssignments(courseId)` | List assignments for a course |
| `tc.assignments` | `.getAssignmentDetail(courseId, activityId)` | Get assignment details |
| `tc.materials` | `.getMaterials(courseId)` | List course materials |
| `tc.materials` | `.downloadFile(file, destPath)` | Download a material file |
| `tc.grades` | `.getGrades(courseId)` | Get grades for a course |
| `tc.announcements` | `.getAnnouncements()` | List announcements |

### Generic Requests

For endpoints not covered by the built-in modules:

```ts
// Raw Response
const res = await tc.call('/api/some/endpoint');

// Parsed JSON
const data = await tc.callJson<MyType>('/api/some/endpoint');
```

### Rate Limiting

```ts
// Read current limit
console.log(tc.rpm); // 60

// Adjust at runtime
tc.rpm = 120;
```

## Error Handling

All errors extend `TronClassError`:

```ts
import { RateLimitError, AuthenticationError, NetworkError, ApiError } from 'tronclass-api';

try {
  await tc.courses.getMyCourses();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Wait ${error.waitTime}ms before retrying`);
  } else if (error instanceof AuthenticationError) {
    console.log('Session expired, re-login needed');
  } else if (error instanceof ApiError) {
    console.log(`API error ${error.statusCode}: ${error.responseBody}`);
  }
}
```

## Captcha Support

Some schools require a captcha during login. Provide an OCR function to handle it:

```ts
await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: async (dataUrl: string) => {
    // dataUrl is a base64-encoded image (e.g. "data:image/jpeg;base64,...")
    // Use any OCR service to solve it and return the text
    return solveCaptcha(dataUrl);
  },
});
```

## Available Schools

| Key | Name |
|---|---|
| `ASIA_UNIVERSITY` | 亞洲大學 |

> **Adding a new school?** Use `createSchoolConfig()` or submit a PR to `src/config/schools.ts`.

## Running the Example

```bash
cp .env.example .env
# Edit .env with your credentials

npm run example
```

## Project Structure

```
src/
├── index.ts            # Main TronClass class & exports
├── auth/
│   └── cas-auth.ts     # CAS SSO authentication
├── api/
│   ├── courses.ts      # Courses API
│   ├── todos.ts        # Todos API
│   ├── assignments.ts  # Assignments API
│   ├── materials.ts    # Materials API
│   ├── grades.ts       # Grades API
│   └── announcements.ts# Announcements API
├── core/
│   ├── http-client.ts  # HTTP client with cookie jar & rate limiter
│   └── errors.ts       # Error classes
├── config/
│   └── schools.ts      # Preconfigured school definitions
└── types/
    └── index.ts        # TypeScript interfaces
```

## License

[MIT](LICENSE)
If you use this code in a commercial project, I would be very grateful if you could credit the source or send me a message to let me know!
