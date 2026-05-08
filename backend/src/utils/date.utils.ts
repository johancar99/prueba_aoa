/**
 * Parses a date string into a Date object.
 * Returns null if the value is empty or invalid.
 */
export const parseOptionalDate = (value?: string | null): Date | null => {
  if (!value?.trim()) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};
