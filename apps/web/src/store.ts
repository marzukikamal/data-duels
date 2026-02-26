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
  generate: () => void;
  addAnomaly: () => void;
  evaluate: () => void;
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
    const { anomalies, series } = get();
    const actual = series.map((point) => (anomalies.includes(point.index) ? 1 : 0));
    const predicted = series.map((point) => (point.value > 120 ? 1 : 0));
    const result = calculateScore(actual, predicted);
    set({
      predictions: predicted,
      score: result.score,
      precision: result.precision,
      recall: result.recall,
      latency: result.latency,
    });
  },
}));
