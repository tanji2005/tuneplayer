import {
  createErrorResponse,
  createJsonResponse,
  mergeSearchSongs,
  searchSongs,
  toAlbumSearchResult,
  toArtistSearchResult,
  toSongSearchResult,
  type CloudflareEnv,
} from "../../_utils";

export const onRequestGet: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const keywords = url.searchParams.get("keywords") || "";
    if (!keywords) {
      return createErrorResponse("缺少 keywords 参数");
    }

    const [neteaseSongs, kuwoSongs] = await Promise.all([
      searchSongs(context.env, "netease", keywords, 1, 5).catch(() => []),
      searchSongs(context.env, "kuwo", keywords, 1, 5).catch(() => []),
    ]);
    const mergedSongs = mergeSearchSongs([...neteaseSongs, ...kuwoSongs]).slice(0, 5);
    const songs = toSongSearchResult(mergedSongs);
    const artists = toArtistSearchResult(mergedSongs).slice(0, 3);
    const albums = toAlbumSearchResult(mergedSongs).slice(0, 3);

    const order = ["songs"];
    if (artists.length > 0) order.push("artists");
    if (albums.length > 0) order.push("albums");

    return createJsonResponse({
      code: 200,
      result: {
        order,
        songs,
        artists,
        albums,
      },
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "搜索建议失败", 500);
  }
};
