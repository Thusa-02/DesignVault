/**
 * Generates a personalized greeting based on device local time and user name:
 * - 5:00 AM–11:59 AM: Good Morning, [Name]!
 * - 12:00 PM–4:59 PM: Good Afternoon, [Name]!
 * - 5:00 PM–4:59 AM: Good Evening, [Name]!
 */
export function getPersonalizedGreeting(name) {
  const hour = new Date().getHours();
  const displayName = name && typeof name === 'string' && name.trim() ? name.trim() : 'Designer';

  if (hour >= 5 && hour < 12) {
    return `Good Morning, ${displayName}!`;
  } else if (hour >= 12 && hour < 17) {
    return `Good Afternoon, ${displayName}!`;
  } else {
    return `Good Evening, ${displayName}!`;
  }
}
