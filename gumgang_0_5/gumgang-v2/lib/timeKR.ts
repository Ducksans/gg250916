/**
 * Time utility for Korea Standard Time (KST/Asia/Seoul)
 * Enforces YYYY-MM-DD HH:mm format for all timestamps
 * Part of Gumgang 2.0 Timestamp Absolute Enforcement System
 */

/**
 * Returns current time in KST with format: YYYY-MM-DD HH:mm
 *
 * This is the ONLY function that should be used for timestamps
 * in the entire Gumgang 2.0 project frontend.
 *
 * @returns Current time in "YYYY-MM-DD HH:mm" format (KST)
 * @example
 * nowKRMinute() // "2025-08-09 11:15"
 */
export function nowKRMinute(): string {
  const date = new Date();

  // Format using Intl.DateTimeFormat with KST timezone
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // sv-SE locale gives us ISO-like format, then we adjust it
  const formatted = formatter.format(date);

  // Replace 'T' with space and remove seconds if present
  return formatted.replace("T", " ").substring(0, 16);
}

/**
 * Alternative implementation using manual formatting
 * (backup method in case Intl.DateTimeFormat has issues)
 */
export function nowKRMinuteAlt(): string {
  // Create date in KST
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kstDate = new Date(utc + kstOffset * 60000);

  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, "0");
  const day = String(kstDate.getDate()).padStart(2, "0");
  const hours = String(kstDate.getHours()).padStart(2, "0");
  const minutes = String(kstDate.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Parse a KST timestamp string back to Date object
 *
 * @param timestampStr Timestamp in "YYYY-MM-DD HH:mm" format
 * @returns Parsed Date object
 * @throws Error if timestamp format is invalid
 */
export function parseKRMinute(timestampStr: string): Date {
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

  if (!pattern.test(timestampStr)) {
    throw new Error(
      `Invalid timestamp format. Expected 'YYYY-MM-DD HH:mm', got '${timestampStr}'`,
    );
  }

  // Parse the string
  const [datePart, timePart] = timestampStr.split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  // Create date in KST
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return date;
}

/**
 * Validate if a string matches the required timestamp format
 *
 * @param timestampStr String to validate
 * @returns True if valid format, false otherwise
 */
export function validateKRTimestamp(timestampStr: string): boolean {
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  return pattern.test(timestampStr);
}

/**
 * Returns current KST time formatted for use in filenames
 * Replaces spaces with underscore and colons with hyphen
 *
 * @returns Current time as "YYYY-MM-DD_HH-mm"
 * @example
 * formatForFilename() // "2025-08-09_11-15"
 */
export function formatForFilename(): string {
  return nowKRMinute().replace(" ", "_").replace(":", "-");
}

/**
 * Format a Date object to KST timestamp string
 *
 * @param date Date object to format
 * @returns Formatted timestamp in "YYYY-MM-DD HH:mm" format
 */
export function formatDateToKR(date: Date): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const formatted = formatter.format(date);
  return formatted.replace("T", " ").substring(0, 16);
}

// Constants for import convenience
export const TIMESTAMP_FORMAT = "YYYY-MM-DD HH:mm";
export const TIMEZONE_NAME = "Asia/Seoul";
export const TIMEZONE_OFFSET = "+09:00";

// Type definitions
export type KRTimestamp = string; // Format: "YYYY-MM-DD HH:mm"

/**
 * Interface for objects that include KST timestamps
 */
export interface Timestamped {
  timestamp: KRTimestamp;
  timezone?: "Asia/Seoul";
}

// Default export for convenience
export default {
  nowKRMinute,
  nowKRMinuteAlt,
  parseKRMinute,
  validateKRTimestamp,
  formatForFilename,
  formatDateToKR,
  TIMESTAMP_FORMAT,
  TIMEZONE_NAME,
  TIMEZONE_OFFSET,
};
