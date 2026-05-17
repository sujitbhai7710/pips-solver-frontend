<script lang="ts">
  import type { Region, GridCell, RegionCondition } from '../../lib/types';
  import { REGION_COLORS, REGION_TYPES } from '../../lib/constants';

  interface Props {
    grid: number[][];
    regions: Region[];
    regionConditions: RegionCondition[];
    highlights?: Set<string>;
    size?: number;
  }

  let { grid, regions, regionConditions, highlights = new Set<string>(), size = 0 }: Props = $props();

  const rows = $derived(grid.length);
  const cols = $derived(grid[0]?.length ?? 0);

  // Build a map from "row,col" to regionId
  const cellRegionMap = $derived(() => {
    const map = new Map<string, number>();
    for (const region of regions) {
      for (const [r, c] of region.cells) {
        map.set(`${r},${c}`, region.id);
      }
    }
    return map;
  });

  const regionMap = $derived(cellRegionMap());

  function getRegionId(row: number, col: number): number {
    return regionMap.get(`${row},${col}`) ?? 0;
  }

  function getRegionColorClass(regionId: number): string {
    const idx = regionId % REGION_COLORS.length;
    return REGION_COLORS[idx].bg;
  }

  function getConditionForRegion(regionId: number): RegionCondition | undefined {
    return regionConditions.find((c) => {
      const region = regions.find((r) => r.id === regionId);
      return region?.id === regionId;
    });
  }

  function getRegionConditionLabel(regionId: number): string {
    const condition = regionConditions[regionId];
    if (!condition) return '';
    const symbols: Record<string, string> = {
      equals: '=',
      not_equals: '≠',
      sum: 'Σ',
      less_than: '<',
      greater_than: '>',
    };
    return `${symbols[condition.type] || '?'}${condition.value}`;
  }

  // Check if a cell should have a thicker border on any side
  // (if the adjacent cell is in a different region)
  function getBorderClasses(row: number, col: number): string {
    let classes = '';
    const rid = getRegionId(row, col);
    // Top
    if (row === 0 || getRegionId(row - 1, col) !== rid) classes += ' border-t-2 border-t-gray-400 dark:border-t-gray-500';
    else classes += ' border-t border-gray-200 dark:border-gray-700';
    // Bottom
    if (row === rows - 1 || getRegionId(row + 1, col) !== rid) classes += ' border-b-2 border-b-gray-400 dark:border-b-gray-500';
    else classes += ' border-b border-gray-200 dark:border-gray-700';
    // Left
    if (col === 0 || getRegionId(row, col - 1) !== rid) classes += ' border-l-2 border-l-gray-400 dark:border-l-gray-500';
    else classes += ' border-l border-gray-200 dark:border-gray-700';
    // Right
    if (col === cols - 1 || getRegionId(row, col + 1) !== rid) classes += ' border-r-2 border-r-gray-400 dark:border-r-gray-500';
    else classes += ' border-r border-gray-200 dark:border-gray-700';
    return classes;
  }

  function isHighlighted(row: number, col: number): boolean {
    return highlights.has(`${row},${col}`);
  }

  const cellSize = $derived(size > 0 ? `${size}px` : undefined);
</script>

<div
  class="inline-grid gap-0"
  style="grid-template-columns: repeat({cols}, minmax(0, 1fr)); {cellSize ? `width: ${cols * (size! / cols + 4)}px` : ''}"
>
  {#each grid as row, r}
    {#each row as cell, c}
      <div
        class="grid-cell aspect-square {getRegionColorClass(getRegionId(r, c))} {getBorderClasses(r, c)} {isHighlighted(r, c) ? 'highlight' : ''}"
        style={cellSize ? `width: ${cellSize}; height: ${cellSize};` : ''}
        data-row={r}
        data-col={c}
        data-region={getRegionId(r, c)}
      >
        <span class="text-base sm:text-lg font-bold">{cell !== 0 ? cell : ''}</span>
      </div>
    {/each}
  {/each}
</div>

<!-- Region condition badges -->
{#if regionConditions.length > 0}
  <div class="flex flex-wrap gap-2 mt-4">
    {#each regionConditions as condition, idx}
      <span
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold {REGION_COLORS[idx % REGION_COLORS.length].bg} {REGION_COLORS[idx % REGION_COLORS.length].text}"
      >
        R{idx + 1}: {condition.label}
      </span>
    {/each}
  </div>
{/if}
