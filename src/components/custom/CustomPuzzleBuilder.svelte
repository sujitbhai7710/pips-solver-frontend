<script lang="ts">
  import type { Region } from '../../lib/types';
  import { REGION_COLORS, REGION_LABELS } from '../../lib/api';

  // Grid config
  let gridRows = $state(3);
  let gridCols = $state(5);
  let regionMap = $state<number[][]>([]);
  let currentRegion = $state(0);

  // Region definitions: index -> { type, target }
  let regionDefs = $state<Map<number, { type: Region['type']; target: number }>>(new Map());

  // Mode: 'build' or 'play'
  let mode = $state<'build' | 'play'>('build');

  // Play mode state
  let customPuzzleData = $state<any>(null);

  // Paint mode - which region color we're painting
  let paintRegion = $state(0);

  // 6 region colors for visual distinction
  const regionPalette = [
    { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-300 dark:border-red-700', text: 'text-red-700 dark:text-red-400', fill: 'bg-red-200 dark:bg-red-800/40' },
    { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-400', fill: 'bg-blue-200 dark:bg-blue-800/40' },
    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-700 dark:text-emerald-400', fill: 'bg-emerald-200 dark:bg-emerald-800/40' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-400', fill: 'bg-amber-200 dark:bg-amber-800/40' },
    { bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-700 dark:text-violet-400', fill: 'bg-violet-200 dark:bg-violet-800/40' },
    { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-400', fill: 'bg-pink-200 dark:bg-pink-800/40' },
  ];

  const regionTypes: Array<{ type: Region['type']; label: string; symbol: string }> = [
    { type: 'sum', label: 'Sum', symbol: '&Sigma;' },
    { type: 'equals', label: 'Equals', symbol: '=' },
    { type: 'unequal', label: 'Unequal', symbol: '&ne;' },
    { type: 'less', label: 'Less Than', symbol: '<' },
    { type: 'greater', label: 'Greater Than', symbol: '>' },
    { type: 'empty', label: 'No Constraint', symbol: '&middot;' },
  ];

  // Initialize the grid
  function initGrid() {
    const map: number[][] = [];
    for (let r = 0; r < gridRows; r++) {
      map.push(Array(gridCols).fill(0));
    }
    regionMap = map;

    // Reset region definitions with default for region 0
    regionDefs = new Map();
    regionDefs.set(0, { type: 'sum', target: 5 });
    currentRegion = 0;
    paintRegion = 0;
  }

  // Paint a cell with the current region color
  function paintCell(row: number, col: number) {
    if (mode !== 'build') return;
    const newMap = regionMap.map((r) => [...r]);
    newMap[row][col] = paintRegion;
    regionMap = newMap;

    // Ensure region has a definition
    if (!regionDefs.has(paintRegion)) {
      const newDefs = new Map(regionDefs);
      newDefs.set(paintRegion, { type: 'sum', target: 5 });
      regionDefs = newDefs;
    }
  }

  // Add a new region
  function addRegion() {
    const newId = Math.max(...regionMap.flat(), -1) + 1;
    paintRegion = newId;
    const newDefs = new Map(regionDefs);
    newDefs.set(newId, { type: 'sum', target: 5 });
    regionDefs = newDefs;
  }

  // Remove a region (reset cells back to region 0)
  function removeRegion(regionId: number) {
    if (regionId === 0) return;
    const newMap = regionMap.map((r) => r.map((c) => (c === regionId ? 0 : c)));
    regionMap = newMap;
    const newDefs = new Map(regionDefs);
    newDefs.delete(regionId);
    regionDefs = newDefs;
    if (paintRegion === regionId) paintRegion = 0;
  }

  // Update region definition
  function updateRegionType(regionId: number, type: Region['type']) {
    const newDefs = new Map(regionDefs);
    const existing = newDefs.get(regionId) || { type: 'sum', target: 5 };
    newDefs.set(regionId, { ...existing, type });
    regionDefs = newDefs;
  }

  function updateRegionTarget(regionId: number, target: number) {
    const newDefs = new Map(regionDefs);
    const existing = newDefs.get(regionId) || { type: 'sum', target: 5 };
    newDefs.set(regionId, { ...existing, target });
    regionDefs = newDefs;
  }

  // Get unique region IDs from the map
  let regions = $derived.by(() => {
    const set = new Set<number>();
    for (const row of regionMap) {
      for (const cell of row) {
        set.add(cell);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  });

  // Build regions data from regionMap
  function buildRegions(): Region[] {
    const regionCells = new Map<number, number[][]>();
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const rid = regionMap[r][c];
        if (!regionCells.has(rid)) regionCells.set(rid, []);
        regionCells.get(rid)!.push([r, c]);
      }
    }

    const result: Region[] = [];
    for (const [id, indices] of regionCells) {
      const def = regionDefs.get(id) || { type: 'empty' as const, target: undefined };
      const region: Region = {
        indices,
        type: def.type,
        target: def.type === 'empty' ? undefined : def.target,
      };
      result.push(region);
    }
    return result;
  }

  // Auto-generate dominoes for the custom grid
  function generateDominoes(): number[][] {
    const dominoes: number[][] = [];
    const used = new Set<string>();

    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (used.has(`${r},${c}`)) continue;

        // Try horizontal first
        if (c + 1 < gridCols && !used.has(`${r},${c + 1}`)) {
          const v1 = Math.floor(Math.random() * 6) + 1;
          const v2 = Math.floor(Math.random() * 6) + 1;
          dominoes.push([v1, v2]);
          used.add(`${r},${c}`);
          used.add(`${r},${c + 1}`);
        }
        // Try vertical
        else if (r + 1 < gridRows && !used.has(`${r + 1},${c}`)) {
          const v1 = Math.floor(Math.random() * 6) + 1;
          const v2 = Math.floor(Math.random() * 6) + 1;
          dominoes.push([v1, v2]);
          used.add(`${r},${c}`);
          used.add(`${r + 1},${c}`);
        }
      }
    }

    return dominoes;
  }

  // Switch to play mode
  function playPuzzle() {
    const regions = buildRegions();
    const dominoes = generateDominoes();

    customPuzzleData = {
      printDate: new Date().toISOString().split('T')[0],
      editor: 'Custom',
      easy: {
        id: 0,
        constructors: 'You',
        dominoes,
        regions,
      },
      medium: {
        id: 1,
        constructors: 'You',
        dominoes,
        regions,
      },
      hard: {
        id: 2,
        constructors: 'You',
        dominoes,
        regions,
      },
    };

    mode = 'play';
  }

  // Switch back to build mode
  function backToBuild() {
    mode = 'build';
    customPuzzleData = null;
  }

  // Reset everything
  function resetBuilder() {
    mode = 'build';
    customPuzzleData = null;
    initGrid();
  }

  // Get border classes for region boundaries in the builder grid
  function getBorderClasses(row: number, col: number): string {
    const rid = regionMap[row]?.[col] ?? 0;
    let classes = '';

    const topRid = row > 0 ? (regionMap[row - 1]?.[col] ?? -1) : -2;
    const botRid = row < gridRows - 1 ? (regionMap[row + 1]?.[col] ?? -1) : -2;
    const leftRid = col > 0 ? (regionMap[row]?.[col - 1] ?? -1) : -2;
    const rightRid = col < gridCols - 1 ? (regionMap[row]?.[col + 1] ?? -1) : -2;

    classes += topRid !== rid ? ' border-t-2 border-t-gray-400 dark:border-t-gray-500' : ' border-t border-t-gray-200 dark:border-t-gray-700';
    classes += botRid !== rid ? ' border-b-2 border-b-gray-400 dark:border-b-gray-500' : ' border-b border-b-gray-200 dark:border-b-gray-700';
    classes += leftRid !== rid ? ' border-l-2 border-l-gray-400 dark:border-l-gray-500' : ' border-l border-l-gray-200 dark:border-l-gray-700';
    classes += rightRid !== rid ? ' border-r-2 border-r-gray-400 dark:border-r-gray-500' : ' border-r border-r-gray-200 dark:border-r-gray-700';

    return classes;
  }

  // Get palette color for a cell
  function getCellColorClass(row: number, col: number): string {
    const rid = regionMap[row]?.[col] ?? 0;
    const paletteIdx = rid % regionPalette.length;
    return regionPalette[paletteIdx].fill;
  }

  // Get region badge for first cell
  function isFirstCellOfRegion(row: number, col: number): boolean {
    const rid = regionMap[row]?.[col];
    if (rid === undefined) return false;
    // Check if this is the first occurrence of this region ID when scanning left-to-right, top-to-bottom
    for (let r = 0; r <= row; r++) {
      for (let c = 0; c <= (r === row ? col : gridCols - 1); c++) {
        if (regionMap[r][c] === rid) {
          return r === row && c === col;
        }
      }
    }
    return false;
  }

  // Get region label for a region ID
  function getRegionBadgeLabel(rid: number): string {
    const def = regionDefs.get(rid);
    if (!def) return `R${rid + 1}`;
    const symbol = REGION_LABELS[def.type] || '?';
    if (def.type === 'empty' || def.target === undefined) return symbol;
    return `${symbol}${def.target}`;
  }

  // Initialize on mount
  $effect(() => {
    initGrid();
  });
</script>

<div class="space-y-6">
  {#if mode === 'build'}
    <!-- Build Mode -->
    <div class="grid lg:grid-cols-5 gap-6">
      <!-- Grid Editor -->
      <div class="lg:col-span-3">
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">Grid Editor</h3>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <label for="grid-rows" class="text-xs text-gray-500 dark:text-gray-400">Rows:</label>
                <select
                  id="grid-rows"
                  bind:value={gridRows}
                  onchange={initGrid}
                  class="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                </select>
              </div>
              <div class="flex items-center gap-1.5">
                <label for="grid-cols" class="text-xs text-gray-500 dark:text-gray-400">Cols:</label>
                <select
                  id="grid-cols"
                  bind:value={gridCols}
                  onchange={initGrid}
                  class="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                >
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Region palette selector -->
          <div class="mb-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Select a region color, then click cells to paint:</p>
            <div class="flex flex-wrap gap-2">
              {#each regions as rid}
                <button
                  onclick={() => (paintRegion = rid)}
                  class="px-3 py-1.5 rounded-md text-xs font-semibold transition-all {paintRegion === rid
                    ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-900'
                    : ''} {regionPalette[rid % regionPalette.length].bg} {regionPalette[rid % regionPalette.length].text}"
                >
                  R{rid + 1}
                </button>
              {/each}
              <button
                onclick={addRegion}
                class="px-3 py-1.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                + New Region
              </button>
            </div>
          </div>

          <!-- The Grid -->
          <div class="flex justify-center overflow-x-auto">
            <div
              class="inline-grid gap-0"
              style="grid-template-columns: repeat({gridCols}, minmax(0, 1fr));"
            >
              {#each Array(gridRows) as _, r}
                {#each Array(gridCols) as __, c}
                  {@const rid = regionMap[r]?.[c] ?? 0}
                  {@const isFirst = isFirstCellOfRegion(r, c)}

                  <button
                    onclick={() => paintCell(r, c)}
                    class="relative aspect-square flex items-center justify-center {getCellColorClass(r, c)} {getBorderClasses(r, c)} hover:opacity-80 transition-opacity"
                    style="min-width: 56px; min-height: 56px; max-width: 76px; max-height: 76px;"
                    aria-label="Cell {r},{c}: Region {rid}"
                  >
                    <span class="text-sm font-bold text-gray-500 dark:text-gray-400 opacity-50">R{rid + 1}</span>

                    <!-- Region badge on first cell -->
                    {#if isFirst && regionDefs.has(rid)}
                      <span
                        class="absolute -top-0.5 -left-0.5 px-1 py-0.5 rounded text-[9px] font-bold leading-none {regionPalette[rid % regionPalette.length].bg} {regionPalette[rid % regionPalette.length].text}"
                      >
                        {getRegionBadgeLabel(rid)}
                      </span>
                    {/if}
                  </button>
                {/each}
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- Region Editor Panel -->
      <div class="lg:col-span-2">
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Region Conditions</h3>
          <div class="space-y-3 max-h-96 overflow-y-auto pr-1" style="scrollbar-width: thin;">
            {#each regions as rid}
              {@const def = regionDefs.get(rid) || { type: 'empty', target: 0 }}
              {@const paletteIdx = rid % regionPalette.length}
              {@const cellCount = regionMap.flat().filter((c) => c === rid).length}

              <div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 {regionPalette[paletteIdx].bg}">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-semibold {regionPalette[paletteIdx].text}">
                    Region {rid + 1}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {cellCount} cell{cellCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div class="flex gap-2">
                  <select
                    value={def.type}
                    onchange={(e) => updateRegionType(rid, (e.target as HTMLSelectElement).value as Region['type'])}
                    class="flex-1 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                  >
                    {#each regionTypes as rt}
                      <option value={rt.type}>{rt.label}</option>
                    {/each}
                  </select>
                  {#if def.type !== 'empty'}
                    <input
                      type="number"
                      value={def.target}
                      onchange={(e) => updateRegionTarget(rid, parseInt((e.target as HTMLInputElement).value) || 0)}
                      class="w-16 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-center text-gray-900 dark:text-gray-100"
                      min="0"
                      max="99"
                      placeholder="Target"
                    />
                  {/if}
                </div>
                {#if rid > 0}
                  <button
                    onclick={() => removeRegion(rid)}
                    class="mt-2 text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                  >
                    Remove region
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <!-- Actions -->
        <div class="space-y-3 mt-4">
          <button
            onclick={playPuzzle}
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors shadow-md"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            Play This Puzzle
          </button>

          <button
            onclick={() => {
              // Auto-generate dominoes and show what they'd be
              const dominoes = generateDominoes();
              alert(`Generated ${dominoes.length} dominoes: ${dominoes.map((d) => `[${d[0]}|${d[1]}]`).join(', ')}`);
            }}
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Auto-Generate Dominoes
          </button>

          <button
            onclick={resetBuilder}
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Builder
          </button>
        </div>
      </div>
    </div>
  {:else if mode === 'play' && customPuzzleData}
    <!-- Play Mode -->
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 text-lg">Custom Puzzle</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {gridRows}&times;{gridCols} grid &middot; {regions.length} region{regions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onclick={backToBuild}
          class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          &larr; Back to Editor
        </button>
      </div>

      <!-- Simplified play view with the grid -->
      {#key customPuzzleData}
        {@const puzzle = customPuzzleData.easy}
        {@const puzzleRegions = puzzle.regions}

        <!-- Build grid dimensions from regions -->
        {@const maxRow = Math.max(...puzzleRegions.flatMap((r: Region) => r.indices.map((i: number[]) => i[0]))) + 1}
        {@const maxCol = Math.max(...puzzleRegions.flatMap((r: Region) => r.indices.map((i: number[]) => i[1]))) + 1}

        <!-- Region cell map -->
        {@const cellRMap = new Map<string, number>()}
        {#each puzzleRegions as region, idx}
          {#each region.indices as [r, c]}
            {@const _ = cellRMap.set(`${r},${c}`, idx)}
          {/each}
        {/each}

        <div class="flex justify-center mb-6 overflow-x-auto">
          <div
            class="inline-grid gap-0"
            style="grid-template-columns: repeat({maxCol}, minmax(0, 1fr));"
          >
            {#each Array(maxRow) as _, r}
              {#each Array(maxCol) as __, c}
                {@const rIdx = cellRMap.get(`${r},${c}`) ?? -1}
                {@const region = rIdx >= 0 ? puzzleRegions[rIdx] : null}

                <!-- Determine cell bg color based on region type -->
                {@const cellBg = region
                  ? region.type === 'sum' ? 'bg-blue-50 dark:bg-blue-950/40'
                    : region.type === 'equals' ? 'bg-emerald-50 dark:bg-emerald-950/40'
                      : region.type === 'unequal' ? 'bg-amber-50 dark:bg-amber-950/40'
                        : region.type === 'less' ? 'bg-violet-50 dark:bg-violet-950/40'
                          : region.type === 'greater' ? 'bg-red-50 dark:bg-red-950/40'
                            : 'bg-gray-50 dark:bg-gray-800/40'
                  : 'bg-gray-50 dark:bg-gray-800/40'}

                <!-- Check first cell of region -->
                {@const isFirst = rIdx >= 0 && region && region.indices[0][0] === r && region.indices[0][1] === c}

                <!-- Border logic -->
                {@const topRid = r > 0 ? (cellRMap.get(`${r-1},${c}`) ?? -2) : -2}
                {@const botRid = r < maxRow - 1 ? (cellRMap.get(`${r+1},${c}`) ?? -2) : -2}
                {@const leftRid = c > 0 ? (cellRMap.get(`${r},${c-1}`) ?? -2) : -2}
                {@const rightRid = c < maxCol - 1 ? (cellRMap.get(`${r},${c+1}`) ?? -2) : -2}

                <div
                  class="relative aspect-square flex items-center justify-center {cellBg} {topRid !== rIdx ? 'border-t-2 border-t-gray-400 dark:border-t-gray-500' : 'border-t border-t-gray-200 dark:border-t-gray-700'} {botRid !== rIdx ? 'border-b-2 border-b-gray-400 dark:border-b-gray-500' : 'border-b border-b-gray-200 dark:border-b-gray-700'} {leftRid !== rIdx ? 'border-l-2 border-l-gray-400 dark:border-l-gray-500' : 'border-l border-l-gray-200 dark:border-l-gray-700'} {rightRid !== rIdx ? 'border-r-2 border-r-gray-400 dark:border-r-gray-500' : 'border-r border-r-gray-200 dark:border-r-gray-700'}"
                  style="min-width: 56px; min-height: 56px; max-width: 76px; max-height: 76px;"
                >
                  <span class="text-sm text-gray-400 dark:text-gray-500">&middot;</span>

                  {#if isFirst && region}
                    {@const badgeClass = REGION_COLORS[region.type] || REGION_COLORS['empty']}
                    {@const label = (REGION_LABELS[region.type] || '?') + (region.target !== undefined ? region.target : '')}
                    <span class="absolute -top-0.5 -left-0.5 px-1 py-0.5 rounded text-[9px] font-bold leading-none {badgeClass}">
                      {label}
                    </span>
                  {/if}
                </div>
              {/each}
            {/each}
          </div>
        </div>

        <!-- Domino list -->
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Dominoes ({puzzle.dominoes.length})
          </h4>
          <div class="flex flex-wrap gap-2">
            {#each puzzle.dominoes as domino}
              <div class="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-sm font-bold border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                <span>{domino[0]}</span>
                <span class="text-gray-400 mx-0.5">|</span>
                <span>{domino[1]}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Region constraints summary -->
        <div class="flex flex-wrap gap-2">
          {#each puzzleRegions as region, idx}
            {@const badgeClass = REGION_COLORS[region.type] || REGION_COLORS['empty']}
            {@const label = (REGION_LABELS[region.type] || '?') + (region.target !== undefined ? region.target : '')}
            <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold {badgeClass}">
              {label}
              <span class="font-normal opacity-70">({region.indices.length})</span>
            </span>
          {/each}
        </div>
      {/key}

      <!-- Note about play mode -->
      <div class="mt-6 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <p class="text-sm text-amber-700 dark:text-amber-300">
          This is a preview of your custom puzzle. The full interactive game board requires domino values and solution data that can be generated automatically.
        </p>
      </div>
    </div>
  {/if}
</div>
