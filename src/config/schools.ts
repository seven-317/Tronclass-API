import type { SchoolConfig } from '../types/index.js';

export const Schools = {
  ASIA_UNIVERSITY: {
    name: '亞洲大學',
    baseUrl: 'https://tronclass.asia.edu.tw',
    hasCaptcha: true,
  }
} as const satisfies Record<string, SchoolConfig>;
export function createSchoolConfig(config: SchoolConfig): SchoolConfig {
  return { ...config };
}
