import {
  createErrorResponse,
  createJsonResponse,
  normalizeQQMusicResponse,
  parseTuneHubSong,
  searchFirstSong,
  type CloudflareEnv,
} from "../../_utils";

export const onRequestGet: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const keyword = url.searchParams.get("keyword") || "";
    if (!keyword) {
      return createErrorResponse("缺少 keyword 参数");
    }

    let song = await searchFirstSong(context.env, "qq", keyword);
    if (!song?.id) {
      song = await searchFirstSong(context.env, "kuwo", keyword);
    }
    if (!song?.id) {
      return createJsonResponse({ code: 404, message: "未找到匹配歌曲" }, 404);
    }

    const parsed = await parseTuneHubSong(context.env, song.platform, song.id, "320k");
    return createJsonResponse(normalizeQQMusicResponse(song, parsed));
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "QQ 匹配失败", 500);
  }
};
