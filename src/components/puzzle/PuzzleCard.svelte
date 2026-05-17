<script lang="ts">
  import type { PipsPuzzle, DifficultyPuzzle, Region } from '../../lib/types';
  import { REGION_COLORS, REGION_LABELS } from '../../lib/api';

  let { data, showHints = false }: { data: PipsPuzzle; showHints?: boolean } = $props();

  let activeDifficulty = $state<'easy' | 'medium' | 'hard'>('easy');
  let hintsRevealed = $state(0);
  let explanationOpen = $state(false);
  let showFullSolution = $state(false);

  const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

  const difficultyStyles: Record<string, { active: string; label: string }> = {
    easy: { active: 'bg-emerald-600 text-white shadow-md', label: 'Easy' },
    medium: { active: 'bg-amber-600 text-white shadow-md', label: 'Medium' },
    hard: { active: 'bg-red-600 text-white shadow-md', label: 'Hard' },
  };

  let currentPuzzle: DifficultyPuzzle | undefined = $derived(data[activeDifficulty]);

  // Build grid dimensions from region indices
  let rows = $derived.by(() => {
    const puzzle = currentPuzzle;
    if (!puzzle || !puzzle.regions.length) return 0;
    let maxR = 0;
    for (const region of puzzle.regions) {
      for (const idx of region.indices) {
        if (idx[0] > maxR) maxR = idx[0];
      }
    }
    return maxR + 1;
  });

  let cols = $derived.by(() => {
    const puzzle = currentPuzzle;
    if (!puzzle || !puzzle.regions.length) return 0;
    let maxC = 0;
    for (const region of puzzle.regions) {
      for (const idx of region.indices) {
        if (idx[1] > maxC) maxC = idx[1];
      }
    }
    return maxC + 1;
  });

  // Map from "row,col" to region index
  let regionMap = $derived.by(() => {
    const puzzle = currentPuzzle;
    if (!puzzle) return new Map<string, number>();
    const map = new Map<string, number>();
    puzzle.regions.forEach((region, idx) => {
      for (const [r, c] of region.indices) {
        map.set(`${r},${c}`, idx);
      }
    });
    return map;
  });

  // Find the first cell index for each region (for badge placement)
  let firstCellMap = $derived.by(() => {
    const puzzle = currentPuzzle;
    if (!puzzle) return new Map<number, string>();
    const map = new Map<number, string>();
    puzzle.regions.forEach((region, idx) => {
      if (region.indices.length > 0) {
        const [r, c] = region.indices[0];
        map.set(idx, `${r},${c}`);
      }
    });
    return map;
  });

  // Build solution grid values from solution domino placements
  // solution[i] = [[r1,c1],[r2,c2]] for dominoes[i] = [v1,v2]
  let solvedGrid = $derived.by(() => {
    const puzzle = currentPuzzle;
    if (!puzzle || !puzzle.solution || !puzzle.dominoes) {
      return null;
    }
    const grid: (number | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      grid.push(Array(cols).fill(null));
    }

    for (let i = 0; i < puzzle.dominoes.length; i++) {
      const domino = puzzle.dominoes[i];
      const placement = puzzle.solution[i];
      if (!placement || placement.length < 2) continue;

      const [r1, c1] = placement[0];
      const [r2, c2] = placement[1];
      if (domino.length >= 2) {
        if (r1 < rows && c1 < cols) grid[r1][c1] = domino[0];
        if (r2 < rows && c2 < cols) grid[r2][c2] = domino[1];
      }
    }
    return grid;
  });

  // Build hint grid (only showing revealed dominoes)
  let displayGrid = $derived.by(() => {
    if (!showHints) return solvedGrid;
    const puzzle = currentPuzzle;
    if (!puzzle || !puzzle.solution || !puzzle.dominoes) return null;

    const grid: (number | null)[][] = [];
    for (let r = 0; r < rows; r++) {
      grid.push(Array(cols).fill(null));
    }

    const count = showFullSolution ? puzzle.dominoes.length : hintsRevealed;
    for (let i = 0; i < Math.min(count, puzzle.dominoes.length); i++) {
      const domino = puzzle.dominoes[i];
      const placement = puzzle.solution[i];
      if (!placement || placement.length < 2) continue;

      const [r1, c1] = placement[0];
      const [r2, c2] = placement[1];
      if (domino.length >= 2) {
        if (r1 < rows && c1 < cols) grid[r1][c1] = domino[0];
        if (r2 < rows && c2 < cols) grid[r2][c2] = domino[1];
      }
    }
    return grid;
  });

  let totalDominoes = $derived(currentPuzzle?.dominoes?.length ?? 0);

  function getRegionIdx(row: number, col: number): number {
    return regionMap.get(`${row},${col}`) ?? -1;
  }

  function isRegionFirstCell(regionIdx: number, row: number, col: number): boolean {
    return firstCellMap.get(regionIdx) === `${row},${col}`;
  }

  function getRegionBgClass(regionIdx: number): string {
    if (!currentPuzzle) return 'bg-gray-50 dark:bg-gray-800';
    const region = currentPuzzle.regions[regionIdx];
    if (!region) return 'bg-gray-50 dark:bg-gray-800';
    const colorClass = REGION_COLORS[region.type] || REGION_COLORS['empty'];
    // Extract just the bg portion for cell background
    const bgMap: Record<string, string> = {
      sum: 'bg-blue-50 dark:bg-blue-950/40',
      equals: 'bg-emerald-50 dark:bg-emerald-950/40',
      unequal: 'bg-amber-50 dark:bg-amber-950/40',
      less: 'bg-violet-50 dark:bg-violet-950/40',
      greater: 'bg-red-50 dark:bg-red-950/40',
      empty: 'bg-gray-50 dark:bg-gray-800/40',
    };
    return bgMap[region.type] || 'bg-gray-50 dark:bg-gray-800';
  }

  function getRegionBadgeClass(regionIdx: number): string {
    if (!currentPuzzle) return '';
    const region = currentPuzzle.regions[regionIdx];
    if (!region) return '';
    return REGION_COLORS[region.type] || REGION_COLORS['empty'];
  }

  function getRegionLabel(region: Region): string {
    const symbol = REGION_LABELS[region.type] || '?';
    if (region.target !== undefined && region.target !== null) {
      return `${symbol}${region.target}`;
    }
    return symbol;
  }

  // Border styling for region boundaries
  function getBorderClasses(row: number, col: number): string {
    const rid = getRegionIdx(row, col);
    if (rid === -1) return 'border border-gray-200 dark:border-gray-700';

    let classes = '';
    const topRid = row > 0 ? getRegionIdx(row - 1, col) : -2;
    const botRid = row < rows - 1 ? getRegionIdx(row + 1, col) : -2;
    const leftRid = col > 0 ? getRegionIdx(row, col - 1) : -2;
    const rightRid = col < cols - 1 ? getRegionIdx(row, col + 1) : -2;

    classes += topRid !== rid ? ' border-t-2 border-t-gray-400 dark:border-t-gray-500' : ' border-t border-t-gray-200 dark:border-t-gray-700';
    classes += botRid !== rid ? ' border-b-2 border-b-gray-400 dark:border-b-gray-500' : ' border-b border-b-gray-200 dark:border-b-gray-700';
    classes += leftRid !== rid ? ' border-l-2 border-l-gray-400 dark:border-l-gray-500' : ' border-l border-l-gray-200 dark:border-l-gray-700';
    classes += rightRid !== rid ? ' border-r-2 border-r-gray-400 dark:border-r-gray-500' : ' border-r border-r-gray-200 dark:border-r-gray-700';

    return classes;
  }

  function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    activeDifficulty = diff;
    hintsRevealed = 0;
    showFullSolution = false;
  }

  function revealHint() {
    if (!currentPuzzle || !currentPuzzle.solution) return;
    if (hintsRevealed < totalDominoes) {
      hintsRevealed++;
    }
  }

  function toggleFullSolution() {
    showFullSolution = !showFullSolution;
    if (showFullSolution) {
      hintsRevealed = totalDominoes;
    }
  }

  function formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
