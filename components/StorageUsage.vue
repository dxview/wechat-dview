<script setup lang="ts">
import { db } from '~/store/v2/db';

const usage = ref('');
const clearing = ref(false);

async function init() {
  const storageUsage = await navigator.storage.estimate();
  const bytes = storageUsage.usage!;
  if (bytes < 1000) {
    usage.value = `${bytes} B`;
  } else if (bytes < 1000 ** 2) {
    usage.value = `${(bytes / 1000).toFixed(0)} kB`;
  } else if (bytes < 1000 ** 3) {
    usage.value = `${(bytes / 1000 ** 2).toFixed(1)} M`;
  } else {
    usage.value = `${(bytes / 1000 ** 3).toFixed(1)} G`;
  }
}

async function clearStorage() {
  if (clearing.value) return;
  clearing.value = true;
  try {
    await db.delete();
    window.location.reload();
  } catch {
    clearing.value = false;
  }
}

let timer: number;
onMounted(() => {
  timer = window.setInterval(() => {
    init();
  }, 1000);
});
onUnmounted(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <div class="flex items-center gap-3">
    <p class="text-sm">
      本地缓存 <span class="text-rose-500">{{ usage }}</span>
    </p>
    <button
      class="text-xs px-2 py-0.5 rounded border border-rose-300 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
      :disabled="clearing"
      @click="clearStorage"
    >
      {{ clearing ? '清理中...' : '清空缓存' }}
    </button>
  </div>
</template>
