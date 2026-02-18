import type {
  DashboardData,
  CourseOverviewData,
  DeadlineItem,
  AnnouncementSummary,
  GradeSummaryData,
  DiscordEmbed,
} from './adapter-types.js';

const COLORS = {
  PRIMARY: 0x5865f2,
  SUCCESS: 0x57f287,
  WARNING: 0xfee75c,
  DANGER: 0xed4245,
  INFO: 0x5bc0de,
} as const;

const REPO_URL = 'https://github.com/seven-317/Tronclass-API';

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function formatDate(iso?: string): string {
  if (!iso) return '無期限';
  const d = new Date(iso);
  return d.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function deadlineEmoji(dueAt?: string): string {
  if (!dueAt) return '📌';
  const hoursLeft = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 0) return '❌';
  if (hoursLeft < 24) return '🔴';
  if (hoursLeft < 72) return '🟡';
  return '🟢';
}

export class DiscordFormatter {
  static formatDashboard(data: DashboardData): DiscordEmbed {
    const courseList = data.courses.length > 0
      ? data.courses.slice(0, 8).map((c) => `• ${c.name}`).join('\n')
      : '_目前沒有課程_';

    const todoList = data.todos.length > 0
      ? data.todos.slice(0, 5).map((t) =>
          `${deadlineEmoji(t.due_at)} **${truncate(t.title, 40)}**${t.due_at ? ` — ${formatDate(t.due_at)}` : ''}`
        ).join('\n')
      : '_沒有待辦事項_';

    const annList = data.announcements.length > 0
      ? data.announcements.slice(0, 3).map((a) =>
          `📢 **${truncate(a.title, 40)}**${a.course_name ? ` (${a.course_name})` : ''}`
        ).join('\n')
      : '_目前沒有公告_';

    return {
      title: '📊 TronClass 總覽',
      url: REPO_URL,
      color: COLORS.PRIMARY,
      fields: [
        { name: `📚 課程 (${data.courses.length})`, value: courseList, inline: false },
        { name: `📋 待辦 (${data.todos.length})`, value: todoList, inline: false },
        { name: `📢 公告 (${data.announcements.length})`, value: annList, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
    };
  }

  static formatCourseOverview(data: CourseOverviewData): DiscordEmbed {
    const assignmentList = data.assignments.length > 0
      ? data.assignments.slice(0, 5).map((a) =>
          `${deadlineEmoji(a.due_at)} ${truncate(a.title, 40)}${a.due_at ? ` — ${formatDate(a.due_at)}` : ''}`
        ).join('\n')
      : '_沒有作業_';

    const materialList = data.materials.length > 0
      ? data.materials.slice(0, 5).map((m) => `📄 ${truncate(m.title, 40)}`).join('\n')
      : '_沒有教材_';

    return {
      title: `📖 ${data.course.name}`,
      description: data.course.course_code
        ? `課程代碼: \`${data.course.course_code}\``
        : undefined,
      url: REPO_URL,
      color: COLORS.INFO,
      fields: [
        { name: `📝 作業 (${data.assignments.length})`, value: assignmentList, inline: false },
        { name: `📥 教材 (${data.materials.length})`, value: materialList, inline: false },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
    };
  }

  static formatDeadlines(items: DeadlineItem[]): DiscordEmbed {
    if (items.length === 0) {
      return {
        title: '✅ 沒有即將到期的任務',
        description: '目前沒有待完成的任務，好好休息吧！',
        url: REPO_URL,
        color: COLORS.SUCCESS,
        timestamp: new Date().toISOString(),
        footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
      };
    }

    const lines = items.slice(0, 10).map((d) =>
      `${deadlineEmoji(d.dueAt)} **${truncate(d.title, 40)}**\n` +
      `　　${d.courseName ?? '未知課程'} · ${formatDate(d.dueAt)}`
    );

    return {
      title: `⏰ 即將到期 (${items.length})`,
      description: lines.join('\n\n'),
      url: REPO_URL,
      color: COLORS.WARNING,
      timestamp: new Date().toISOString(),
      footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
    };
  }

  static formatAnnouncements(items: AnnouncementSummary[]): DiscordEmbed {
    if (items.length === 0) {
      return {
        title: '📢 公告',
        description: '_目前沒有公告_',
        url: REPO_URL,
        color: COLORS.INFO,
        timestamp: new Date().toISOString(),
        footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
      };
    }

    const lines = items.slice(0, 8).map((a) => {
      const meta = [a.courseName, a.author].filter(Boolean).join(' · ');
      const date = a.createdAt ? formatDate(a.createdAt) : '';
      return `📢 **${truncate(a.title, 50)}**\n　　${meta}${date ? ` · ${date}` : ''}`;
    });

    return {
      title: `📢 公告 (${items.length})`,
      description: lines.join('\n\n'),
      url: REPO_URL,
      color: COLORS.INFO,
      timestamp: new Date().toISOString(),
      footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
    };
  }

  static formatGrades(data: GradeSummaryData): DiscordEmbed {
    const fields = data.items.slice(0, 15).map((item) => ({
      name: truncate(item.title, 30),
      value: item.score !== undefined && item.max_score !== undefined
        ? `${item.score} / ${item.max_score}`
        : item.score !== undefined
          ? `${item.score}`
          : '_未評分_',
      inline: true,
    }));

    return {
      title: `📊 成績 — ${data.courseName ?? `課程 #${data.courseId}`}`,
      description: data.totalScore !== undefined
        ? `**總分: ${data.totalScore}**`
        : undefined,
      url: REPO_URL,
      color: COLORS.PRIMARY,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: 'TronClass API — Made with ❤️ by Seven317' },
    };
  }
}