</script>

<div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
  <!-- Header -->
  <div class="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-800">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Pips Puzzle
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(data.printDate)}
          {#if data.editor}
            <span class="mx-1.5">&middot;</span>
            <span>Ed. {data.editor}</span>
          {/if}
        </p>
      </div>

      <!-- Difficulty Tabs -->
      <div class="flex gap-1.5" role="tablist" aria-label="Difficulty levels">
        {#each difficulties as diff}
          <button
            role="tab"
            aria-selected={activeDifficulty === diff}
            onclick={() => setDifficulty(diff)}
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 {activeDifficulty === diff
              ? difficultyStyles[diff].active
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
          >
            {difficultyStyles[diff].label}
          </button>
        {/each}
      </div>
    </div>

    {#if currentPuzzle?.constructors}
      <p class="text-xs text-gray-400 dark:text-gray-500">
        Constructed by {currentPuzzle.constructors}
      </p>
    {/if}
  </div>

  {#if currentPuzzle}
    <div class="p-4 sm:p-6">
      <!-- Grid Display -->
      <div class="flex justify-center mb-6 overflow-x-auto">
        <div
          class="inline-grid gap-0"
          style="grid-template-columns: repeat({cols}, minmax(0, 1fr));"
        >
          {#each Array(rows) as _, r}
            {#each Array(cols) as __, c}
              {@const regionIdx = getRegionIdx(r, c)}
              {@const cellValue = displayGrid?.[r]?.[c]}
              {@const isFirst = regionIdx >= 0 && isRegionFirstCell(regionIdx, r, c)}
              {@const region = regionIdx >= 0 ? currentPuzzle.regions[regionIdx] : null}

              <div
                class="relative aspect-square flex items-center justify-center {getRegionBgClass(regionIdx)} {getBorderClasses(r, c)}"
                style="min-width: 52px; min-height: 52px; max-width: 72px; max-height: 72px;"
              >
                <!-- Cell value -->
                {#if cellValue !== null && cellValue !== undefined}
                  <span class="text-lg font-bold text-gray-900 dark:text-gray-100">{cellValue}</span>
                {:else if showHints && currentPuzzle.solution}
                  <span class="text-gray-300 dark:text-gray-600 text-sm">&middot;</span>
                {:else if !showHints && solvedGrid?.[r]?.[c] !== null && solvedGrid?.[r]?.[c] !== undefined}
                  <span class="text-lg font-bold text-gray-900 dark:text-gray-100">{solvedGrid[r][c]}</span>
                {:else}
                  <span class="text-gray-300 dark:text-gray-600 text-sm">&middot;</span>
                {/if}

                <!-- Region badge in first cell -->
                {#if isFirst && region}
                  <span
                    class="absolute -top-0.5 -left-0.5 px-1 py-0.5 rounded text-[10px] font-bold leading-none {getRegionBadgeClass(regionIdx)}"
                  >
                    {getRegionLabel(region)}
                  </span>
                {/if}
              </div>
            {/each}
          {/each}
        </div>
      </div>

      <!-- Region badges legend -->
      <div class="flex flex-wrap gap-2 mb-6">
        {#each currentPuzzle.regions as region, idx}
          <span
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold {getRegionBadgeClass(idx)}"
          >
            {getRegionLabel(region)}
            <span class="font-normal opacity-70">({region.indices.length})</span>
          </span>
        {/each}
      </div>

      <!-- Domino List -->
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Dominoes ({totalDominoes})
        </h3>
        <div class="flex flex-wrap gap-2">
          {#each currentPuzzle.dominoes as domino, i}
            {@const isRevealed = showHints && currentPuzzle.solution && i < hintsRevealed}
            <div
              class="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-sm font-bold border transition-all {isRevealed
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}"
            >
              <span>{domino[0]}</span>
              <span class="text-gray-400 dark:text-gray-500 mx-0.5">|</span>
              <span>{domino[1]}</span>
              {#if isRevealed}
                <svg class="w-3.5 h-3.5 ml-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <!-- Hint Controls -->
      {#if showHints && currentPuzzle.solution}
        <div class="flex flex-wrap gap-3 mb-6">
          <button
            onclick={revealHint}
            disabled={hintsRevealed >= totalDominoes}
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium text-sm transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Reveal Hint ({hintsRevealed}/{totalDominoes})
          </button>
          <button
            onclick={toggleFullSolution}
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {#if showFullSolution}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Hide Solution
            {:else}
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Show Solution
            {/if}
          </button>
        </div>
      {:else if showHints && !currentPuzzle.solution}
        <div class="mb-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p class="text-sm text-amber-700 dark:text-amber-300">
            Solution data not available for hints. Enable solution access to use progressive reveal.
          </p>
        </div>
      {/if}

      <!-- AI Explanation Section -->
      {#if data.explanation}
        <div class="border-t border-gray-100 dark:border-gray-800 pt-5">
          <button
            onclick={() => (explanationOpen = !explanationOpen)}
            class="flex items-center justify-between w-full text-left group"
          >
            <h3 class="text-base font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <svg class="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI Explanation
            </h3>
            <svg
              class="w-5 h-5 text-gray-400 transition-transform duration-200 {explanationOpen ? 'rotate-180' : ''}"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {#if explanationOpen}
            <div class="mt-4 space-y-5">
              <!-- Current difficulty explanation -->
              {#if data.explanation[activeDifficulty]}
                {@const diffExp = data.explanation[activeDifficulty]}
                <div>
                  <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-2">{diffExp.heading}</h4>
                  <div class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {diffExp.body}
                  </div>
                </div>
              {/if}

              <!-- Tips -->
              {#if data.explanation.tips}
                <div class="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                  <h4 class="font-semibold text-blue-700 dark:text-blue-300 mb-2 text-sm flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Tips
                  </h4>
                  <p class="text-sm text-blue-600 dark:text-blue-400 leading-relaxed">{data.explanation.tips}</p>
                </div>
              {/if}

              <!-- What I Learned -->
              {#if data.explanation.learned}
                <div class="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900">
                  <h4 class="font-semibold text-emerald-700 dark:text-emerald-300 mb-2 text-sm flex items-center gap-1.5">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    What I Learned
                  </h4>
                  <p class="text-sm text-emerald-600 dark:text-emerald-400 leading-relaxed">{data.explanation.learned}</p>
                </div>
              {/if}

              <!-- FAQs -->
              {#if data.explanation.faqs && data.explanation.faqs.length > 0}
                <div>
                  <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">Frequently Asked Questions</h4>
                  <div class="space-y-3">
                    {#each data.explanation.faqs as faq, i}
                      <details class="group rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <summary class="flex items-center justify-between cursor-pointer px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          <span class="text-sm font-medium text-gray-900 dark:text-gray-100 pr-4">{faq.question}</span>
                          <svg class="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {faq.answer}
                        </div>
                      </details>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div class="p-8 text-center text-gray-500 dark:text-gray-400">
      <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p>No puzzle available for this difficulty.</p>
    </div>
  {/if}
</div>
