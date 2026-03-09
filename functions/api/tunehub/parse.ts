import { createErrorResponse, type CloudflareEnv } from "../../_utils";

export const onRequestPost: PagesFunction<CloudflareEnv> = async (context) => {
  try {
    const apiKey = context.env.TUNEHUB_API_KEY;
    if (!apiKey) {
      return createErrorResponse("TUNEHUB_API_KEY 未配置", 500);
    }

    const response = await fetch("https://tunehub.sayqz.com/api/v1/parse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: await context.request.text(),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error.message : "TuneHub 解析失败", 500);
  }
};
