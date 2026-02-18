import {
  TronClass,
  Schools,
  TronClassService,
  LineFormatter,
} from '../src/index.js';

async function main() {
  const username = process.env.TRON_USER;
  const password = process.env.TRON_PASS;
  const schoolKey = process.env.TRON_SCHOOL;

  if (!username || !password || !schoolKey) {
    throw new Error('Set TRON_USER, TRON_PASS, TRON_SCHOOL env vars.');
  }

  const schoolConfig = Schools[schoolKey as keyof typeof Schools];
  if (!schoolConfig) {
    throw new Error(`Unknown school "${schoolKey}". Available: ${Object.keys(Schools).join(', ')}`);
  }

  const tc = new TronClass(schoolConfig);
  const login = await tc.login({ username, password });
  if (!login.success) throw new Error(`Login failed: ${login.message}`);

  const service = new TronClassService(tc);

  console.log('=== Dashboard (LINE Flex) ===');
  const dashboard = await service.getDashboard();
  const dashFlex = LineFormatter.formatDashboard(dashboard);
  console.log(JSON.stringify(dashFlex, null, 2));

  console.log('\n=== Upcoming Deadlines (LINE Flex) ===');
  const deadlines = await service.getUpcomingDeadlines(7);
  const deadlineFlex = LineFormatter.formatDeadlines(deadlines);
  console.log(JSON.stringify(deadlineFlex, null, 2));

  console.log('\n=== Announcements (LINE Flex) ===');
  const announcements = await service.getAnnouncementSummaries(5);
  const annFlex = LineFormatter.formatAnnouncements(announcements);
  console.log(JSON.stringify(annFlex, null, 2));

  // ─────────────────────────────────────────────────────────────
  // In a real LINE bot, you would do:
  //
  //   const { Client } = require('@line/bot-sdk');
  //   const client = new Client({ channelAccessToken: '...' });
  //   await client.replyMessage(replyToken, dashFlex);
  //
  // The formatter output is directly compatible with LINE's API.
  // ─────────────────────────────────────────────────────────────
}

main().catch(console.error);
