import {
  createErrorResponse,
  createJsonResponse,
  parseTuneHubSong,
  searchFirstSong,
  type CloudflareEnv,
} from "../../_utils";

const platformMap = {
  netease: "netease",
  kuwo: "kuwo",
  bodian: "kuwo",
  gequbao: "kuwo",
  qq: "qq",
} as const;

export const onRequestGet: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const routePlatform = String(context.params.platform || "");
    const platform = platformMap[routePlatform as keyof typeof platformMap];
    if (!platform) {
      return createErrorResponse("不支持的解锁平台", 404, 404);
    }

    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");
    const keyword = url.searchParams.get("keyword");
    const quality = url.searchParams.get("quality") || "320k";

    let finalId = id;
    if (!finalId && keyword && platform !== "netease") {
      const matchedSong = await searchFirstSong(context.env, platform, keyword);
      finalId = matchedSong?.id || null;
    }

    if (!finalId) {
      return createJsonResponse({ code: 404, url: null, message: "未找到可解析的歌曲" }, 404);
    }

    const parsed = await parseTuneHubSong(context.env, platform, finalId, quality);
    if (!parsed?.success || !parsed.url) {
      return createJsonResponse({ code: 404, url: null, message: "解析失败" }, 404);
    }

    return createJsonResponse({
      code: 200,
      url: parsed.url,
      cover: parsed.cover,
      actualQuality: parsed.actualQuality,
      requestedQuality: parsed.requestedQuality,
      qualityMatch: parsed.qualityMatch,
      wasDowngraded: parsed.wasDowngraded,
      info: parsed.info,
      platform,
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "解锁失败", 500);
  }
};
