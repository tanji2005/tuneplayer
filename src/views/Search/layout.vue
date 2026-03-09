<template>
  <div class="search">
    <div class="title">
      <n-text class="keyword">{{ searchKeyword }}</n-text>
      <n-text depth="3">的相关搜索</n-text>
    </div>
    <n-radio-group v-model:value="searchPlatform" class="platforms" @update:value="platformChange">
      <n-radio-button value="all">全部</n-radio-button>
      <n-radio-button value="netease">网易云</n-radio-button>
      <n-radio-button value="kuwo">酷我</n-radio-button>
    </n-radio-group>
    <!-- 标签页 -->
    <n-tabs v-model:value="searchType" class="tabs" type="segment" @update:value="tabChange">
      <n-tab name="search-songs"> 单曲 </n-tab>
    </n-tabs>
    <!-- 路由 -->
    <RouterView v-slot="{ Component }">
      <Transition :name="`router-${settingStore.routeAnimation}`" mode="out-in">
        <KeepAlive v-if="settingStore.useKeepAlive">
          <component
            :is="Component"
            :key="route.fullPath"
            :keyword="searchKeyword"
            class="router-view"
          />
        </KeepAlive>
        <component
          v-else
          :is="Component"
          :key="route.fullPath"
          :keyword="searchKeyword"
          class="router-view"
        />
      </Transition>
    </RouterView>
  </div>
</template>

<script setup lang="ts">
import { useSettingStore } from "@/stores";
const route = useRoute();
const router = useRouter();
const settingStore = useSettingStore();

// 搜索关键词
const searchKeyword = computed(() => route.query.keyword as string);
const searchPlatform = ref<"all" | "netease" | "kuwo">("all");

// 搜索分类
const searchType = ref<string>("search-songs");

// Tabs 改变
const tabChange = (value: string) => {
  router.push({
    name: value,
    query: {
      keyword: searchKeyword.value,
      platform: searchPlatform.value,
    },
  });
};

const platformChange = (value: "all" | "netease" | "kuwo") => {
  router.push({
    name: searchType.value,
    query: {
      keyword: searchKeyword.value,
      platform: value,
    },
  });
};

// 监听路由变化，同步 Tab 状态
watch(
  () => route.name,
  (name) => {
    if (name && name.toString().startsWith("search-")) {
      searchType.value = name as string;
    }
    const platform = String(route.query.platform || "all");
    searchPlatform.value =
      platform === "netease" || platform === "kuwo" ? platform : "all";
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.search {
  display: flex;
  flex-direction: column;
  height: 100%;
  .title {
    margin-top: 12px;
    margin-bottom: 12px;
    font-size: 22px;
    .keyword {
      font-size: 36px;
      font-weight: bold;
      margin-right: 8px;
      line-height: normal;
    }
    .n-text {
      display: inline-block;
    }
  }
  .platforms {
    margin-bottom: 12px;
  }
  .router-view {
    flex: 1;
    overflow: hidden;
  }
}
</style>
