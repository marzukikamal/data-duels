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

type ScoreResult = {
  score: number;
  precision: number;
  recall: number;
  efficiency: number;
};

type AppState = {
  title: string;
  hasStarted: boolean;
  sql: string;
  lastQuery: string | null;
  isRunning: boolean;
  error: string | null;
  dataset: Incident[];
  expectedIds: Set<string>;
  results: Incident[];
  score: ScoreResult | null;
  round: number;
  history: Array<ScoreResult & { round: number }>;
  leaderboard: Array<{ name: string; score: number; round: number }>;
  start: () => void;
  updateSql: (sql: string) => void;
  runSql: () => Promise<void>;
  scoreRun: () => void;
  nextRound: () => void;
  resetMatch: () => void;
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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomChoice = <T,>(items: readonly T[]): T => {
  const fallback = items[0];
  if (fallback === undefined) {
    throw new Error('randomChoice requires a non-empty array');
  }
  return items[Math.floor(Math.random() * items.length)] ?? fallback;
};

const makeDataset = (): Incident[] => {
  const rows: Incident[] = [];
  for (let i = 0; i < 120; i += 1) {
    const severity = randomChoice(severities);
    const service = randomChoice(services);
    const durationMin = randomInt(5, 90) + (severity === 'critical' ? 20 : 0);
    const errorRate = Number((Math.random() * 0.2).toFixed(3));
    const affectedUsers = randomInt(50, 2500) + (severity === 'critical' ? 1200 : 0);
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

const deriveExpected = (dataset: Incident[]): Set<string> => {
  const expected = dataset.filter(
    (row) =>
      (row.severity === 'critical' || row.severity === 'high') &&
      (row.service === 'payments' || row.service === 'auth') &&
      row.errorRate >= 0.08 &&
      row.durationMin >= 30,
  );
  return new Set(expected.map((row) => row.id));
};

const defaultSql = `-- Incident Triage (T-SQL-ish)
-- Table: incidents(id, service, severity, duration_min, error_rate, affected_users)
SELECT id, service, severity, duration_min, error_rate, affected_users
FROM incidents
WHERE severity IN ('critical', 'high')
  AND service IN ('payments', 'auth')
  AND error_rate >= 0.08
  AND duration_min >= 30
ORDER BY error_rate DESC
LIMIT 12;`;

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
    complexity: predicates.length + (orderBy ? 1 : 0) + (limit ? 1 : 0),
  };
};

const runQuery = (dataset: Incident[], parsed: ParsedQuery): Incident[] => {
  const filtered = dataset.filter((row) => parsed.predicates.every((predicate) => predicate(row)));
  const orderBy = parsed.orderBy;
  const ordered = orderBy
    ? [...filtered].sort((a, b) => {
        const { field, direction } = orderBy;
        const compareText = (left: string, right: string): number =>
          direction === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
        const compareNumber = (left: number, right: number): number => {
          const diff = left - right;
          return direction === 'asc' ? diff : -diff;
        };

        switch (field) {
          case 'id':
            return compareText(a.id, b.id);
          case 'service':
            return compareText(a.service, b.service);
          case 'severity':
            return compareText(a.severity, b.severity);
          case 'durationMin':
            return compareNumber(a.durationMin, b.durationMin);
          case 'errorRate':
            return compareNumber(a.errorRate, b.errorRate);
          case 'affectedUsers':
            return compareNumber(a.affectedUsers, b.affectedUsers);
          default:
            return 0;
        }
      })
    : filtered;

  return parsed.limit ? ordered.slice(0, parsed.limit) : ordered;
};

const scoreQuery = (expectedIds: Set<string>, results: Incident[], complexity: number): ScoreResult => {
  const resultIds = new Set(results.map((row) => row.id));
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const id of resultIds) {
    if (expectedIds.has(id)) {
      truePositives += 1;
    } else {
      falsePositives += 1;
    }
  }
  for (const id of expectedIds) {
    if (!resultIds.has(id)) {
      falseNegatives += 1;
    }
  }

  const precision = truePositives / Math.max(1, truePositives + falsePositives);
  const recall = truePositives / Math.max(1, truePositives + falseNegatives);
  const efficiency = clamp(1 - (complexity - 1) * 0.06, 0.4, 1);
  const score = clamp(precision * 0.6 + recall * 0.3 + efficiency * 0.1, 0, 1);

  return { score, precision, recall, efficiency };
};

export const useAppStore = create<AppState>((set, get) => {
  const dataset = makeDataset();
  return {
    title: 'Data Duels',
    hasStarted: false,
    sql: defaultSql,
    lastQuery: null,
    isRunning: false,
    error: null,
    dataset,
    expectedIds: deriveExpected(dataset),
    results: [],
    score: null,
    round: 1,
    history: [],
    leaderboard: [
      { name: 'Atlas', score: 0.86, round: 1 },
      { name: 'Nova', score: 0.81, round: 1 },
      { name: 'Quill', score: 0.77, round: 1 },
    ],
    start: () => set({ hasStarted: true }),
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
        const rows = result.toArray().map((row) => row.toJSON()) as Record<string, unknown>[];
        const results: Incident[] = rows
          .map((row) => {
            const id = row.id;
            if (typeof id !== 'string') {
              return null;
            }
            const severity = String(row.severity ?? 'low');
            return {
              id,
              service: String(row.service ?? 'unknown'),
              severity: (severity as Incident['severity']) ?? 'low',
              durationMin: Number(row.duration_min ?? row.durationMin ?? 0),
              errorRate: Number(row.error_rate ?? row.errorRate ?? 0),
              affectedUsers: Number(row.affected_users ?? row.affectedUsers ?? 0),
            };
          })
          .filter((row): row is Incident => row !== null);
        await conn.close();
        set({ lastQuery: sql, results });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'SQL execution failed' });
      } finally {
        set({ isRunning: false });
      }
    },
    scoreRun: () => {
      const { results, expectedIds, round, history, leaderboard, sql } = get();
      const parsed = parseSql(sql);
      const summary = scoreQuery(expectedIds, results, parsed.complexity);
      const nextHistory = [...history, { round, ...summary }];
      const nextLeaderboard = [
        { name: 'You', score: summary.score, round },
        ...leaderboard,
      ]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      set({ score: summary, history: nextHistory, leaderboard: nextLeaderboard });
    },
    nextRound: () => {
      const dataset = makeDataset();
      set({
        round: get().round + 1,
        dataset,
        expectedIds: deriveExpected(dataset),
        results: [],
        score: null,
      });
    },
    resetMatch: () => {
      const dataset = makeDataset();
      set({
        hasStarted: false,
        sql: defaultSql,
        lastQuery: null,
        dataset,
        expectedIds: deriveExpected(dataset),
        results: [],
        score: null,
        round: 1,
        history: [],
        leaderboard: [
          { name: 'Atlas', score: 0.86, round: 1 },
          { name: 'Nova', score: 0.81, round: 1 },
          { name: 'Quill', score: 0.77, round: 1 },
        ],
      });
    },
  };
});
