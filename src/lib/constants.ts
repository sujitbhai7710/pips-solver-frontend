// ── Region Types ──
export const REGION_TYPES = [
  { type: 'equals', label: 'Equals (=)', symbol: '=', color: '#22c55e', description: 'All cells in this region must contain the same number' },
  { type: 'not_equals', label: 'Not Equals (≠)', symbol: '≠', color: '#ef4444', description: 'All cells must contain different numbers' },
  { type: 'sum', label: 'Sum', symbol: 'Σ', color: '#3b82f6', description: 'Cells must sum to a specific value' },
  { type: 'less_than', label: 'Less Than (<)', symbol: '<', color: '#f59e0b', description: 'All cells must be less than the value' },
  { type: 'greater_than', label: 'Greater Than (>)', symbol: '>', color: '#a855f7', description: 'All cells must be greater than the value' },
] as const;

// ── Difficulty Labels ──
export const DIFFICULTY_CONFIG = {
  easy: {
    label: 'Easy',
    color: '#22c55e',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
    borderColor: 'border-green-300 dark:border-green-700',
    description: 'Straightforward regions and constraints',
  },
  medium: {
    label: 'Medium',
    color: '#f59e0b',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-700',
    description: 'More complex regions with tricky conditions',
  },
  hard: {
    label: 'Hard',
    color: '#ef4444',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
    borderColor: 'border-red-300 dark:border-red-700',
    description: 'Challenging constraints that require deep reasoning',
  },
} as const;

// ── Region Colors ──
export const REGION_COLORS = [
  { bg: 'bg-red-100 dark:bg-red-900/20', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-400' },
  { bg: 'bg-blue-100 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400' },
  { bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-400' },
  { bg: 'bg-yellow-100 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', text: 'text-yellow-700 dark:text-yellow-400' },
  { bg: 'bg-purple-100 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-400' },
  { bg: 'bg-pink-100 dark:bg-pink-900/20', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-400' },
  { bg: 'bg-teal-100 dark:bg-teal-900/20', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-400' },
  { bg: 'bg-orange-100 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-400' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/20', border: 'border-rose-300 dark:border-rose-700', text: 'text-rose-700 dark:text-rose-400' },
] as const;

// ── Navigation Links ──
export const NAV_LINKS = [
  { href: '/today', label: 'Today', icon: 'calendar' },
  { href: '/archive', label: 'Archive', icon: 'archive' },
  { href: '/stats', label: 'Stats', icon: 'bar-chart' },
  { href: '/custom-pips', label: 'Custom Pips', icon: 'puzzle' },
  { href: '/pips/unlimited', label: 'Game', icon: 'gamepad' },
] as const;

// ── FAQ Data ──
export const FAQS = [
  {
    question: 'What is Pips Puzzle?',
    answer: 'Pips is a logic puzzle published daily in the New York Times. Similar to Sudoku, you place dominoes (numbered tiles) on a grid so that each region satisfies its mathematical condition (equal, not equal, sum, less than, or greater than).',
  },
  {
    question: 'How do the difficulty levels work?',
    answer: 'Each daily puzzle comes in three difficulty levels. Easy puzzles have simpler region conditions and fewer constraints. Medium adds more complex interactions. Hard requires advanced logic and careful deduction to solve.',
  },
  {
    question: 'Can I play past puzzles?',
    answer: 'Yes! Visit the Archive page to browse and play any puzzle from previous dates. You can also use the search feature to find puzzles with specific region types.',
  },
  {
    question: 'What does the AI Explanation do?',
    answer: 'Our AI analyzes each puzzle and provides a step-by-step breakdown of the solving logic. It explains which regions to tackle first, what deductions can be made, and why certain placements are forced.',
  },
  {
    question: 'Is Pips Solver free to use?',
    answer: 'Yes, Pips Solver is completely free. You can view hints, solutions, AI explanations, and play the unlimited game mode without any cost or registration.',
  },
] as const;

// ── Stats ──
export const HOMEPAGE_STATS = [
  { label: 'Daily Puzzles', value: '365+', icon: 'calendar' },
  { label: 'Active Players', value: '10K+', icon: 'users' },
  { label: 'Hints Given', value: '1M+', icon: 'lightbulb' },
  { label: 'Win Rate', value: '94%', icon: 'trophy' },
] as const;
