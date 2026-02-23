import 'dotenv/config';
import { TronClass, Schools, RateLimitError } from '../src/index.js';

// ─── Main ─────────────────────────────────────────────────────

async function main() {
  const username = process.env.TRON_USER;
  const password = process.env.TRON_PASS;
  const schoolKey = process.env.TRON_SCHOOL;

  if (!username || !password || !schoolKey) {
    console.error('Please set TRON_USER, TRON_PASS, and TRON_SCHOOL environment variables.');
    console.error('Example: TRON_USER=your_id TRON_PASS=your_pass TRON_SCHOOL=ASIA_UNIVERSITY npx tsx examples/basic.ts');
    throw new Error('Missing TRON_USER, TRON_PASS, or TRON_SCHOOL environment variables.');
  }

  const schoolConfig = Schools[schoolKey as keyof typeof Schools];
  if (!schoolConfig) {
    const available = Object.keys(Schools).join(', ');
    throw new Error(`Unknown school "${schoolKey}". Available: ${available}`);
  }

  const tc = new TronClass(schoolConfig);

  console.log(`Connecting to ${tc.school.name} (${tc.school.baseUrl})...\n`);

  const loginResult = await tc.login({ username, password });

  if (!loginResult.success) {
    console.error(`Login failed: ${loginResult.message}`);
    return;
  }

  console.log('Login successful!\n');

  // ── Courses ──────────────────────────────────────────────
  try {
    console.log('Fetching courses...');
    const courses = await tc.courses.getMyCourses();
    console.log(`Found ${courses.length} courses:`);
    for (const course of courses.slice(0, 5)) {
      console.log(`[${course.id}] ${course.name}`);
    }
    if (courses.length > 5) {
      console.log(`... and ${courses.length - 5} more`);
    }
    console.log();
  } catch (error) {
    console.error('Failed to fetch courses:', error);
  }

  // ── Todos ────────────────────────────────────────────────
  try {
    console.log('Fetching todos...');
    const todos = await tc.todos.getTodos();
    console.log(`   Found ${todos.length} todo items:`);
    for (const todo of todos.slice(0, 5)) {
      console.log(`   - ${todo.title}${todo.due_at ? ` (due: ${todo.due_at})` : ''}`);
    }
    console.log();
  } catch (error) {
    console.error('Failed to fetch todos:', error);
  }

  // ── Announcements ────────────────────────────────────────
  try {
    console.log('Fetching announcements...');
    const announcements = await tc.announcements.getAnnouncements();
    console.log(`Found ${announcements.length} announcements:`);
    for (const ann of announcements.slice(0, 3)) {
      console.log(`- ${ann.title}`);
    }
    console.log();
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
  }

  // ── Rate Limit Handling Example ──────────────────────────
  console.log('Rate limit handling example:');
  console.log(`Current RPM: ${tc.rpm}`);
  console.log('You can adjust it: tc.rpm = 120;\n');

  console.log('Done! All API modules are ready to use.');
}

main().catch((error) => {
  if (error instanceof RateLimitError) {
    console.error(`Rate limit exceeded. Wait ${error.waitTime}ms and retry.`);
  } else {
    console.error('Unexpected error:', error);
  }
});
