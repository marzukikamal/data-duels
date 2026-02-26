export type TimeSeriesPoint = {
  index: number;
  value: number;
};

export type TimeSeriesOptions = {
  length: number;
  baseline?: number;
  noise?: number;
  drift?: number;
};

export type AnomalyOptions = {
  index: number;
  magnitude: number;
  spread?: number;
};

export type ScoreResult = {
  score: number;
  precision: number;
  recall: number;
  latency: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const gaussianNoise = (amplitude: number): number => {
  // Box-Muller transform for stable, repeatable noise behavior
  const u = Math.random() || 1e-12;
  const v = Math.random() || 1e-12;
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return z * amplitude;
};

export const generateTimeSeries = (options: TimeSeriesOptions): TimeSeriesPoint[] => {
  const { length, baseline = 100, noise = 2, drift = 0 } = options;

  if (length <= 0) {
    return [];
  }

  const series: TimeSeriesPoint[] = [];
  for (let i = 0; i < length; i += 1) {
    const driftOffset = drift * i;
    const value = baseline + driftOffset + gaussianNoise(noise);
    series.push({ index: i, value });
  }

  return series;
};

export const injectAnomaly = (
  series: TimeSeriesPoint[],
  options: AnomalyOptions,
): TimeSeriesPoint[] => {
  const { index, magnitude, spread = 1 } = options;
  const output = series.map((point) => ({ ...point }));

  // Apply a localized spike across a configurable spread
  for (let offset = -spread; offset <= spread; offset += 1) {
    const target = index + offset;
    if (target >= 0 && target < output.length) {
      const weight = 1 - Math.abs(offset) / (spread + 1);
      output[target].value += magnitude * weight;
    }
  }

  return output;
};

export const calculateScore = (
  actual: number[],
  predicted: number[],
): ScoreResult => {
  const length = Math.max(actual.length, predicted.length);
  if (length === 0) {
    return { score: 0, precision: 0, recall: 0, latency: 0 };
  }

  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let latencySum = 0;
  let detections = 0;

  for (let i = 0; i < length; i += 1) {
    const isActual = actual[i] === 1;
    const isPredicted = predicted[i] === 1;

    if (isPredicted) {
      detections += 1;
      const latency = isActual ? 0 : 1;
      latencySum += latency;
    }

    if (isActual && isPredicted) {
      truePositives += 1;
    } else if (!isActual && isPredicted) {
      falsePositives += 1;
    } else if (isActual && !isPredicted) {
      falseNegatives += 1;
    }
  }

  const precision = truePositives / Math.max(1, truePositives + falsePositives);
  const recall = truePositives / Math.max(1, truePositives + falseNegatives);
  const latency = detections === 0 ? 0 : latencySum / detections;

  // Weighted score balances correctness and response time
  const score = clamp(precision * 0.6 + recall * 0.35 - latency * 0.05, 0, 1);

  return { score, precision, recall, latency };
};
