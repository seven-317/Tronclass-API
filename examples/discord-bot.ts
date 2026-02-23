import 'dotenv/config';
import {
  TronClass,
  Schools,
  TronClassService,
  DiscordFormatter,
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

  console.log('=== Dashboard ===');
  const dashboard = await service.getDashboard();
  const dashboardEmbed = DiscordFormatter.formatDashboard(dashboard);
  console.log(JSON.stringify(dashboardEmbed, null, 2));

  console.log('\n=== Upcoming Deadlines (7 days) ===');
  const deadlines = await service.getUpcomingDeadlines(7);
  const deadlinesEmbed = DiscordFormatter.formatDeadlines(deadlines);
  console.log(JSON.stringify(deadlinesEmbed, null, 2));

  console.log('\n=== Announcements ===');
  const announcements = await service.getAnnouncementSummaries(5);
  const annEmbed = DiscordFormatter.formatAnnouncements(announcements);
  console.log(JSON.stringify(annEmbed, null, 2));

  // ─────────────────────────────────────────────────────────────
  // In a real Discord bot, you would do:
  //
  //   const { EmbedBuilder } = require('discord.js');
  //   const embed = new EmbedBuilder(dashboardEmbed);
  //   await interaction.reply({ embeds: [embed] });
  //
  // The formatter output is directly compatible with EmbedBuilder.
  // ─────────────────────────────────────────────────────────────
}

main().catch(console.error);
