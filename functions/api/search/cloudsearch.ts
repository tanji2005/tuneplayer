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
    const limit = Number(url.searchParams.get("limit") || "20");
    const offset = Number(url.searchParams.get("offset") || "0");
    const type = Number(url.searchParams.get("type") || "1");

    if (!keywords) {
      return createErrorResponse("缺少 keywords 参数");
    }

    const page = Math.floor(offset / Math.max(limit, 1)) + 1;
    const [neteaseSongs, kuwoSongs] = await Promise.all([
      searchSongs(context.env, "netease", keywords, page, limit).catch(() => []),
      searchSongs(context.env, "kuwo", keywords, page, limit).catch(() => []),
    ]);

    const mergedSongs = mergeSearchSongs([...neteaseSongs, ...kuwoSongs]).slice(0, limit);

    if (type === 1 || type === 1018) {
      return createJsonResponse({
        code: 200,
        result: {
          hasMore: mergedSongs.length >= limit,
          songCount: mergedSongs.length,
          songs: toSongSearchResult(mergedSongs),
        },
      });
    }

    if (type === 100) {
      const artists = toArtistSearchResult(mergedSongs);
      return createJsonResponse({
        code: 200,
        result: {
          hasMore: false,
          artistCount: artists.length,
          artists,
        },
      });
    }

    if (type === 10) {
      const albums = toAlbumSearchResult(mergedSongs);
      return createJsonResponse({
        code: 200,
        result: {
          hasMore: false,
          albumCount: albums.length,
          albums,
        },
      });
    }

    return createJsonResponse({
      code: 200,
      result: {
        hasMore: false,
        songCount: 0,
        playlistCount: 0,
        artistCount: 0,
        albumCount: 0,
        mvCount: 0,
        djRadiosCount: 0,
        songs: [],
        playlists: [],
        artists: [],
        albums: [],
        mvs: [],
        djRadios: [],
      },
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "搜索失败", 500);
  }
};
