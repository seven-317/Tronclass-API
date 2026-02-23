# TronClass API (Currently Developing)

> Unofficial Node.js / TypeScript client for the [TronClass](https://www.tronclass.com/) Learning Management System.

Authenticate via Keycloak CAS SSO (with automatic captcha OCR), then query courses, todos, assignments, materials, grades, and announcements — all through a single, typed API.

## Features (Developing)

- 🔐 **Keycloak CAS Authentication** — auto-detect Keycloak vs traditional CAS, automatic captcha OCR via Tesseract.js
- 📚 **Full API Coverage** — courses, todos, assignments, materials, grades, announcements, notifications
- 🏫 **Multi-School Support** — preconfigured or custom school instances
- ⚡ **Rate Limiting** — built-in, configurable request throttling (RPM)
- 🔄 **Auto Retry** — automatic retries with exponential backoff
- 🍪 **Cookie Jar** — persistent session via `tough-cookie` + `fetch-cookie`
- 🛡️ **Typed Errors** — `RateLimitError`, `AuthenticationError`, `NetworkError`, `ApiError`

## Installation

Since this package is currently in development and not yet published to npm, you can install it directly from GitHub or clone it for local development.

> **Note:** This package is ESM-only and requires Node.js 18+.

```bash
git clone https://github.com/seven-317/TronClass-API.git
cd TronClass-API
npm install
```

## Quick Start

### 1. Configure Environment Variables

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
import { TronClass, Schools, solveCaptcha } from 'tronclass-api';

const tc = new TronClass(Schools.EXAMPLE_UNIVERSITY);

// Login with automatic captcha solving
await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: solveCaptcha,
});

// Fetch active (ongoing) courses
const courses = await tc.courses.getActiveCourses();
console.log(courses);

// Fetch todos
const todos = await tc.todos.getTodos();
console.log(todos);

// Fetch announcements
const announcements = await tc.announcements.getAnnouncements();
console.log(announcements);
```

### Using a Custom School

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
| `tc.login({ username, password, ocrFunction? })` | `Promise<LoginResponse>` | Log in via CAS SSO. Provide `ocrFunction` for captcha. |
| `tc.isLoggedIn` | `boolean` | Whether the session is active |

### Courses

| Method | Description |
|---|---|
| `.getMyCourses(conditions?)` | List enrolled courses (all semesters by default) |
| `.getActiveCourses()` | List currently active (ongoing) courses |
| `.getRecentCourses()` | List recently visited courses |
| `.getCourseById(courseId)` | Get a single course |
| `.getCourseModules(courseId)` | Get course modules/sections |
| `.getMySemesters()` | List my semesters |
| `.getMyAcademicYears()` | List my academic years |

### Todos

| Method | Description |
|---|---|
| `.getTodos()` | List pending todo items |

### Assignments

| Method | Description |
|---|---|
| `.getHomeworkActivities(courseId)` | List assignments for a course |
| `.getHomeworkDetail(courseId, activityId)` | Get assignment details |
| `.submitHomework(courseId, activityId, content)` | Submit homework |

### Materials

| Method | Description |
|---|---|
| `.getCourseMaterials(courseId)` | List course materials/activities |
| `.downloadFile(fileUrl)` | Download a material file |

### Grades

| Method | Description |
|---|---|
| `.getCourseGrades(courseId)` | Get exam scores for a course |
| `.getExamList(courseId)` | Get exam list for a course |

### Announcements & Notifications

| Method | Description |
|---|---|
| `.getAnnouncements(page?, pageSize?)` | List institution-wide bulletins |
| `.getLatestBulletins()` | Get latest bulletins (for dashboard) |
| `.getClassifications()` | Get bulletin categories |
| `.getCourseAnnouncements(courseId)` | List announcements for a course |
| `.getNotifications()` | List alert messages |

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

Asia University uses Keycloak CAS with a captcha. The built-in `solveCaptcha` uses Tesseract.js with image preprocessing (grayscale, noise removal, morphological filtering) for automatic OCR:

```ts
import { solveCaptcha } from 'tronclass-api';

await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: solveCaptcha, // Built-in Tesseract.js OCR
});
```

You can also provide a custom OCR function:

```ts
await tc.login({
  username: 'your_id',
  password: 'your_pass',
  ocrFunction: async (dataUrl: string) => {
    // dataUrl is a base64-encoded image (e.g. "data:image/png;base64,...")
    // Use any OCR service and return the captcha text
    return myCustomOcr(dataUrl);
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
├── index.ts              # Main TronClass class & exports
├── auth/
│   └── cas-auth.ts       # Keycloak / traditional CAS authentication
├── api/
│   ├── courses.ts        # Courses API
│   ├── todos.ts          # Todos API
│   ├── assignments.ts    # Assignments API
│   ├── materials.ts      # Materials API
│   ├── grades.ts         # Grades API
│   └── announcements.ts  # Announcements & Notifications API
├── core/
│   ├── http-client.ts    # HTTP client with cookie jar
│   ├── rate-limiter.ts   # Rate limiter (RPM)
│   └── errors.ts         # Error classes
├── config/
│   └── schools.ts        # Preconfigured school definitions
├── utils/
│   └── captcha-ocr.ts    # Captcha OCR (Tesseract.js + preprocessing)
└── types/
    └── index.ts          # TypeScript interfaces

examples/
└── basic.ts              # Basic usage example
```

## License

[MIT](LICENSE)

If you use this code in a commercial project, I would be very grateful if you could credit the source or send me a message to let me know!

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=Date)](https://www.star-history.com/#seven-317/Tronclass-API&type=Date)
