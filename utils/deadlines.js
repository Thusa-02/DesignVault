/**
 * Timezone-safe Deadline calculation and status utilities for DesignVault.
 * Ensures all day differences are computed using the device's local calendar dates
 * without UTC offset shifts.
 */

/**
 * Parses a YYYY-MM-DD ISO string into a local Date object set to local midnight (00:00:00.000).
 * Prevents UTC timezone drift.
 */
export function parseLocalMidnight(dateString) {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.trim().split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  const date = new Date(year, month, day, 0, 0, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Returns current device local date set to midnight (00:00:00.000).
 */
export function getLocalTodayMidnight() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Calculates remaining calendar days and determines deadline status.
 *
 * Supported Statuses:
 * - 'completed': Project is marked 'Completed' in existing status field.
 * - 'due_today': Deadline is today (0 calendar days remaining).
 * - 'overdue': Deadline date has passed and project is not completed.
 * - 'upcoming': Deadline date is in the future.
 *
 * @param {string|null} deadlineDate - YYYY-MM-DD ISO date string
 * @param {string|null} projectStatus - Existing project status string (e.g., 'Completed', 'In Progress')
 * @returns {object|null} Detailed deadline metadata or null if no valid deadline
 */
export function getDeadlineInfo(deadlineDate, projectStatus) {
  if (!deadlineDate || typeof deadlineDate !== 'string') {
    return null;
  }

  const targetDate = parseLocalMidnight(deadlineDate);
  if (!targetDate) {
    return null;
  }

  const today = getLocalTodayMidnight();

  // Calendar day difference (positive = future, 0 = today, negative = past)
  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  const isCompleted = typeof projectStatus === 'string' && projectStatus.trim().toLowerCase() === 'completed';

  let statusKey = 'upcoming';
  let label = 'Upcoming';
  let badgeColor = '#7C3AED'; // DesignVault Purple
  let badgeBg = '#EDE9FE';    // Soft Lavender
  let icon = 'calendar-clock';
  let formattedDays = '';

  if (isCompleted) {
    statusKey = 'completed';
    label = 'Completed';
    badgeColor = '#10B981'; // Green
    badgeBg = '#D1FAE5';
    icon = 'check-circle-outline';
    formattedDays = 'Project Completed';
  } else if (diffDays === 0) {
    statusKey = 'due_today';
    label = 'Due Today';
    badgeColor = '#F59E0B'; // Amber
    badgeBg = '#FEF3C7';
    icon = 'alert-circle-outline';
    formattedDays = 'Due Today';
  } else if (diffDays < 0) {
    statusKey = 'overdue';
    label = 'Overdue';
    badgeColor = '#EF4444'; // Red
    badgeBg = '#FEE2E2';
    icon = 'calendar-alert';
    const absDays = Math.abs(diffDays);
    formattedDays = absDays === 1 ? '1 day overdue' : `${absDays} days overdue`;
  } else {
    statusKey = 'upcoming';
    label = 'Upcoming';
    badgeColor = '#6366F1'; // Indigo
    badgeBg = '#EEF2FF';
    icon = 'calendar-clock';
    formattedDays = diffDays === 1 ? '1 day remaining' : `${diffDays} days remaining`;
  }

  return {
    rawDate: deadlineDate.trim(),
    targetDate,
    diffDays,
    statusKey,
    label,
    formattedDays,
    badgeColor,
    badgeBg,
    icon,
    isCompleted,
    isOverdue: statusKey === 'overdue',
    isDueToday: statusKey === 'due_today',
    isUpcoming: statusKey === 'upcoming',
  };
}

/**
 * Filters and sorts nearest unfinished projects with deadlines.
 * Used by the Home screen Upcoming Deadlines widget.
 *
 * @param {Array} projects - List of all projects
 * @param {number} limit - Maximum number of projects to return (default: 5)
 * @returns {Array} Projects sorted by deadline urgency (overdue, due today, nearest upcoming)
 */
export function getUpcomingDeadlines(projects = [], limit = 5) {
  if (!Array.isArray(projects)) return [];

  const withDeadlines = [];

  for (const p of projects) {
    // Only unfinished projects
    const isCompleted = typeof p.status === 'string' && p.status.trim().toLowerCase() === 'completed';
    if (isCompleted) continue;

    if (p.deadline_date && typeof p.deadline_date === 'string' && p.deadline_date.trim() !== '') {
      const info = getDeadlineInfo(p.deadline_date, p.status);
      if (info) {
        withDeadlines.push({
          ...p,
          deadlineInfo: info,
        });
      }
    }
  }

  // Sort by diffDays ascending: overdue first (negative), then due today (0), then closest future days
  withDeadlines.sort((a, b) => a.deadlineInfo.diffDays - b.deadlineInfo.diffDays);

  return withDeadlines.slice(0, limit);
}
