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
    const id = url.searchParams.get("id");
    const name = url.searchParams.get("name") || "";
    const artist = url.searchParams.get("artist") || "";

    let song = null;
    let songId = id;

    if (!songId) {
      const keyword = [name, artist].filter(Boolean).join("-");
      if (!keyword) {
        return createErrorResponse("缺少 id 或 name/artist 参数");
      }
      song = await searchFirstSong(context.env, "qq", keyword);
      if (!song?.id) {
        song = await searchFirstSong(context.env, "kuwo", keyword);
      }
      songId = song?.id || null;
    } else {
      song = {
        id: songId,
        name,
        artist,
        album: "",
        platform: "qq",
      };
    }

    if (!songId) {
      return createJsonResponse({ code: 404, message: "未找到歌词" }, 404);
    }

    const parsed = await parseTuneHubSong(context.env, song.platform, songId, "320k");
    return createJsonResponse(normalizeQQMusicResponse(song, parsed));
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "QQ 歌词获取失败", 500);
  }
};
