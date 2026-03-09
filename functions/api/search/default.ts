import { createJsonResponse, type CloudflareEnv } from "../../_utils";

const defaultKeywords = ["周杰伦", "赵雷", "林俊杰", "陈奕迅", "五月天"];

export const onRequestGet: PagesFunction<CloudflareEnv> = async () => {
  const index = Math.floor(Date.now() / 60000) % defaultKeywords.length;
  const keyword = defaultKeywords[index];
  return createJsonResponse({
    code: 200,
    data: {
      showKeyword: keyword,
      realkeyword: keyword,
    },
  });
};
