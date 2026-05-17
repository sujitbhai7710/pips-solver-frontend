<script lang="ts">
  import type { PipsPuzzle, DifficultyPuzzle, Region } from '../../lib/types';
  import { REGION_COLORS, REGION_LABELS, getRandomPuzzle } from '../../lib/api';

  let { puzzleData: initialPuzzleData }: { puzzleData: PipsPuzzle } = $props();

  // Local copy of puzzle data (can be updated when fetching next puzzle)
  let puzzleData = $state<PipsPuzzle>(initialPuzzleData);

  // Sync with prop changes
  $effect(() => {
    puzzleData = initialPuzzleData;
  });

  // Game state
  let activeDifficulty = $state<'easy' | 'medium' | 'hard'>('medium');
  let selectedDominoIdx = $state<number | null>(null);
  let rotated = $state(false);
  let placedDominoes = $state<Map<number, { row: number; col: number; rotated: boolean }>>(new Map());
  let gridValues = $state<(number | null)[][]>([]);
  let gridDominoIdx = $state<(number | null)[][]>([]);
  let hintsUsed = $state(0);
  let isComplete = $state(false);
  let validationResults = $state<Map<number, boolean>>(new Map());
  let showValidation = $state(false);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Current difficulty puzzle
  let currentPuzzle: DifficultyPuzzle | undefined = $derived(puzzleData[activeDifficulty]);

  // Grid dimensions from regions
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

  // Cell to region map
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

  // First cell for each region (badge placement)
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

  // Available (unplaced) dominoes
  let availableList = $derived.by(() => {
    if (!currentPuzzle) return [];
    return currentPuzzle.dominoes
      .map((d, i) => ({ values: d, index: i }))
      .filter((d) => !placedDominoes.has(d.index));
  });

  // Region validation logic
  let currentValidation = $derived.by(() => {
    const puzzle = currentPuzzle;
    if (!puzzle) return new Map<number, boolean>();
    const validation = new Map<number, boolean>();

    for (let idx = 0; idx < puzzle.regions.length; idx++) {
      const region = puzzle.regions[idx];
      const values = region.indices
        .map(([r, c]) => gridValues[r]?.[c])
        .filter((v): v is number => v !== null && v !== undefined);

      // If not all cells filled, not yet validatable
      if (values.length < region.indices.length) {
        validation.set(idx, false);
        continue;
      }

      let valid = false;
      switch (region.type) {
        case 'sum':
          valid = region.target !== undefined && values.reduce((a, b) => a + b, 0) === region.target;
          break;
        case 'equals':
          valid = values.every((v) => v === values[0]) && (region.target === undefined || values[0] === region.target);
          break;
        case 'unequal':
          valid = new Set(values).size === values.length;
          break;
        case 'less':
          valid = region.target !== undefined && values.every((v) => v < region.target);
          break;
        case 'greater':
          valid = region.target !== undefined && values.every((v) => v > region.target);
          break;
        case 'empty':
          valid = true;
          break;
      }
      validation.set(idx, valid);
    }
    return validation;
  });

  // Win detection
  let allRegionsValid = $derived(
    currentPuzzle
      ? [...currentValidation.values()].every((v) => v) && placedDominoes.size === currentPuzzle.dominoes.length
      : false
  );

  $effect(() => {
    if (currentPuzzle && allRegionsValid && placedDominoes.size === currentPuzzle.dominoes.length && !isComplete) {
      isComplete = true;
    }
  });

  // Initialize grid
  function initGrid() {
    if (!currentPuzzle) return;
    gridValues = Array(rows).fill(null).map(() => Array(cols).fill(null));
    gridDominoIdx = Array(rows).fill(null).map(() => Array(cols).fill(null));
    placedDominoes = new Map();
    selectedDominoIdx = null;
    rotated = false;
    hintsUsed = 0;
    isComplete = false;
    showValidation = false;
    validationResults = new Map();
  }

  // Initialize on mount and when puzzle changes
  $effect(() => {
    if (currentPuzzle) {
      initGrid();
    }
  });

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

  // Select a domino from the tray
  function selectDomino(idx: number) {
    if (placedDominoes.has(idx)) return;
    if (selectedDominoIdx === idx) {
      selectedDominoIdx = null;
      rotated = false;
    } else {
      selectedDominoIdx = idx;
      rotated = false;
    }
  }

  // Toggle rotation
  function toggleRotation() {
    rotated = !rotated;
  }

  // Check if a domino can be placed at position
  function canPlace(row: number, col: number): boolean {
    if (selectedDominoIdx === null || !currentPuzzle) return false;

    // Check first cell is free
    if (gridDominoIdx[row]?.[col] !== null) return false;

    // Check second cell based on rotation
    if (rotated) {
      // Vertical (top-bottom)
      if (row + 1 >= rows) return false;
      if (gridDominoIdx[row + 1]?.[col] !== null) return false;
    } else {
      // Horizontal (left-right)
      if (col + 1 >= cols) return false;
      if (gridDominoIdx[row]?.[col + 1] !== null) return false;
    }

    return true;
  }

  // Place domino on grid
  function placeDomino(row: number, col: number) {
    if (selectedDominoIdx === null || !currentPuzzle || !canPlace(row, col)) return;

    const domino = currentPuzzle.dominoes[selectedDominoIdx];
    const [v1, v2] = rotated ? [domino[1], domino[0]] : domino;

    // Update grid values
    const newGridValues = gridValues.map((r) => [...r]);
    newGridValues[row][col] = v1;
    if (rotated) {
      newGridValues[row + 1][col] = v2;
    } else {
      newGridValues[row][col + 1] = v2;
    }
    gridValues = newGridValues;

    // Update grid domino indices
    const newGridDominoIdx = gridDominoIdx.map((r) => [...r]);
    newGridDominoIdx[row][col] = selectedDominoIdx;
    if (rotated) {
      newGridDominoIdx[row + 1][col] = selectedDominoIdx;
    } else {
      newGridDominoIdx[row][col + 1] = selectedDominoIdx;
    }
    gridDominoIdx = newGridDominoIdx;

    // Track placement
    const newPlaced = new Map(placedDominoes);
    newPlaced.set(selectedDominoIdx, { row, col, rotated });
    placedDominoes = newPlaced;

    // Deselect
    selectedDominoIdx = null;
    rotated = false;
  }

  // Remove domino from grid
  function removeDomino(dominoIdx: number) {
    const placement = placedDominoes.get(dominoIdx);
    if (!placement) return;

    const { row, col, rotated: wasRotated } = placement;

    const newGridValues = gridValues.map((r) => [...r]);
    newGridValues[row][col] = null;
    if (wasRotated) {
      newGridValues[row + 1][col] = null;
    } else {
      newGridValues[row][col + 1] = null;
    }
    gridValues = newGridValues;

    const newGridDominoIdx = gridDominoIdx.map((r) => [...r]);
    newGridDominoIdx[row][col] = null;
    if (wasRotated) {
      newGridDominoIdx[row + 1][col] = null;
    } else {
      newGridDominoIdx[row][col + 1] = null;
    }
    gridDominoIdx = newGridDominoIdx;

    const newPlaced = new Map(placedDominoes);
    newPlaced.delete(dominoIdx);
    placedDominoes = newPlaced;
  }

  // Handle cell click
  function handleCellClick(row: number, col: number) {
    if (isComplete) return;

    // If cell has a placed domino, remove it
    const domIdx = gridDominoIdx[row]?.[col];
    if (domIdx !== null && domIdx !== undefined) {
      removeDomino(domIdx);
      return;
    }

    // If a domino is selected, try to place it
    if (selectedDominoIdx !== null) {
      placeDomino(row, col);
    }
  }

  // Right-click to rotate
  function handleCellContextMenu(e: MouseEvent, row: number, col: number) {
    e.preventDefault();
    toggleRotation();
  }

  // Hint: place one correct domino from solution
  function revealHint() {
    if (!currentPuzzle || !currentPuzzle.solution) return;

    // Find an unplaced domino and place it correctly
    for (let i = 0; i < currentPuzzle.dominoes.length; i++) {
      if (placedDominoes.has(i)) continue;

      const placement = currentPuzzle.solution[i];
      if (!placement || placement.length < 2) continue;

      const [r1, c1] = placement[0];
      const [r2, c2] = placement[1];

      // Check if both cells are free
      if (gridDominoIdx[r1]?.[c1] !== null || gridDominoIdx[r2]?.[c2] !== null) continue;

      // Determine if this is horizontal or vertical
      const isVertical = r1 !== r2;
      const domino = currentPuzzle.dominoes[i];

      // Place it
      const newGridValues = gridValues.map((r) => [...r]);
      newGridValues[r1][c1] = domino[0];
      newGridValues[r2][c2] = domino[1];
      gridValues = newGridValues;

      const newGridDominoIdx = gridDominoIdx.map((r) => [...r]);
      newGridDominoIdx[r1][c1] = i;
      newGridDominoIdx[r2][c2] = i;
      gridDominoIdx = newGridDominoIdx;

      const newPlaced = new Map(placedDominoes);
      newPlaced.set(i, { row: r1, col: c1, rotated: isVertical });
      placedDominoes = newPlaced;

      hintsUsed++;
      selectedDominoIdx = null;
      rotated = false;
      return;
    }
  }

  // Reset the board
  function resetBoard() {
    initGrid();
  }

  // Check / validate the board
  function checkBoard() {
    showValidation = true;
    validationResults = new Map(currentValidation);
  }

  // Fetch next puzzle
  async function fetchNextPuzzle() {
    loading = true;
    error = null;
    try {
      const result = await getRandomPuzzle();
      // Update local puzzle data
      puzzleData = result;
      activeDifficulty = 'medium';
      selectedDominoIdx = null;
      rotated = false;
    } catch (e: any) {
      error = 'Failed to load next puzzle';
    } finally {
      loading = false;
    }
  }

  // Difficulty change
  function setDifficulty(diff: 'easy' | 'medium' | 'hard') {
    activeDifficulty = diff;
    selectedDominoIdx = null;
    rotated = false;
    // initGrid will be called by the $effect
  }

  // Keyboard handler
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'r' || e.key === 'R') {
      toggleRotation();
    }
  }

  $effect(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });

  let dominoesPlaced = $derived(placedDominoes.size);
  let totalDominoes = $derived(currentPuzzle?.dominoes?.length ?? 0);
