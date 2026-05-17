<script lang="ts">
  import type { ArchiveDate } from '../../lib/types';
  import { getArchive } from '../../lib/api';

  const todayStr = new Date().toISOString().split('T')[0];

  let currentMonth = $state(todayStr.slice(0, 7));
  let availableDates = $state<Map<string, ArchiveDate>>(new Map());
  let selectedDate = $state<string | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Parse current month
  let year = $derived(parseInt(currentMonth.split('-')[0]));
  let month = $derived(parseInt(currentMonth.split('-')[1]));

  // Calendar grid computation
  let days = $derived.by(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

    // Previous month filler
    const prevMonthDays = new Date(year, month - 1, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const pm = month - 1 === 0 ? 12 : month - 1;
      const py = month - 1 === 0 ? year - 1 : year;
      days.push({
        date: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month filler (complete 6 rows = 42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = month + 1 === 13 ? 1 : month + 1;
      const ny = month + 1 === 13 ? year + 1 : year;
      days.push({
        date: `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  });

  async function fetchArchive() {
    loading = true;
    error = null;
    try {
      const result = await getArchive(currentMonth);
      const map = new Map<string, ArchiveDate>();
      for (const d of result.dates) {
        map.set(d.date, d);
      }
      availableDates = map;
    } catch (e: any) {
      error = 'Failed to load archive data';
    } finally {
      loading = false;
    }
  }

  function selectDate(date: string, hasPuzzle: boolean) {
    if (!hasPuzzle) return;
    selectedDate = date;

    // Dispatch custom event for parent components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pips-date-selected', { detail: { date } })
      );
    }
  }

  function goToPrevMonth() {
    const [y, m] = currentMonth.split('-').map(Number);
    if (m === 1) {
      currentMonth = `${y - 1}-12`;
    } else {
      currentMonth = `${y}-${String(m - 1).padStart(2, '0')}`;
    }
    fetchArchive();
  }

  function goToNextMonth() {
    const [y, m] = currentMonth.split('-').map(Number);
    if (m === 12) {
      currentMonth = `${y + 1}-01`;
    } else {
      currentMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    fetchArchive();
  }

  function goToToday() {
    currentMonth = todayStr.slice(0, 7);
    fetchArchive();
  }

  // Load archive on mount
  $effect(() => {
    fetchArchive();
  });
</script>

<div class="calendar-picker">
  <!-- Month navigation -->
  <div class="flex items-center justify-between mb-4">
    <button
      onclick={goToPrevMonth}
      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
      aria-label="Previous month"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>

    <div class="flex items-center gap-3">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {monthNames[month - 1]} {year}
      </h2>
      <button
        onclick={goToToday}
        class="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
      >
        Today
      </button>
    </div>

    <button
      onclick={goToNextMonth}
      class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
      aria-label="Next month"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>

  <!-- Weekday headers -->
  <div class="grid grid-cols-7 gap-1 mb-1">
    {#each weekdays as day}
      <div class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
        {day}
      </div>
    {/each}
  </div>

  <!-- Days grid -->
  <div class="grid grid-cols-7 gap-1">
    {#each days as dayInfo}
      {@const hasPuzzle = availableDates.has(dayInfo.date)}
      {@const isToday = dayInfo.date === todayStr}
      {@const isSelected = dayInfo.date === selectedDate}
      {@const archiveDate = availableDates.get(dayInfo.date)}

      <button
        onclick={() => selectDate(dayInfo.date, hasPuzzle)}
        disabled={!dayInfo.isCurrentMonth || !hasPuzzle}
        class="relative aspect-square flex items-center justify-center rounded-lg text-sm transition-all duration-150 {dayInfo.isCurrentMonth
          ? hasPuzzle
            ? isSelected
              ? 'bg-blue-600 text-white font-bold shadow-md ring-2 ring-blue-300 dark:ring-blue-500'
              : 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium hover:bg-blue-100 dark:hover:bg-blue-950/50 cursor-pointer'
            : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : 'text-gray-300 dark:text-gray-700 cursor-default'
        } {isToday && !isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}"
        aria-label="{dayInfo.date}"
      >
        {dayInfo.day}

        <!-- Blue dot indicator for dates with puzzles -->
        {#if hasPuzzle && dayInfo.isCurrentMonth && !isSelected}
          <span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        {/if}

        <!-- Today ring is handled by class above -->
      </button>
    {/each}
  </div>

  <!-- Loading indicator -->
  {#if loading}
    <div class="flex justify-center py-3 mt-3">
      <div class="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  {/if}

  <!-- Error -->
  {#if error}
    <p class="text-sm text-red-500 dark:text-red-400 text-center mt-3">{error}</p>
  {/if}

  <!-- Selected date info -->
  {#if selectedDate && availableDates.has(selectedDate)}
    {@const info = availableDates.get(selectedDate)}
    <div class="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
      <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{selectedDate}</p>
      <div class="flex gap-2">
        {#if info?.hasEasy}
          <span class="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Easy</span>
        {/if}
        {#if info?.hasMedium}
          <span class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Medium</span>
        {/if}
        {#if info?.hasHard}
          <span class="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">Hard</span>
        {/if}
      </div>
      {#if info?.editor}
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Editor: {info.editor}</p>
      {/if}
    </div>
  {:else if !selectedDate}
    <div class="mt-4 text-center text-sm text-gray-400 dark:text-gray-500">
      <p>Select a highlighted date to view its puzzle</p>
    </div>
  {/if}
</div>
