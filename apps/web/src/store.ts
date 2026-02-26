import { create } from 'zustand';
import type { TimeSeriesPoint } from '@engine/index';
import { calculateScore, generateTimeSeries, injectAnomaly } from '@engine/index';

type AppState = {
  title: string;
  series: TimeSeriesPoint[];
  anomalies: number[];
  predictions: number[];
  score: number | null;
  precision: number | null;
  recall: number | null;
  latency: number | null;
  hasStarted: boolean;
  sql: string;
  lastQuery: string | null;
  lastRows: TimeSeriesPoint[];
  round: number;
  history: Array<{
    round: number;
    score: number;
    precision: number;
    recall: number;
    latency: number;
  }>;
  leaderboard: Array<{
    name: string;
    score: number;
    round: number;
  }>;
  start: () => void;
  generate: () => void;
  addAnomaly: () => void;
  updateSql: (sql: string) => void;
  runSql: () => void;
  evaluate: () => void;
  nextRound: () => void;
  resetMatch: () => void;
};

const makeSeries = (): TimeSeriesPoint[] =>
  generateTimeSeries({ length: 120, baseline: 100, noise: 2, drift: 0.05 });

const defaultSql = `-- Data Duels SQL (T-SQL-ish)
-- Table: series(index INT, value FLOAT)
SELECT index, value
FROM series
WHERE value > 118
ORDER BY index;`;

const parseSql = (sql: string, series: TimeSeriesPoint[]): TimeSeriesPoint[] => {
  const lower = sql.toLowerCase();
  const whereIndex = lower.indexOf('where');
  if (whereIndex === -1) {
    return series;
  }

  const whereClause = lower.slice(whereIndex + 5);
  const conditions = whereClause
    .split(/and|or/)
    .map((c) => c.trim())
    .filter(Boolean);

  const predicates = conditions.map((condition) => {
    const match = condition.match(/value\s*(>=|<=|=|>|<)\s*([0-9.]+)/);
    if (!match) {
      return () => true;
    }
    const operator = match[1];
    const threshold = Number(match[2]);
    return (value: number): boolean => {
      switch (operator) {
        case '>':
          return value > threshold;
        case '>=':
          return value >= threshold;
        case '<':
          return value < threshold;
        case '<=':
          return value <= threshold;
        case '=':
          return value === threshold;
        default:
          return true;
      }
    };
  });

  return series.filter((point) => predicates.every((predicate) => predicate(point.value)));
};

export const useAppStore = create<AppState>((set, get) => ({
  title: 'Data Duels',
  series: makeSeries(),
  anomalies: [],
  predictions: [],
  score: null,
  precision: null,
  recall: null,
  latency: null,
  hasStarted: false,
  sql: defaultSql,
  lastQuery: null,
  lastRows: [],
  round: 1,
  history: [],
  leaderboard: [
    { name: 'Atlas', score: 0.82, round: 1 },
    { name: 'Nova', score: 0.76, round: 1 },
    { name: 'Quill', score: 0.64, round: 1 },
  ],
  start: () => {
    set({ hasStarted: true });
  },
  generate: () => {
    const series = makeSeries();
    set({
      series,
      anomalies: [],
      predictions: [],
      score: null,
      precision: null,
      recall: null,
      latency: null,
    });
  },
  addAnomaly: () => {
    const { series, anomalies } = get();
    const index = Math.floor(Math.random() * series.length);
    const mutated = injectAnomaly(series, { index, magnitude: 18, spread: 2 });
    const nextAnomalies = [...anomalies, index];
    set({
      series: mutated,
      anomalies: nextAnomalies,
      score: null,
      precision: null,
      recall: null,
      latency: null,
    });
  },
  updateSql: (sql: string) => {
    set({ sql });
  },
  runSql: () => {
    const { sql, series } = get();
    const rows = parseSql(sql, series);
    const predictions = series.map((point) =>
      rows.find((row) => row.index === point.index) ? 1 : 0,
    );
    set({ lastQuery: sql, lastRows: rows, predictions });
  },
  evaluate: () => {
    const { anomalies, series, round, history, leaderboard, predictions } = get();
    const actual = series.map((point) => (anomalies.includes(point.index) ? 1 : 0));
    const predicted = predictions.length === series.length ? predictions : series.map(() => 0);
    const result = calculateScore(actual, predicted);
    const nextHistory = [
      ...history,
      {
        round,
        score: result.score,
        precision: result.precision,
        recall: result.recall,
        latency: result.latency,
      },
    ];
    const nextLeaderboard = [
      { name: 'You', score: result.score, round },
      ...leaderboard,
    ]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    set({
      predictions: predicted,
      score: result.score,
      precision: result.precision,
      recall: result.recall,
      latency: result.latency,
      history: nextHistory,
      leaderboard: nextLeaderboard,
    });
  },
  nextRound: () => {
    const { round } = get();
    const series = makeSeries();
    set({
      round: round + 1,
      series,
      anomalies: [],
      predictions: [],
      score: null,
      precision: null,
      recall: null,
      latency: null,
      lastRows: [],
    });
  },
  resetMatch: () => {
    set({
      round: 1,
      hasStarted: false,
      series: makeSeries(),
      anomalies: [],
      predictions: [],
      score: null,
      precision: null,
      recall: null,
      latency: null,
      sql: defaultSql,
      lastQuery: null,
      lastRows: [],
      history: [],
      leaderboard: [
        { name: 'Atlas', score: 0.82, round: 1 },
        { name: 'Nova', score: 0.76, round: 1 },
        { name: 'Quill', score: 0.64, round: 1 },
      ],
    });
  },
}));
