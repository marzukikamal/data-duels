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
  evaluate: () => void;
  nextRound: () => void;
  resetMatch: () => void;
};

const makeSeries = (): TimeSeriesPoint[] =>
  generateTimeSeries({ length: 120, baseline: 100, noise: 2, drift: 0.05 });

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
    set({ series: mutated, anomalies: nextAnomalies, score: null, precision: null, recall: null, latency: null });
  },
  evaluate: () => {
    const { anomalies, series, round, history, leaderboard } = get();
    const actual = series.map((point) => (anomalies.includes(point.index) ? 1 : 0));
    const predicted = series.map((point) => (point.value > 120 ? 1 : 0));
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
      history: [],
      leaderboard: [
        { name: 'Atlas', score: 0.82, round: 1 },
        { name: 'Nova', score: 0.76, round: 1 },
        { name: 'Quill', score: 0.64, round: 1 },
      ],
    });
  },
}));
