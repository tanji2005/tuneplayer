import { createErrorResponse, createJsonResponse, searchSongs, type CloudflareEnv } from "../../_utils";

export const onRequestGet: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const keyword = url.searchParams.get("keyword") || "";
    const page = Number(url.searchParams.get("page") || "1");
    const pageSize = Number(url.searchParams.get("pageSize") || "20");

    if (!keyword) {
      return createErrorResponse("缺少 keyword 参数");
    }

    let songs = await searchSongs(context.env, "qq", keyword, page, pageSize);
    if (songs.length === 0) {
      songs = await searchSongs(context.env, "kuwo", keyword, page, pageSize);
    }
    return createJsonResponse({
      code: 200,
      songs,
      total: songs.length,
      message: "success",
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "QQ 搜索失败", 500);
  }
};
