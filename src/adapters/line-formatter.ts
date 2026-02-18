import type {
  DashboardData,
  CourseOverviewData,
  DeadlineItem,
  AnnouncementSummary,
  GradeSummaryData,
  LineFlexMessage,
  LineFlexBubble,
  LineFlexBox,
  LineFlexText,
  LineFlexComponent,
} from './adapter-types.js';

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

function deadlineTag(dueAt?: string): string {
  if (!dueAt) return '📌';
  const hoursLeft = (new Date(dueAt).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 0) return '❌ 已過期';
  if (hoursLeft < 24) return '🔴 緊急';
  if (hoursLeft < 72) return '🟡 即將到期';
  return '🟢 充裕';
}

function headerBox(title: string): LineFlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    backgroundColor: '#5865F2',
    contents: [
      { type: 'text', text: title, size: 'lg', weight: 'bold', color: '#FFFFFF' },
    ],
  };
}

function bodyBox(contents: LineFlexComponent[]): LineFlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    paddingAll: '16px',
    spacing: 'md',
    contents,
  };
}

function keyValueRow(label: string, value: string): LineFlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#888888', flex: 0 },
      { type: 'text', text: value, size: 'sm', color: '#333333', wrap: true },
    ],
  };
}

function sectionTitle(text: string): LineFlexText {
  return { type: 'text', text, size: 'md', weight: 'bold', color: '#5865F2', margin: 'lg' };
}

function sep(): LineFlexComponent {
  return { type: 'separator', margin: 'md', color: '#EEEEEE' };
}

export class LineFormatter {

