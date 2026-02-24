[![BuyMeACoffee](https://raw.githubusercontent.com/pachadotdev/buymeacoffee-badges/main/bmc-yellow.svg)](https://buymeacoffee.com/seven317)

# TronClass API

[![npm version](https://img.shields.io/npm/v/tronclass-api.svg)](https://www.npmjs.com/package/tronclass-api)
[![npm downloads](https://img.shields.io/npm/dm/tronclass-api.svg)](https://www.npmjs.com/package/tronclass-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

> Unofficial Node.js / TypeScript client for the [TronClass](https://www.tronclass.com/).

Authenticate via Keycloak CAS SSO (with automatic captcha OCR), then query courses, todos, assignments, materials, grades, announcements, and attendance — all through a single, typed API.

## Features

- 🔐 **Keycloak CAS Authentication** — auto-detect Keycloak vs traditional CAS, automatic captcha OCR via [Tesseract.js](https://github.com/naptha/tesseract.js/)
- 📚 **Full API Coverage** — courses, todos, assignments, materials, grades, announcements, notifications, attendance (rollcall)
- 🏫 **Multi-School Support** — preconfigured or custom school instances
- ⚡ **Rate Limiting** — built-in, configurable request throttling (RPM)
- 🔄 **Auto Retry** — automatic retries with exponential backoff
- 🍪 **Cookie Jar** — persistent session via `tough-cookie` + `fetch-cookie`
- 🛡️ **Typed Errors** — `RateLimitError`, `AuthenticationError`, `NetworkError`, `ApiError`
- 🤖 **Bot Adapters** — Discord and LINE bot adapters with rich formatting (Embeds / Flex Messages)
- 📝 **Fully Typed** — complete TypeScript type definitions for all API responses

## Installation

```bash
npm install tronclass-api
```

> **Note:** This package is ESM-only and requires Node.js 18+.

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

const tc = new TronClass(Schools.ASIA_UNIVERSITY);

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

// Check active rollcalls (attendance)
const rollcalls = await tc.attendance.getActiveRollcalls();
console.log(rollcalls);
```

### Using a Custom School

```ts
import { TronClass, createSchoolConfig } from 'tronclass-api';

// Option 1: URL string
const tc = new TronClass('https://tronclass.your-school.edu');

// Option 2: Full config
const tc2 = new TronClass(
  createSchoolConfig({
    name: 'Your University',
    baseUrl: 'https://tronclass.your-school.edu.tw',
    hasCaptcha: true,
  })
);
```

## API Reference

### `new TronClass(config, options?)`

Creates a new TronClass client instance.

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
| `.getCourseById(courseId)` | Get a single course by ID |
| `.getCourseModules(courseId)` | Get course modules/sections |
| `.getMySemesters()` | List all available semesters |
| `.getMyAcademicYears()` | List all available academic years |

### Todos

| Method | Description |
|---|---|
| `.getTodos()` | List pending todo items (assignments, quizzes, etc.) |

### Assignments

| Method | Description |
|---|---|
| `.getHomeworkActivities(courseId)` | List all assignments for a course |
| `.getHomeworkDetail(courseId, activityId)` | Get detailed assignment information |
| `.submitHomework(courseId, activityId, content)` | Submit homework for an assignment |

### Materials

| Method | Description |
|---|---|
| `.getCourseMaterials(courseId)` | List all course materials/activities |
| `.downloadFile(fileUrl)` | Download a material file |

### Grades

| Method | Description |
|---|---|
| `.getCourseGrades(courseId)` | Get exam scores for a course |
| `.getExamList(courseId)` | Get the list of exams for a course |

### Announcements & Notifications

| Method | Description |
|---|---|
| `.getAnnouncements(page?, pageSize?)` | List institution-wide bulletins with pagination |
| `.getLatestBulletins()` | Get latest bulletins (for dashboard display) |
| `.getClassifications()` | Get bulletin categories |
| `.getCourseAnnouncements(courseId)` | List announcements for a specific course |
| `.getNotifications()` | List alert/notification messages |

### Attendance (Rollcall)

> **💡 Important Note on PIN Codes:**
> It is **impossible** to retrieve the 4-digit attendance PIN code via the API. The PIN is generated and stored securely on the server and is only displayed on the instructor's screen.
> 
> **Why use this API?**
> You can integrate this API with a Discord or LINE bot. When a classmate shares the 4-digit PIN in your group chat, you can simply type a command (e.g., `!rollcall 1234`) to your bot, and it will instantly submit the attendance for you without needing to open the slow TronClass app!

| Method | Description |
|---|---|
| `.getActiveRollcalls()` | List all currently active rollcalls across all enrolled courses |
| `.submitNumberRollcall(rollcallId, code)` | Submit a 4-digit PIN code for a rollcall |

### Generic Requests

For endpoints not covered by the built-in modules:

```ts
// Raw Response
const res = await tc.call('/api/some/endpoint');

// Parsed JSON
const data = await tc.callJson<MyType>('/api/some/endpoint');
```

### Rate Limiting

Built-in rate limiting prevents excessive API requests. You can read or adjust the limit at runtime:

```ts
// Read current limit
console.log(tc.rpm); // 60

// Adjust at runtime
tc.rpm = 120;
```

## Error Handling

All errors extend `TronClassError` for easy type-safe error handling:

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
  } else if (error instanceof NetworkError) {
    console.log('Network connectivity issue');
  }
}
```

## Captcha Support

Some schools (e.g., Asia University) use Keycloak CAS with a captcha challenge. The built-in `solveCaptcha` uses Tesseract.js with image preprocessing (grayscale, noise removal, morphological filtering) for automatic OCR:

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
| `SHIH_CHIEN_UNIVERSITY` | 實踐大學 |

> **Adding a new school?** Use `createSchoolConfig()` or submit a PR to `src/config/schools.ts`.

## Bot Integration (Discord / LINE)

The library includes a high-level `TronClassService` and platform-specific formatters, so your bot only needs a few lines of code to generate rich UI components:

```ts
import { TronClass, Schools, TronClassService, DiscordFormatter } from 'tronclass-api';

const tc = new TronClass(Schools.ASIA_UNIVERSITY);
await tc.login({ username, password });

const service = new TronClassService(tc);
const data = await service.getUpcomingDeadlines(7);
const embed = DiscordFormatter.formatDeadlines(data);

// → pass embed to channel.send({ embeds: [embed] }) for Discord
```

### TronClassService

A high-level service layer that aggregates multiple API calls into convenient methods:

| Method | Description |
|---|---|
| `getDashboard()` | Active courses + active rollcalls + recent todos + latest announcements |
| `getCourseOverview(courseId)` | Course info + assignments + materials |
| `getUpcomingDeadlines(days?)` | Upcoming deadlines sorted by due date |
| `getAnnouncementSummaries(limit?)` | Recent announcements as compact summaries |
| `getCourseGradeSummary(courseId)` | Grade breakdown for a course |

### Formatters

Transform `TronClassService` output into platform-specific rich message formats:

| Formatter | Output | Dependency |
|---|---|---|
| `DiscordFormatter` | Discord Embed JSON | None (works with `discord.js` `EmbedBuilder`) |
| `LineFormatter` | LINE Flex Message JSON | None (works with `@line/bot-sdk`) |

See [`examples/discord-bot.ts`](examples/discord-bot.ts) and [`examples/line-bot.ts`](examples/line-bot.ts) for full usage.

## Running the Examples

```bash
cp .env.example .env
# Edit .env with your credentials

# Run the basic example
npm run example

# Run the attendance example
npx tsx examples/attendance.ts
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
│   ├── announcements.ts  # Announcements & Notifications API
│   └── attendance.ts     # Attendance API (Rollcalls)
├── adapters/
│   ├── tronclass-service.ts  # High-level service aggregator
│   ├── discord-formatter.ts  # Discord Embed formatter
│   ├── line-formatter.ts     # LINE Flex Message formatter
│   └── adapter-types.ts      # Shared adapter type definitions
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
├── basic.ts              # Basic usage example
├── attendance.ts         # Attendance / rollcall example
├── discord-bot.ts        # Discord bot example
└── line-bot.ts           # LINE bot example
```

## Contributing

Contributions are welcome! Here are some ways you can contribute:

1. **Add a new school** — Submit a PR to `src/config/schools.ts`
2. **Report bugs** — Open an issue on [GitHub](https://github.com/seven-317/TronClass-API/issues)
3. **Add new API endpoints** — The TronClass platform has many more endpoints to cover

## License

[MIT](LICENSE)

If you use this code in a commercial project, I would be very grateful if you could credit the source or send me a message to let me know!

## Star History

<a href="https://www.star-history.com/#seven-317/Tronclass-API&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=seven-317/Tronclass-API&type=date&legend=top-left" />
 </picture>
</a>