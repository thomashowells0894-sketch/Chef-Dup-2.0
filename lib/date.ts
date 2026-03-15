import { format } from 'date-fns';

type DateLike = Date | string | number;

export function formatLocalDateKey(date: DateLike): string {
  return format(new Date(date), 'yyyy-MM-dd');
}

export function isSameLocalDay(left: DateLike, right: DateLike): boolean {
  return formatLocalDateKey(left) === formatLocalDateKey(right);
}