  static formatDashboard(data: DashboardData): LineFlexMessage {
    const courseBubble: LineFlexBubble = {
      type: 'bubble',
      size: 'kilo',
      header: headerBox(`📚 課程 (${data.courses.length})`),
      body: bodyBox(
        data.courses.length > 0
          ? data.courses.slice(0, 6).map((c) => ({
              type: 'text' as const,
              text: `• ${truncate(c.name, 30)}`,
              size: 'sm' as const,
              color: '#333333',
              wrap: true,
            }))
          : [{ type: 'text' as const, text: '目前沒有課程', size: 'sm' as const, color: '#999999' }],
      ),
    };

    const todoBubble: LineFlexBubble = {
      type: 'bubble',
      size: 'kilo',
      header: headerBox(`📋 待辦 (${data.todos.length})`),
      body: bodyBox(
        data.todos.length > 0
          ? data.todos.slice(0, 5).flatMap((t): LineFlexComponent[] => [
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: truncate(t.title, 30), size: 'sm', weight: 'bold', color: '#333333', wrap: true },
                  { type: 'text', text: `${deadlineTag(t.due_at)} · ${formatDate(t.due_at)}`, size: 'xs', color: '#888888' },
                ],
              },
              sep(),
            ]).slice(0, -1)
          : [{ type: 'text' as const, text: '沒有待辦事項', size: 'sm' as const, color: '#999999' }],
      ),
    };

    const annBubble: LineFlexBubble = {
      type: 'bubble',
      size: 'kilo',
      header: headerBox(`📢 公告 (${data.announcements.length})`),
      body: bodyBox(
        data.announcements.length > 0
          ? data.announcements.slice(0, 4).map((a) => ({
              type: 'text' as const,
              text: `📢 ${truncate(a.title, 30)}`,
              size: 'sm' as const,
              color: '#333333',
              wrap: true,
            }))
          : [{ type: 'text' as const, text: '目前沒有公告', size: 'sm' as const, color: '#999999' }],
      ),
    };

    return {
      type: 'flex',
      altText: `TronClass Dashboard — ${data.courses.length} 課程, ${data.todos.length} 待辦`,
      contents: {
        type: 'carousel',
        contents: [courseBubble, todoBubble, annBubble],
      },
    };
  }

  static formatCourseOverview(data: CourseOverviewData): LineFlexMessage {
    const contents: LineFlexComponent[] = [];

    contents.push(sectionTitle(`📝 作業 (${data.assignments.length})`));
    if (data.assignments.length > 0) {
      for (const a of data.assignments.slice(0, 5)) {
        contents.push(keyValueRow(deadlineTag(a.due_at), truncate(a.title, 25)));
      }
    } else {
      contents.push({ type: 'text', text: '沒有作業', size: 'sm', color: '#999999' });
    }

    contents.push(sep());

    contents.push(sectionTitle(`📥 教材 (${data.materials.length})`));
    if (data.materials.length > 0) {
      for (const m of data.materials.slice(0, 5)) {
        contents.push({ type: 'text', text: `📄 ${truncate(m.title, 30)}`, size: 'sm', color: '#333333', wrap: true });
      }
    } else {
      contents.push({ type: 'text', text: '沒有教材', size: 'sm', color: '#999999' });
    }

    const bubble: LineFlexBubble = {
      type: 'bubble',
      header: headerBox(`📖 ${truncate(data.course.name, 25)}`),
      body: bodyBox(contents),
    };

    return {
      type: 'flex',
      altText: `課程: ${data.course.name}`,
      contents: bubble,
    };
  }

  static formatDeadlines(items: DeadlineItem[]): LineFlexMessage {
    const contents: LineFlexComponent[] = [];

    if (items.length === 0) {
      contents.push({ type: 'text', text: '✅ 沒有即將到期的任務！', size: 'md', color: '#57F287', weight: 'bold' });
    } else {
      for (const d of items.slice(0, 8)) {
        contents.push({
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: truncate(d.title, 30), size: 'sm', weight: 'bold', color: '#333333', wrap: true },
            { type: 'text', text: `${d.courseName ?? '未知課程'} · ${formatDate(d.dueAt)}`, size: 'xs', color: '#888888' },
            { type: 'text', text: deadlineTag(d.dueAt), size: 'xs', color: '#5865F2' },
          ],
        });
        contents.push(sep());
      }
      contents.pop();
    }

    const bubble: LineFlexBubble = {
      type: 'bubble',
      header: headerBox(`⏰ 即將到期 (${items.length})`),
      body: bodyBox(contents),
    };

    return {
      type: 'flex',
      altText: `${items.length} 個即將到期的任務`,
      contents: bubble,
    };
  }

  static formatAnnouncements(items: AnnouncementSummary[]): LineFlexMessage {
    const contents: LineFlexComponent[] = [];

    if (items.length === 0) {
      contents.push({ type: 'text', text: '目前沒有公告', size: 'sm', color: '#999999' });
    } else {
      for (const a of items.slice(0, 6)) {
        contents.push({
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            { type: 'text', text: `📢 ${truncate(a.title, 30)}`, size: 'sm', weight: 'bold', color: '#333333', wrap: true },
            {
              type: 'text',
              text: [a.courseName, a.author, a.createdAt ? formatDate(a.createdAt) : null].filter(Boolean).join(' · '),
              size: 'xs',
              color: '#888888',
            },
          ],
        });
        contents.push(sep());
      }
      contents.pop();
    }

    const bubble: LineFlexBubble = {
      type: 'bubble',
      header: headerBox(`📢 公告 (${items.length})`),
      body: bodyBox(contents),
    };

    return {
      type: 'flex',
      altText: `${items.length} 則公告`,
      contents: bubble,
    };
  }

  static formatGrades(data: GradeSummaryData): LineFlexMessage {
    const contents: LineFlexComponent[] = [];

    if (data.totalScore !== undefined) {
      contents.push({
        type: 'text',
        text: `總分: ${data.totalScore}`,
        size: 'lg',
        weight: 'bold',
        color: '#5865F2',
      });
      contents.push(sep());
    }

    if (data.items.length > 0) {
      for (const item of data.items.slice(0, 10)) {
        const score = item.score !== undefined && item.max_score !== undefined
          ? `${item.score} / ${item.max_score}`
          : item.score !== undefined
            ? `${item.score}`
            : '未評分';
        contents.push(keyValueRow(truncate(item.title, 15), score));
      }
    } else {
      contents.push({ type: 'text', text: '暫無成績資料', size: 'sm', color: '#999999' });
    }

    const bubble: LineFlexBubble = {
      type: 'bubble',
      header: headerBox(`📊 ${data.courseName ?? `課程 #${data.courseId}`}`),
      body: bodyBox(contents),
    };

    return {
      type: 'flex',
      altText: `成績: ${data.courseName ?? `課程 #${data.courseId}`}`,
      contents: bubble,
    };
  }
}