</script>

<div class="space-y-5">
  <!-- Win celebration -->
  {#if isComplete}
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border-2 border-green-400 dark:border-green-600 p-8 text-center animate-fade-up">
      <div class="text-5xl mb-4">&#127881;</div>
      <h2 class="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Puzzle Complete!</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-1">All dominoes correctly placed!</p>
      <p class="text-sm text-gray-500 dark:text-gray-500 mb-6">Hints used: {hintsUsed}</p>
      <div class="flex gap-3 justify-center flex-wrap">
        <button
          onclick={fetchNextPuzzle}
          disabled={loading}
          class="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold transition-colors"
        >
          {loading ? 'Loading...' : 'Next Puzzle'}
        </button>
        <button
          onclick={resetBoard}
          class="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  {/if}

  <!-- Game controls bar -->
  <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Difficulty tabs -->
      <div class="flex gap-1.5">
        {#each (['easy', 'medium', 'hard'] as const) as diff}
          <button
            onclick={() => setDifficulty(diff)}
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all {activeDifficulty === diff
              ? diff === 'easy'
                ? 'bg-emerald-600 text-white'
                : diff === 'medium'
                  ? 'bg-amber-600 text-white'
                  : 'bg-red-600 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
          >
            {diff.charAt(0).toUpperCase() + diff.slice(1)}
          </button>
        {/each}
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap gap-2">
        <button
          onclick={toggleRotation}
          class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors {rotated
            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
            : 'text-gray-600 dark:text-gray-400'}"
          title="Rotate domino (R key)"
        >
          &#8635; {rotated ? 'Vertical' : 'Horizontal'}
        </button>
        <button
          onclick={revealHint}
          disabled={isComplete || !currentPuzzle?.solution}
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white transition-colors"
          title={!currentPuzzle?.solution ? 'Solution data not available' : 'Place one correct domino'}
        >
          &#128161; Hint
        </button>
        <button
          onclick={resetBoard}
          class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          &#8634; Reset
        </button>
        <button
          onclick={checkBoard}
          disabled={isComplete}
          class="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          &#10003; Check
        </button>
      </div>

      <!-- Progress -->
      <div class="text-xs text-gray-500 dark:text-gray-400 font-medium">
        {dominoesPlaced}/{totalDominoes} placed
      </div>
    </div>
  </div>

  {#if currentPuzzle}
    <!-- Game area -->
    <div class="grid lg:grid-cols-3 gap-5">
      <!-- Grid -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
          <div class="flex justify-center overflow-x-auto">
            <div
              class="inline-grid gap-0"
              style="grid-template-columns: repeat({cols}, minmax(0, 1fr));"
            >
              {#each Array(rows) as _, r}
                {#each Array(cols) as __, c}
                  {@const regionIdx = getRegionIdx(r, c)}
                  {@const val = gridValues[r]?.[c]}
                  {@const domIdx = gridDominoIdx[r]?.[c]}
                  {@const region = regionIdx >= 0 ? currentPuzzle.regions[regionIdx] : null}
                  {@const isFirst = regionIdx >= 0 && isRegionFirstCell(regionIdx, r, c)}
                  {@const isValid = showValidation ? currentValidation.get(regionIdx) : undefined}
                  {@const canPlaceHere = selectedDominoIdx !== null && canPlace(r, c)}

                  <button
                    onclick={() => handleCellClick(r, c)}
                    oncontextmenu={(e) => handleCellContextMenu(e, r, c)}
                    class="relative aspect-square flex items-center justify-center {getRegionBgClass(regionIdx)} {getBorderClasses(r, c)} transition-colors {canPlaceHere
                      ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/60'
                      : domIdx !== null && domIdx !== undefined
                        ? 'cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30'
                        : 'cursor-default'} {isValid === true && val !== null
                      ? 'ring-1 ring-inset ring-green-400 dark:ring-green-500'
                      : isValid === false && val !== null
                        ? 'ring-1 ring-inset ring-red-400 dark:ring-red-500'
                        : ''}"
                    style="min-width: 48px; min-height: 48px; max-width: 68px; max-height: 68px;"
                    aria-label="Cell {r},{c}"
                  >
                    {#if val !== null && val !== undefined}
                      <span class="text-lg font-bold text-gray-900 dark:text-gray-100">{val}</span>
                    {:else if canPlaceHere && selectedDominoIdx !== null}
                      <span class="text-sm text-blue-400 dark:text-blue-500 opacity-50">
                        {rotated ? currentPuzzle.dominoes[selectedDominoIdx][1] : currentPuzzle.dominoes[selectedDominoIdx][0]}
                      </span>
                    {:else}
                      <span class="text-xs text-gray-300 dark:text-gray-600 opacity-40">
                        {regionIdx >= 0 ? regionIdx + 1 : ''}
                      </span>
                    {/if}

                    <!-- Region badge -->
                    {#if isFirst && region}
                      <span
                        class="absolute -top-0.5 -left-0.5 px-1 py-0.5 rounded text-[9px] font-bold leading-none {getRegionBadgeClass(regionIdx)}"
                      >
                        {getRegionLabel(region)}
                      </span>
                    {/if}

                    <!-- Validation indicator -->
                    {#if showValidation && val !== null}
                      <span class="absolute -bottom-0.5 -right-0.5">
                        {#if isValid === true}
                          <svg class="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                        {:else if isValid === false}
                          <svg class="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                          </svg>
                        {/if}
                      </span>
                    {/if}
                  </button>
                {/each}
              {/each}
            </div>
          </div>

          <!-- Region condition badges -->
          <div class="flex flex-wrap gap-2 mt-4">
            {#each currentPuzzle.regions as region, idx}
              {@const isValid = showValidation ? currentValidation.get(idx) : undefined}
              <span
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold {isValid === true
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : isValid === false
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : getRegionBadgeClass(idx)}"
              >
                {#if isValid === true}
                  &#10003;
                {:else if isValid === false}
                  &#10007;
                {/if}
                {getRegionLabel(region)}
              </span>
            {/each}
          </div>
        </div>
      </div>

      <!-- Domino tray -->
      <div class="lg:col-span-1">
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
            Domino Tray ({availableList.length} remaining)
          </h3>

          {#if selectedDominoIdx !== null}
            <div class="mb-3 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
              <p class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Selected:</p>
              <div class="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-gray-800 border-2 border-blue-500 dark:border-blue-400 text-gray-900 dark:text-gray-100">
                <span>{currentPuzzle.dominoes[selectedDominoIdx][0]}</span>
                <span class="text-gray-400 mx-0.5">|</span>
                <span>{rotated ? currentPuzzle.dominoes[selectedDominoIdx][1] : currentPuzzle.dominoes[selectedDominoIdx][1]}</span>
              </div>
              <p class="text-[10px] text-blue-500 dark:text-blue-400 mt-1">
                {rotated ? 'Vertical (top-bottom)' : 'Horizontal (left-right)'} &middot; Press R to rotate
              </p>
            </div>
          {/if}

          <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1" style="scrollbar-width: thin;">
            {#each currentPuzzle.dominoes as domino, i}
              {@const isPlaced = placedDominoes.has(i)}
              {@const isSelected = selectedDominoIdx === i}

              <button
                onclick={() => isPlaced ? removeDomino(i) : selectDomino(i)}
                class="relative flex items-center justify-center gap-0.5 px-2 py-2 rounded-lg text-sm font-bold border-2 transition-all {isSelected
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-md'
                  : isPlaced
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-750'}"
                aria-label="Domino {domino[0]}|{domino[1]} {isPlaced ? '(placed)' : ''}"
              >
                <span>{domino[0]}</span>
                <span class="text-gray-400 dark:text-gray-500 mx-0.5">|</span>
                <span>{domino[1]}</span>
                {#if isPlaced}
                  <svg class="w-3 h-3 text-green-500 absolute -top-1 -right-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- How to Play -->
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 mt-4">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-sm">How to Play</h3>
          <ul class="text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
            <li class="flex gap-2"><span class="font-bold text-blue-500">1.</span> Click a domino in the tray to select it</li>
            <li class="flex gap-2"><span class="font-bold text-blue-500">2.</span> Click an empty cell to place it (left-to-right)</li>
            <li class="flex gap-2"><span class="font-bold text-blue-500">3.</span> Press <kbd class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-mono">R</kbd> or right-click to rotate (vertical)</li>
            <li class="flex gap-2"><span class="font-bold text-blue-500">4.</span> Click a placed domino on the grid to remove it</li>
            <li class="flex gap-2"><span class="font-bold text-blue-500">5.</span> All regions must satisfy their constraints to win</li>
          </ul>
        </div>
      </div>
    </div>
  {:else}
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
      <p>No puzzle data available.</p>
    </div>
  {/if}

  <!-- Error state -->
  {#if error}
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-4 text-center">
      <p class="text-red-500 dark:text-red-400 text-sm">{error}</p>
      <button
        onclick={fetchNextPuzzle}
        class="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>
  {/if}
</div>
