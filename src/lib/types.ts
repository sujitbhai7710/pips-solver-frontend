export interface Region {
  indices: number[][];
  type: 'sum' | 'equals' | 'unequal' | 'less' | 'greater' | 'empty';
  target?: number;
}

export interface DifficultyPuzzle {
  id: number;
  constructors: string;
  dominoes: number[][];
  regions: Region[];
  solution?: number[][][];
}

export interface PipsPuzzle {
  printDate: string;
  editor: string;
  easy: DifficultyPuzzle;
  medium: DifficultyPuzzle;
  hard: DifficultyPuzzle;
  explanation?: AIExplanation;
}

export interface AIExplanation {
  easy?: { heading: string; body: string };
  medium?: { heading: string; body: string };
  hard?: { heading: string; body: string };
  tips?: string;
  learned?: string;
  faqs?: { question: string; answer: string }[];
}

export interface StatsResponse {
  totalPuzzles: number;
  dateRange: { first: string; last: string };
  editors: { editor: string; count: number }[];
  topConstructors: { constructors: string; count: number }[];
  regionTypeDistribution: Record<string, number>;
  idRange: { min: number; max: number };
  recentAdditions: { last7Days: number };
}

export interface ArchiveDate {
  date: string;
  editor: string | null;
  hasEasy: boolean;
  hasMedium: boolean;
  hasHard: boolean;
}

export interface ArchiveResponse {
  dates: ArchiveDate[];
  total: number;
}

export interface ListResponse {
  data: { date: string; data: PipsPuzzle }[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
