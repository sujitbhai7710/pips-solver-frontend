<script lang="ts">
  import type { DifficultyPuzzle } from '../../lib/types';

  interface Props {
    activeDifficulty: 'easy' | 'medium' | 'hard';
    availableDifficulties: Array<'easy' | 'medium' | 'hard'>;
    onchange: (difficulty: 'easy' | 'medium' | 'hard') => void;
  }

  let { activeDifficulty, availableDifficulties, onchange }: Props = $props();

  const config = {
    easy: { label: 'Easy', color: 'bg-green-500', ring: 'ring-green-500', text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30', activeBg: 'bg-green-500 text-white' },
    medium: { label: 'Medium', color: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', activeBg: 'bg-amber-500 text-white' },
    hard: { label: 'Hard', color: 'bg-red-500', ring: 'ring-red-500', text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', activeBg: 'bg-red-500 text-white' },
  };
</script>

<div class="flex gap-2" role="tablist" aria-label="Difficulty levels">
  {#each (['easy', 'medium', 'hard'] as const) as diff}
    <button
      role="tab"
      aria-selected={activeDifficulty === diff}
      onclick={() => onchange(diff)}
      class="px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 {activeDifficulty === diff
        ? config[diff].activeBg + ' shadow-md'
        : availableDifficulties.includes(diff)
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          : 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 cursor-not-allowed'
      }"
      disabled={!availableDifficulties.includes(diff)}
    >
      {config[diff].label}
    </button>
  {/each}
</div>
