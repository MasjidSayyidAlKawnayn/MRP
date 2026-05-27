export function getTodayDateString() {
  const now = new Date();
  const offsetDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}

export function getDateDaysAgoString(days: number) {
  const now = new Date();
  const target = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const offsetDate = new Date(target.getTime() - target.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
}
