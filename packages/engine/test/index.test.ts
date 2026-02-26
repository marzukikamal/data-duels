import { describe, expect, it } from 'vitest';
import { calculateScore, generateTimeSeries, injectAnomaly } from '../src/index';

describe('engine', () => {
  it('generates time series with correct length', () => {
    const series = generateTimeSeries({ length: 10 });
    expect(series).toHaveLength(10);
  });

  it('injects anomalies without changing length', () => {
    const base = generateTimeSeries({ length: 5, noise: 0 });
    const mutated = injectAnomaly(base, { index: 2, magnitude: 10 });
    expect(mutated).toHaveLength(base.length);
    expect(mutated[2].value).not.toBe(base[2].value);
  });

  it('calculates a score between 0 and 1', () => {
    const result = calculateScore([1, 0, 1], [1, 1, 0]);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });
});
