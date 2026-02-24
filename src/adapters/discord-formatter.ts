import type {
  DashboardData,
  CourseOverview,
  DeadlineItem,
  CourseGradeSummary,
} from './adapter-types.js';

export class DiscordFormatter {
  private static readonly COLOR_PRIMARY = 0x0099ff;
  private static readonly COLOR_SUCCESS = 0x28a745;
  private static readonly COLOR_WARNING = 0xffc107;
  private static readonly COLOR_DANGER = 0xdc3545;

  static formatDashboard(data: DashboardData): any {
    return {
      title: '📚 TronClass Dashboard',
      color: this.COLOR_PRIMARY,
      fields: [
        {
          name: `Active Courses (${data.activeCourses.length})`,
          value: data.activeCourses.slice(0, 5).map(c => `• ${c.name}`).join('\n') || 'None',
          inline: false,
        },
        {
          name: `Active Rollcalls (${data.activeRollcalls.length})`,
          value: data.activeRollcalls.length > 0 
            ? data.activeRollcalls.map(r => `• 🚨 **${r.course_title}**`).join('\n') 
            : 'None',
          inline: false,
        },
        {
          name: `Recent Todos (${data.recentTodos.length})`,
          value: data.recentTodos.slice(0, 3).map(t => `• ${t.title}`).join('\n') || 'None',
          inline: false,
        },
        {
          name: `Latest Announcements (${data.recentAnnouncements.length})`,
          value: data.recentAnnouncements.slice(0, 3).map(a => `• ${a.title}`).join('\n') || 'None',
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  static formatCourseOverview(data: CourseOverview): any {
    return {
      title: `📖 ${data.course.name}`,
      description: `Course Code: ${data.course.course_code || 'N/A'}\nInstructor: ${data.course.instructor || 'Unknown'}`,
      color: this.COLOR_PRIMARY,
      fields: [
        {
          name: `Assignments (${data.assignments.length})`,
          value: data.assignments.slice(0, 3).map(a => `• ${a.title}`).join('\n') || 'None',
          inline: false,
        },
        {
          name: `Materials (${data.materials.length})`,
          value: data.materials.slice(0, 3).map(m => `• ${m.title}`).join('\n') || 'None',
          inline: false,
        },
        {
          name: `Announcements (${data.announcements.length})`,
          value: data.announcements.slice(0, 3).map(a => `• ${a.title}`).join('\n') || 'None',
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
    };
  }

  static formatDeadlines(deadlines: DeadlineItem[]): any {
    if (deadlines.length === 0) {
      return {
        title: '✅ No Upcoming Deadlines',
        description: 'You are all caught up!',
        color: this.COLOR_SUCCESS,
        timestamp: new Date().toISOString(),
      };
    }

    const fields = deadlines.slice(0, 10).map((d) => {
      const isUrgent = new Date(d.dueAt).getTime() - Date.now() < 86400000;
      return {
        name: `${isUrgent ? '🔴' : '🟡'} ${d.courseName}`,
        value: `**${d.title}**\nDue: <t:${Math.floor(new Date(d.dueAt).getTime() / 1000)}:R>`,
        inline: false,
      };
    });

    return {
      title: '⏰ Upcoming Deadlines',
      color: this.COLOR_WARNING,
      fields,
      footer: {
        text: `Showing ${fields.length} of ${deadlines.length} deadlines`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static formatGradeSummary(data: CourseGradeSummary): any {
    const fields = data.gradeItems.map(item => ({
      name: item.title,
      value: `Score: **${item.score ?? '-'}** / ${item.maxScore ?? '-'}\nWeight: ${item.weight ?? 0}%`,
      inline: true,
    }));

    return {
      title: `📊 Grades: ${data.courseName}`,
      description: `Total Score: **${data.totalScore ?? 'N/A'}**`,
      color: this.COLOR_PRIMARY,
      fields: fields.length > 0 ? fields : [{ name: 'No Data', value: 'No grades available yet.' }],
      timestamp: new Date().toISOString(),
    };
  }
}
