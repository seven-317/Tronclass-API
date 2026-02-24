import type {
  DashboardData,
  DeadlineItem,
  CourseGradeSummary,
} from './adapter-types.js';

export class LineFormatter {
  static formatDashboard(data: DashboardData): any {
    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#00B900',
        contents: [
          {
            type: 'text',
            text: '📚 TronClass Dashboard',
            color: '#FFFFFF',
            weight: 'bold',
            size: 'lg',
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          this.createSection(`Active Courses (${data.activeCourses.length})`, data.activeCourses.slice(0, 3).map(c => c.name)),
          this.createSection(`Recent Todos (${data.recentTodos.length})`, data.recentTodos.slice(0, 3).map(t => t.title)),
          this.createSection(`Announcements (${data.recentAnnouncements.length})`, data.recentAnnouncements.slice(0, 3).map(a => a.title)),
        ]
      }
    };
  }

  static formatDeadlines(deadlines: DeadlineItem[]): any {
    if (deadlines.length === 0) {
      return {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            { type: 'text', text: '✅ No Upcoming Deadlines', weight: 'bold', size: 'lg' },
            { type: 'text', text: 'You are all caught up!', color: '#888888', size: 'sm', margin: 'md' }
          ]
        }
      };
    }

    const contents = deadlines.slice(0, 5).map(d => {
      const dateStr = new Date(d.dueAt).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      return {
        type: 'box',
        layout: 'vertical',
        margin: 'md',
        contents: [
          { type: 'text', text: d.courseName, size: 'xs', color: '#888888' },
          { type: 'text', text: d.title, weight: 'bold', wrap: true },
          { type: 'text', text: `Due: ${dateStr}`, size: 'sm', color: '#ff6b6b' }
        ]
      };
    });

    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#ff6b6b',
        contents: [
          { type: 'text', text: '⏰ Upcoming Deadlines', color: '#FFFFFF', weight: 'bold', size: 'lg' }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents
      }
    };
  }

  static formatGradeSummary(data: CourseGradeSummary): any {
    const contents = data.gradeItems.map(item => ({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        { type: 'text', text: item.title, size: 'sm', color: '#555555', flex: 2, wrap: true },
        { type: 'text', text: `${item.score ?? '-'}/${item.maxScore ?? '-'}`, size: 'sm', weight: 'bold', align: 'end', flex: 1 }
      ]
    }));

    return {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#2b2b2b',
        contents: [
          { type: 'text', text: '📊 Grade Summary', color: '#FFFFFF', weight: 'bold', size: 'sm' },
          { type: 'text', text: data.courseName || 'Course', color: '#FFFFFF', weight: 'bold', size: 'lg', wrap: true }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `Total Score: ${data.totalScore ?? 'N/A'}`, weight: 'bold', margin: 'md', color: '#00B900' },
          ...contents
        ]
      }
    };
  }

  private static createSection(title: string, items: string[]): any {
    return {
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      contents: [
        { type: 'text', text: title, weight: 'bold', size: 'sm', color: '#1db446' },
        ...(items.length > 0 
          ? items.map(text => ({ type: 'text', text: `• ${text}`, size: 'sm', color: '#444444', wrap: true, margin: 'sm' }))
          : [{ type: 'text', text: 'None', size: 'sm', color: '#888888', margin: 'sm' }]
        )
      ]
    };
  }
}
