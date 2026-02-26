import { create } from 'zustand';
import { getDuckDb } from './duckdb';

type Incident = {
  id: string;
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  durationMin: number;
  errorRate: number;
  affectedUsers: number;
};

type ResultStatus = 'pending' | 'correct' | 'incorrect';

type AppState = {
  title: string;
  sql: string;
  lastQuery: string | null;
  isRunning: boolean;
  error: string | null;
  dataset: Incident[];
  expectedAnswer: number;
  lastAnswer: number | null;
  resultStatus: ResultStatus;
  attemptsUsed: number;
  challengeKey: string;
  solutionSql: string;
  updateSql: (sql: string) => void;
  runSql: () => Promise<void>;
  submitAnswer: () => void;
};

const services = ['payments', 'auth', 'search', 'analytics', 'checkout', 'profile'] as const;
const severities = ['low', 'medium', 'high', 'critical'] as const;

type OrderField =
  | 'id'
  | 'service'
  | 'severity'
  | 'durationMin'
  | 'errorRate'
  | 'affectedUsers';

type ParsedQuery = {
  predicates: Array<(row: Incident) => boolean>;
  orderBy: { field: OrderField; direction: 'asc' | 'desc' } | null;
  limit: number | null;
  complexity: number;
};

const solutionSql = `-- Daily Challenge Solution
SELECT COUNT(*) AS answer
FROM incidents
WHERE severity IN ('critical', 'high')
  AND service IN ('payments', 'auth')
  AND error_rate >= 0.08
  AND duration_min >= 30;`;

const defaultSql = `-- Daily Challenge
SELECT COUNT(*) AS answer
FROM incidents
WHERE severity IN ('critical', 'high')
  AND service IN ('payments', 'auth')
  AND error_rate >= 0.08
  AND duration_min >= 30;`;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toChallengeKey = (date = new Date()): string =>
  date.toLocaleDateString('en-CA', { timeZone: 'UTC' });

const seedFromKey = (key: string): number => {
  const digits = key.replace(/-/g, '');
  return Number.parseInt(digits, 10);
};

