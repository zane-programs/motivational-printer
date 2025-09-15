import { format } from "date-fns";

/**
 * Returns the current date formatted as "EEEE, MMMM d, yyyy 'at' h:mm a".
 * Example: "Monday, January 1, 2024 at 3:30 PM"
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export const getFullDateFormatted = (date) =>
  format(date || new Date(), "EEEE, MMMM d, yyyy 'at' h:mm a");

export const getShortDateFormatted = (date) =>
  format(date || new Date(), "MM/dd/yyyy h:mm a");
