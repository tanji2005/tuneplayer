import { createErrorResponse, getRequiredEnv, proxyRequest, type CloudflareEnv } from "../../_utils";

export const onRequest: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const base = getRequiredEnv(context.env, "NETEASE_API_URL").replace(/\/$/, "");
    const path = Array.isArray(context.params.path)
      ? context.params.path.join("/")
      : context.params.path || "";

    const target = new URL(path ? `${base}/${path}` : base);
    const sourceUrl = new URL(context.request.url);
    sourceUrl.searchParams.forEach((value, key) => {
      target.searchParams.set(key, value);
    });

    return await proxyRequest(context.request, target);
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "网易云代理失败", 500);
  }
};
