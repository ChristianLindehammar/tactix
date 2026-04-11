import { PlayerType } from '@/types/models';
import { findFreePosition } from './playerUtils';

export interface ParsedPlayer {
  name: string;
  number: number | undefined;
}

const LEADING_NUMBER_PATTERN = /^(\d+)[.)\-:\s]+\s*(.*)/;
const BULLET_PREFIX_PATTERN = /^[\u2022\u2023\u25E6\u2043\u2219*\-\u2013\u2014]+\s+/;
/** Matches a name that starts with any letter (upper, lower, or CJK/accented). */
const STARTS_WITH_NAME_CHAR = /^[A-Za-z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;

/** For tab-separated input, extract only the first non-empty cell. */
function extractFirstCell(line: string): { text: string; wasTabSeparated: boolean } {
  if (line.includes('\t')) {
    const cells = line.split('\t').map(c => c.trim()).filter(c => c.length > 0);
    return { text: cells[0] || '', wasTabSeparated: true };
  }
  return { text: line.trim(), wasTabSeparated: false };
}

/** Filter out lines that are clearly not player names. */
function isNoiseLine(line: string): boolean {
  if (line.includes('|')) return true;
  // Date/timestamp lines, e.g. "2 mar, 21:20" or "mar, 21:20"
  if (/\d{1,2}:\d{2}/.test(line)) return true;
  return false;
}

/** Extract jersey number and name from a cleaned line. */
function parseLine(line: string): ParsedPlayer {
  const match = line.match(LEADING_NUMBER_PATTERN);
  if (match) {
    return { name: match[2].trim(), number: parseInt(match[1], 10) };
  }
  return { name: line, number: undefined };
}

/** Validate that parsed result looks like a real player entry. */
function isValidPlayer(player: ParsedPlayer, wasTabSeparated: boolean): boolean {
  if (player.name.length === 0) return false;
  // In tab-separated input (e.g. spreadsheet copy-paste), a single word with no
  // jersey number is likely a column header, not a player name.
  if (wasTabSeparated && player.number === undefined && !player.name.includes(' ')) return false;
  // The name must start with a letter (filters out digit-only noise; uppercase check removed
  // so Android users who type without auto-capitalize are accepted).
  if (!STARTS_WITH_NAME_CHAR.test(player.name)) return false;
  return true;
}

/** Capitalize the first letter of a name. */
function capitalizeName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Strip leading bullet characters (•, -, *, etc.). */
function stripBullet(line: string): string {
  return line.replace(BULLET_PREFIX_PATTERN, '');
}

/** Strip surrounding straight or curly quote pairs added by Android smart keyboards. */
function stripSurroundingQuotes(line: string): string {
  return line.replace(/^["\u201C](.*)["\u201D]$/, '$1').trim();
}

export function parseBulkPlayerInput(text: string): ParsedPlayer[] {
  return text
    .split('\n')
    .map(line => {
      const { text: extracted, wasTabSeparated } = extractFirstCell(line);
      return { text: stripSurroundingQuotes(stripBullet(extracted)), wasTabSeparated };
    })
    .filter(({ text: t }) => t.length > 0 && !isNoiseLine(t))
    .map(({ text: t, wasTabSeparated }) => ({ ...parseLine(t), wasTabSeparated }))
    .filter(({ wasTabSeparated, ...player }) => isValidPlayer(player, wasTabSeparated))
    .map(({ wasTabSeparated: _wasTabSeparated, ...player }) => ({
      ...player,
      name: capitalizeName(player.name),
    }));
}


export function createPlayersFromParsed(
  parsed: ParsedPlayer[],
  existingPlayers: PlayerType[],
  defaultPosition: string,
): PlayerType[] {
  const allPlayers = [...existingPlayers];

  return parsed.map((entry, index) => {
    const position = findFreePosition(allPlayers);
    const player: PlayerType = {
      id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
      name: entry.name,
      courtPosition: position,
      position: defaultPosition,
    };
    allPlayers.push(player);
    return player;
  });
}
