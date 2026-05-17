<script lang="ts">
  import { onMount } from 'svelte';
  import type { StatsResponse } from '../../lib/types';
  import { getStats } from '../../lib/api';

  let stats = $state<StatsResponse | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let canvasRegion: HTMLCanvasElement | undefined = $state();
  let canvasConstructor: HTMLCanvasElement | undefined = $state();
  let chartInstances: any[] = [];

  const regionTypeColors: Record<string, { bg: string; border: string }> = {
    sum: { bg: 'rgba(37, 99, 235, 0.7)', border: 'rgb(37, 99, 235)' },
    equals: { bg: 'rgba(16, 185, 129, 0.7)', border: 'rgb(16, 185, 129)' },
    unequal: { bg: 'rgba(245, 158, 11, 0.7)', border: 'rgb(245, 158, 11)' },
    less: { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgb(139, 92, 246)' },
    greater: { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgb(239, 68, 68)' },
    empty: { bg: 'rgba(107, 114, 128, 0.7)', border: 'rgb(107, 114, 128)' },
  };

  const regionTypeLabels: Record<string, string> = {
    sum: 'Sum (&Sigma;)',
    equals: 'Equals (=)',
    unequal: 'Unequal (&ne;)',
    less: 'Less Than (<)',
    greater: 'Greater Than (>)',
    empty: 'Empty',
  };

  async function loadStats() {
    loading = true;
    error = null;
    try {
      stats = await getStats();
    } catch (e: any) {
      error = 'Failed to load statistics';
    } finally {
      loading = false;
    }
  }

  function isDarkMode(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  }

  async function renderCharts() {
    if (!stats) return;

    // Destroy previous charts
    for (const chart of chartInstances) {
      chart.destroy();
    }
    chartInstances = [];

    // Lazy load Chart.js
    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const dark = isDarkMode();
    const textColor = dark ? '#9CA3AF' : '#6B7280';
    const gridColor = dark ? 'rgba(75, 85, 99, 0.3)' : 'rgba(209, 213, 219, 0.5)';
    const titleColor = dark ? '#F3F4F6' : '#111827';

    // Region type distribution bar chart
    if (canvasRegion && stats.regionTypeDistribution) {
      const labels: string[] = [];
      const data: number[] = [];
      const bgColors: string[] = [];
      const borderColors: string[] = [];

      for (const [type, count] of Object.entries(stats.regionTypeDistribution)) {
        if (count > 0) {
          labels.push(regionTypeLabels[type] || type);
          data.push(count);
          const colors = regionTypeColors[type] || regionTypeColors['empty'];
          bgColors.push(colors.bg);
          borderColors.push(colors.border);
        }
      }

      const regionChart = new Chart(canvasRegion, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Count',
              data,
              backgroundColor: bgColors,
              borderColor: borderColors,
              borderWidth: 1,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Region Type Distribution',
              font: { size: 14, weight: 'bold' },
              color: titleColor,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
            x: {
              ticks: { color: textColor },
              grid: { display: false },
            },
          },
        },
      });
      chartInstances.push(regionChart);
    }

    // Top constructors horizontal bar
    if (canvasConstructor && stats.topConstructors && stats.topConstructors.length > 0) {
      const top5 = stats.topConstructors.slice(0, 5);

      const constructorChart = new Chart(canvasConstructor, {
        type: 'bar',
        data: {
          labels: top5.map((c) => c.constructors),
          datasets: [
            {
              label: 'Puzzles',
              data: top5.map((c) => c.count),
              backgroundColor: 'rgba(139, 92, 246, 0.7)',
              borderColor: 'rgb(139, 92, 246)',
              borderWidth: 1,
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Top 5 Constructors',
              font: { size: 14, weight: 'bold' },
              color: titleColor,
            },
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { color: textColor },
              grid: { color: gridColor },
            },
            y: {
              ticks: { color: textColor },
              grid: { display: false },
            },
          },
        },
      });
      chartInstances.push(constructorChart);
    }
  }

  onMount(async () => {
    await loadStats();
    if (stats) {
      await renderCharts();
    }
  });

  // Summary card helpers
  let regionTypeCount = $derived(
    stats?.regionTypeDistribution
      ? Object.values(stats.regionTypeDistribution).filter((v) => v > 0).length
      : 0
  );

  let dateRangeText = $derived.by(() => {
    if (!stats?.dateRange?.first || !stats?.dateRange?.last) return 'N/A';
    try {
      const first = new Date(stats.dateRange.first + 'T00:00:00');
      const last = new Date(stats.dateRange.last + 'T00:00:00');
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return `${fmt(first)} - ${fmt(last)}`;
    } catch {
      return `${stats.dateRange.first} to ${stats.dateRange.last}`;
    }
  });
