import { PlayerType } from '@/types/models';
import { findFreePosition } from './playerUtils';

export interface ParsedPlayer {
  name: string;
  number: number | undefined;
}

const LEADING_NUMBER_PATTERN = /^(\d+)[.)\-:\s]+\s*(.*)/;
const BULLET_PREFIX_PATTERN = /^[\u2022\u2023\u25E6\u2043\u2219*\-\u2013\u2014]+\s+/;
/** Matches a name that starts with an uppercase/CJK letter. */
const STARTS_WITH_NAME_CHAR = /^[A-Z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;

/** For tab-separated input, extract only the first non-empty cell. */
function extractFirstCell(line: string): string {
  if (line.includes('\t')) {
    const cells = line.split('\t').map(c => c.trim()).filter(c => c.length > 0);
    return cells[0] || '';
  }
  return line.trim();
}

/** Filter out lines that are clearly not player names. */
function isNoiseLine(line: string): boolean {
  if (line.includes('|')) return true;
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
function isValidPlayer(player: ParsedPlayer): boolean {
  if (player.name.length === 0) return false;
  // A single word with no jersey number is likely a header, not a player name
  if (player.number === undefined && !player.name.includes(' ')) return false;
  // The name must start with an uppercase or CJK letter (filters out dates, timestamps, etc.)
  if (!STARTS_WITH_NAME_CHAR.test(player.name)) return false;
  return true;
}

/** Strip leading bullet characters (•, -, *, etc.). */
function stripBullet(line: string): string {
  return line.replace(BULLET_PREFIX_PATTERN, '');
}

/** Clean a raw line: extract first tab-cell, strip bullets, trim. */
function cleanLine(line: string): string {
  return stripBullet(extractFirstCell(line));
}

export function parseBulkPlayerInput(text: string): ParsedPlayer[] {
  return text
    .split('\n')
    .map(cleanLine)
    .filter(line => line.length > 0 && !isNoiseLine(line))
    .map(parseLine)
    .filter(isValidPlayer);
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