const mulberry32 = (seed: number): (() => number) => {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const randomChoice = <T,>(items: readonly T[], next: () => number): T => {
  const fallback = items[0];
  if (fallback === undefined) {
    throw new Error('randomChoice requires a non-empty array');
  }
  return items[Math.floor(next() * items.length)] ?? fallback;
};

const makeDataset = (seed: number): Incident[] => {
  const rand = mulberry32(seed);
  const rows: Incident[] = [];
  for (let i = 0; i < 120; i += 1) {
    const severity = randomChoice(severities, rand);
    const service = randomChoice(services, rand);
    const durationMin = Math.floor(rand() * 86) + 5 + (severity === 'critical' ? 20 : 0);
    const errorRate = Number((rand() * 0.2).toFixed(3));
    const affectedUsers = Math.floor(rand() * 2451) + 50 + (severity === 'critical' ? 1200 : 0);
    rows.push({
      id: `INC-${1000 + i}`,
      service,
      severity,
      durationMin,
      errorRate,
      affectedUsers,
    });
  }
  return rows;
};

const deriveExpectedAnswer = (dataset: Incident[]): number => {
  const expected = dataset.filter(
    (row) =>
      (row.severity === 'critical' || row.severity === 'high') &&
      (row.service === 'payments' || row.service === 'auth') &&
      row.errorRate >= 0.08 &&
      row.durationMin >= 30,
  );
  return expected.length;
};

const parseSql = (sql: string): ParsedQuery => {
  const lower = sql.toLowerCase();
  const whereMatch = lower.split('where')[1] ?? '';
  const orderMatch = lower.split('order by')[1] ?? '';
  const limitMatch = lower.match(/limit\s+(\d+)/);
  const limit = limitMatch ? Number(limitMatch[1]) : null;

  const orderBy = (() => {
    if (!orderMatch) {
      return null;
    }
    const cleaned = orderMatch.split(/limit|;|\n/)[0]?.trim() ?? '';
    const [fieldRaw, directionRaw] = cleaned.split(/\s+/);
    if (!fieldRaw) {
      return null;
    }
    const fieldMap: Record<string, OrderField> = {
      id: 'id',
      service: 'service',
      severity: 'severity',
      duration_min: 'durationMin',
      error_rate: 'errorRate',
      affected_users: 'affectedUsers',
    };
    const field = fieldMap[fieldRaw] ?? 'errorRate';
    const direction: 'asc' | 'desc' = directionRaw === 'asc' ? 'asc' : 'desc';
    return { field, direction };
  })();

  const predicates: Array<(row: Incident) => boolean> = [];
  const clause = whereMatch.split(/order by|limit|;/)[0]?.trim() ?? '';
  const parts = clause
    .split(/and/i)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    const inMatch = part.match(/(severity|service)\s+in\s*\(([^)]+)\)/i);
    if (inMatch?.[1] && inMatch[2]) {
      const field = inMatch[1].toLowerCase();
      const values = inMatch[2]
        .split(',')
        .map((v) => v.replace(/['\s]/g, '').toLowerCase())
        .filter(Boolean);
      predicates.push((row) =>
        values.includes(String(row[field as 'severity' | 'service']).toLowerCase()),
      );
      continue;
    }

    const compMatch = part.match(
      /(error_rate|duration_min|affected_users)\s*(>=|<=|=|>|<)\s*([0-9.]+)/i,
    );
    if (compMatch?.[1] && compMatch[2] && compMatch[3]) {
      const fieldRaw = compMatch[1].toLowerCase();
      const operator = compMatch[2];
      const value = Number(compMatch[3]);
      const fieldMap: Record<string, 'errorRate' | 'durationMin' | 'affectedUsers'> = {
        error_rate: 'errorRate',
        duration_min: 'durationMin',
        affected_users: 'affectedUsers',
      };
      const field = fieldMap[fieldRaw] ?? 'errorRate';
      predicates.push((row) => {
        const target = row[field];
        switch (operator) {
          case '>':
            return target > value;
          case '>=':
            return target >= value;
          case '<':
            return target < value;
          case '<=':
            return target <= value;
          case '=':
            return target === value;
          default:
            return true;
        }
      });
      continue;
    }
  }

  return {
    predicates,
    orderBy,
    limit,
    complexity: clamp(predicates.length + (orderBy ? 1 : 0) + (limit ? 1 : 0), 1, 10),
  };
};

const attemptStorageKey = (challengeKey: string): string => `data-duels-attempts-${challengeKey}`;
const resultStorageKey = (challengeKey: string): string => `data-duels-result-${challengeKey}`;

export const useAppStore = create<AppState>((set, get) => {
  const challengeKey = toChallengeKey();
  const seed = seedFromKey(challengeKey);
  const dataset = makeDataset(seed);
  const expectedAnswer = deriveExpectedAnswer(dataset);
  const storedAttempts = Number(localStorage.getItem(attemptStorageKey(challengeKey)) ?? '0');
  const storedResult = (localStorage.getItem(resultStorageKey(challengeKey)) ?? 'pending') as ResultStatus;
  return {
    title: 'Data Duels',
    sql: defaultSql,
    lastQuery: null,
    isRunning: false,
    error: null,
    dataset,
    expectedAnswer,
    lastAnswer: null,
    resultStatus: storedResult,
    attemptsUsed: storedAttempts,
    challengeKey,
    solutionSql,
    updateSql: (sql) => set({ sql }),
    runSql: async () => {
      const { sql, dataset } = get();
      set({ isRunning: true, error: null });
      try {
        const db = await getDuckDb();
        const conn = await db.connect();
        await conn.query('DROP TABLE IF EXISTS incidents');
        await conn.query(`
          CREATE TABLE incidents (
            id VARCHAR,
            service VARCHAR,
            severity VARCHAR,
            duration_min INTEGER,
            error_rate DOUBLE,
            affected_users INTEGER
          );
        `);

        const jsonRows = dataset.map((row) => ({
          id: row.id,
          service: row.service,
          severity: row.severity,
          duration_min: row.durationMin,
          error_rate: row.errorRate,
          affected_users: row.affectedUsers,
        }));
        await db.registerFileText('incidents.json', JSON.stringify(jsonRows));
        await conn.query("INSERT INTO incidents SELECT * FROM read_json_auto('incidents.json')");

        const result = await conn.query(sql);
        const rows = result.toArray() as Array<Record<string, unknown>>;
        const row = rows[0] ?? {};
        const answer = Number(row.answer ?? row.count ?? row['count(*)'] ?? row['COUNT(*)'] ?? NaN);
        await conn.close();
        if (Number.isNaN(answer)) {
          set({ lastQuery: sql, lastAnswer: null, error: 'Query must return a single numeric column named answer.' });
          return;
        }
        set({ lastQuery: sql, lastAnswer: answer });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'SQL execution failed' });
      } finally {
        set({ isRunning: false });
      }
    },
    submitAnswer: () => {
      const { attemptsUsed, expectedAnswer, lastAnswer, challengeKey } = get();
      if (attemptsUsed >= 5) {
        return;
      }
      const nextAttempts = attemptsUsed + 1;
      const isExact = lastAnswer !== null && lastAnswer === expectedAnswer;
      const resultStatus: ResultStatus = isExact ? 'correct' : 'incorrect';
      localStorage.setItem(attemptStorageKey(challengeKey), String(nextAttempts));
      localStorage.setItem(resultStorageKey(challengeKey), resultStatus);
      set({
        resultStatus,
        attemptsUsed: nextAttempts,
        error: null,
      });
      void parseSql;
    },
  };
});
