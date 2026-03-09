import { createJsonResponse, type CloudflareEnv } from "../../../_utils";

const hotWords = [
  ["周杰伦", "经典华语热搜"],
  ["晴天", "高频点播"],
  ["赵雷", "民谣热度持续"],
  ["林俊杰", "常驻搜索榜"],
  ["陈奕迅", "热门男歌手"],
];

export const onRequestGet: PagesFunction<CloudflareEnv> = async () => {
  return createJsonResponse({
    code: 200,
    data: hotWords.map(([searchWord, content], index) => ({
      searchWord,
      score: 100 - index * 7,
      content,
      iconUrl: index < 2 ? "hot" : "",
      iconType: index < 2 ? 1 : 0,
    })),
  });
};
