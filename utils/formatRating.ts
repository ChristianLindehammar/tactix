/** An average of stars to one decimal, written the way the coach's language writes numbers: 4,3 in Swedish. */
export const formatRating = (average: number, locale: string) =>
  average.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
