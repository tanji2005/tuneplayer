import { createErrorResponse, type CloudflareEnv } from "../../../_utils";

export const onRequestGet: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const apiKey = context.env.TUNEHUB_API_KEY;
    if (!apiKey) {
      return createErrorResponse("TUNEHUB_API_KEY 未配置", 500);
    }

    const path = Array.isArray(context.params.path)
      ? context.params.path.join("/")
      : context.params.path || "";
    const url = new URL(`https://tunehub.sayqz.com/api/v1/methods/${path}`);

    const response = await fetch(url, {
      headers: {
        "X-API-Key": apiKey,
      },
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "TuneHub methods 失败", 500);
  }
};
