import { parseBulkPlayerInput, createPlayersFromParsed, ParsedPlayer } from '../parseBulkPlayerInput';

describe('parseBulkPlayerInput', () => {
  it('should parse simple newline-separated names', () => {
    const input = 'John Doe\nJane Smith\nAlex Brown';
    const result = parseBulkPlayerInput(input);
    expect(result).toEqual([
      { name: 'John Doe', number: undefined },
      { name: 'Jane Smith', number: undefined },
      { name: 'Alex Brown', number: undefined },
    ]);
  });

  it('should extract leading number as jersey number', () => {
    const input = '1. John Doe\n2. Jane Smith\n10. Alex Brown';
    const result = parseBulkPlayerInput(input);
    expect(result).toEqual([
      { name: 'John Doe', number: 1 },
      { name: 'Jane Smith', number: 2 },
      { name: 'Alex Brown', number: 10 },
    ]);
  });

  it('should parse a real-world signup list with headers, dates, tabs and staff lines', () => {
    const input = [
      'Namn\tAnm\u00e4ld \t',
      '\t8. Tuva Carlsson',
      '2 mar, 21:20\t',
      '\t9. Vilma Carlsson',
      '2 mar, 21:20\t',
      '\t34. Hedvig Bergling',
      '2 mar, 21:21\t',
      '\t23. Ellen Sk\u00f6ller',
      '2 mar, 21:21\t',
      '\t5. Cecilia Wiklund',
      '2 mar, 21:59\t',
      '\t24. Nichole Tenselius',
      '2 mar, 22:07\t',
      '11. Moa Johansson',
      '3 mar, 07:10\t',
      '\t38. Stella Andersson R\u00f6jvall',
      '3 mar, 07:35\t',
      '\t12. Ellen Evertsson',
      '3 mar, 13:52\t',
      '\tMattias Evertsson | Lagledare/Huvudtr\u00e4nare/Lagkass\u00f6r',
      '3 mar, 13:52\t',
      '\t28. Alice Lindehammar',
      '3 mar, 14:55\t',
      '\tChristian Lindehammar | Assisterande tr\u00e4nare',
      '3 mar, 14:55\t',
      '\tEric Carlsson | Assisterande tr\u00e4nare',
      '3 mar, 18:21\t',
      '\t96. Britta Asmundsson',
      '3 mar, 19:56\t',
      '\t14. Agnes Ald\u00e9n',
      '4 mar, 09:33\t',
      '\t33. Siri Kock',
      '5 mar, 14:11\t',
    ].join('\n');

    const result = parseBulkPlayerInput(input);
    expect(result).toEqual([
      { name: 'Tuva Carlsson', number: 8 },
      { name: 'Vilma Carlsson', number: 9 },
      { name: 'Hedvig Bergling', number: 34 },
      { name: 'Ellen Sk\u00f6ller', number: 23 },
      { name: 'Cecilia Wiklund', number: 5 },
      { name: 'Nichole Tenselius', number: 24 },
      { name: 'Moa Johansson', number: 11 },
      { name: 'Stella Andersson R\u00f6jvall', number: 38 },
      { name: 'Ellen Evertsson', number: 12 },
      { name: 'Alice Lindehammar', number: 28 },
      { name: 'Britta Asmundsson', number: 96 },
      { name: 'Agnes Ald\u00e9n', number: 14 },
      { name: 'Siri Kock', number: 33 },
    ]);
  });

  it('should handle \\r\\n line endings and return empty array for blank input', () => {
    expect(parseBulkPlayerInput('')).toEqual([]);
    expect(parseBulkPlayerInput('   \n  \n  ')).toEqual([]);
    expect(parseBulkPlayerInput('John Doe\r\nJane Smith\r\n')).toEqual([
      { name: 'John Doe', number: undefined },
      { name: 'Jane Smith', number: undefined },
    ]);
  });

  it('should strip surrounding quotes added by Android smart keyboard', () => {
    const input = '"John Doe"\n"Jane Smith"';
    const result = parseBulkPlayerInput(input);
    expect(result).toEqual([
      { name: 'John Doe', number: undefined },
      { name: 'Jane Smith', number: undefined },
    ]);
  });

  it('should accept single-word names (first name only)', () => {
    const input = 'John\nJane\nAlex';
    const result = parseBulkPlayerInput(input);
    expect(result).toEqual([
      { name: 'John', number: undefined },
      { name: 'Jane', number: undefined },
      { name: 'Alex', number: undefined },
    ]);
  });

  it('should strip bullet prefixes', () => {
    const input = '\u2022 John Doe\n- Jane Smith\n* Alex Brown';
    const result = parseBulkPlayerInput(input);
    expect(result).toEqual([
      { name: 'John Doe', number: undefined },
      { name: 'Jane Smith', number: undefined },
      { name: 'Alex Brown', number: undefined },
    ]);
  });
});

describe('createPlayersFromParsed', () => {
  it('should create PlayerType objects with unique IDs, correct names, numbers, and positions', () => {
    const parsed: ParsedPlayer[] = [
      { name: 'Tuva Carlsson', number: 8 },
      { name: 'Vilma Carlsson', number: 9 },
      { name: 'Alice', number: undefined },
    ];
    const existingPlayers: any[] = [];
    const defaultPosition = 'forward';

    const result = createPlayersFromParsed(parsed, existingPlayers, defaultPosition);

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('Tuva Carlsson');
    expect(result[0].position).toBe('forward');
    expect(result[1].name).toBe('Vilma Carlsson');
    expect(result[2].name).toBe('Alice');

    // All IDs must be unique
    const ids = result.map(p => p.id);
    expect(new Set(ids).size).toBe(3);

    // All must have courtPosition defined
    result.forEach(p => {
      expect(p.courtPosition).toBeDefined();
    });
  });
});
