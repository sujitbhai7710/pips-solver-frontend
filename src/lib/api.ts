import type { PipsPuzzle, StatsResponse, ArchiveResponse, ListResponse } from './types';

const API_BASE = 'https://pips-worker.pipssolver.workers.dev';

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const getToday = () => fetchAPI<PipsPuzzle>('/today');
export const getYesterday = () => fetchAPI<PipsPuzzle>('/yesterday');
export const getByDate = (date: string) => fetchAPI<PipsPuzzle>(`/date/${date}`);
export const getByDifficulty = (date: string, diff: string) => fetchAPI<any>(`/date/${date}/${diff}`);
export const getList = (page = 1, limit = 20) => fetchAPI<ListResponse>(`/list?page=${page}&limit=${limit}`);
export const getArchive = (month: string) => fetchAPI<ArchiveResponse>(`/archive?month=${month}`);
export const getStats = () => fetchAPI<StatsResponse>('/stats');
export const getRandomPuzzle = () => fetchAPI<PipsPuzzle>('/pips/unlimited');

export const REGION_COLORS: Record<string, string> = {
  sum: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  equals: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  unequal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  less: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  greater: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  empty: 'bg-gray-100 text-gray-500 dark:bg-gray-800/30 dark:text-gray-400',
};

export const REGION_LABELS: Record<string, string> = {
  sum: 'Σ',
  equals: '=',
  unequal: '≠',
  less: '<',
  greater: '>',
  empty: '·',
};

export const DIFFICULTY_COLORS = {
  easy: 'text-emerald-600 dark:text-emerald-400',
  medium: 'text-amber-600 dark:text-amber-400',
  hard: 'text-red-600 dark:text-red-400',
};