</script>

<div class="space-y-6">
  {#if loading}
    <!-- Loading skeletons -->
    <div class="grid sm:grid-cols-3 gap-4">
      {#each Array(3) as _}
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 animate-pulse">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
          <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      {/each}
    </div>
    <div class="grid lg:grid-cols-2 gap-6">
      {#each Array(2) as _}
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 animate-pulse">
          <div class="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      {/each}
    </div>
  {:else if error}
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Failed to Load Stats</h2>
      <p class="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
      <button
        onclick={loadStats}
        class="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
      >
        Retry
      </button>
    </div>
  {:else if stats}
    <!-- Summary Cards -->
    <div class="grid sm:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Puzzles</p>
        <p class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {stats.totalPuzzles.toLocaleString()}
        </p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Date Range</p>
        <p class="text-lg font-bold text-gray-900 dark:text-gray-100">{dateRangeText()}</p>
      </div>
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Region Types</p>
        <p class="text-3xl font-bold text-violet-600 dark:text-violet-400">{regionTypeCount}</p>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Region Distribution Chart -->
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <canvas bind:this={canvasRegion}></canvas>
      </div>

      <!-- Top Constructors Chart -->
      <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
        <canvas bind:this={canvasConstructor}></canvas>
      </div>
    </div>

    <!-- Region Distribution Details Table -->
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">Region Distribution Details</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Type</th>
              <th class="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Count</th>
              <th class="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {#each Object.entries(stats.regionTypeDistribution).filter(([_, v]) => v > 0).sort(([_, a], [__, b]) => b - a) as [type, count]}
              {@const total = Object.values(stats.regionTypeDistribution).reduce((a, b) => a + b, 0)}
              {@const percentage = total > 0 ? (count / total) * 100 : 0}
              {@const colors = regionTypeColors[type] || regionTypeColors['empty']}
              <tr class="border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td class="py-2 px-3">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-sm" style="background-color: {colors.border}"></span>
                    <span class="font-medium text-gray-900 dark:text-gray-100">{regionTypeLabels[type] || type}</span>
                  </div>
                </td>
                <td class="py-2 px-3 text-right text-gray-700 dark:text-gray-300">{count.toLocaleString()}</td>
                <td class="py-2 px-3">
                  <div class="flex items-center justify-end gap-2">
                    <div class="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div class="h-full rounded-full" style="width: {percentage}%; background-color: {colors.border}"></div>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">{percentage.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Additional Stats -->
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#if stats.recentAdditions}
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Added Last 7 Days</p>
          <p class="text-2xl font-bold text-green-600 dark:text-green-400">{stats.recentAdditions.last7Days}</p>
        </div>
      {/if}
      {#if stats.idRange}
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Puzzle ID Range</p>
          <p class="text-lg font-bold text-gray-900 dark:text-gray-100">
            {stats.idRange.min ?? '?'} &ndash; {stats.idRange.max ?? '?'}
          </p>
        </div>
      {/if}
      {#if stats.editors && stats.editors.length > 0}
        <div class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-1">Editors</p>
          <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.editors.length}</p>
        </div>
      {/if}
    </div>
  {/if}
</div>
