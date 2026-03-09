export interface CloudflareEnv {
  NETEASE_API_URL: string;
  TUNEHUB_API_KEY: string;
}

interface TuneHubResponse<T> {
  code: number;
  success: boolean;
  message: string;
  data: T;
}

interface TuneHubMethodConfig {
  type: "http";
  method: "GET" | "POST";
  url: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  transform?: string;
}

export interface TuneHubParsedSong {
  id: string;
  success: boolean;
  url?: string;
  info?: {
    name?: string;
    artist?: string;
    album?: string;
    duration?: number;
  };
  cover?: string;
  lyrics?: string;
  wordByWordLyrics?: string;
  requestedQuality?: string;
  actualQuality?: string;
  qualityMatch?: boolean;
  wasDowngraded?: boolean;
}

interface SearchSong {
  id: string;
  name: string;
  artist: string;
  album: string;
  platform: "qq" | "kuwo" | "netease";
}

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export const createJsonResponse = (data: unknown, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders,
  });
};

export const createErrorResponse = (message: string, status = 400, code = -1) => {
  return createJsonResponse({ code, success: false, message }, status);
};

export const getRequiredEnv = (env: CloudflareEnv, key: keyof CloudflareEnv) => {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} 未配置`);
  }
  return value;
};

export const proxyRequest = async (request: Request, target: URL) => {
  const response = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
    redirect: "follow",
  });

  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  return new Response(response.body, {
    status: response.status,
    headers,
  });
};

const fetchTuneHub = async <T>(
  env: CloudflareEnv,
  path: string,
  init: RequestInit = {},
): Promise<TuneHubResponse<T>> => {
  const apiKey = getRequiredEnv(env, "TUNEHUB_API_KEY");
  const response = await fetch(`https://tunehub.sayqz.com/api${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`TuneHub 请求失败: ${response.status}`);
  }

  return (await response.json()) as TuneHubResponse<T>;
};

export const parseTuneHubSong = async (
  env: CloudflareEnv,
  platform: "netease" | "qq" | "kuwo",
  ids: string,
  quality = "320k",
) => {
  const result = await fetchTuneHub<{ data: TuneHubParsedSong[] } | { data?: never }>(
    env,
    "/v1/parse",
    {
      method: "POST",
      body: JSON.stringify({ platform, ids, quality }),
    },
  );

  const data = (result.data as { data?: TuneHubParsedSong[] } | undefined)?.data;
  return data?.[0] ?? null;
};

const fetchMethodConfig = async (
  env: CloudflareEnv,
  platform: "qq" | "kuwo" | "netease",
  func: "search",
) => {
  const result = await fetchTuneHub<TuneHubMethodConfig>(env, `/v1/methods/${platform}/${func}`);
  return result.data;
};

const replaceTemplateValue = (value: string, vars: Record<string, string | number>) => {
  if (!value.includes("{{")) return value;

  return value.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, rawExpr: string) => {
    const expr = rawExpr.trim();
    if (expr === "keyword") return String(vars.keyword ?? "");
    if (expr === "page || 1") return String(vars.page || 1);
    if (expr === "limit || 20") return String(vars.limit || vars.pageSize || 20);
    if (expr === "pageSize || 20") return String(vars.pageSize || vars.limit || 20);
    if (expr === "(page || 1) - 1") return String(Math.max(Number(vars.page || 1) - 1, 0));
    return String(vars[expr] ?? "");
  });
};

const renderConfig = (
  config: TuneHubMethodConfig,
  vars: Record<string, string | number>,
): TuneHubMethodConfig => {
  const params = Object.fromEntries(
    Object.entries(config.params || {}).map(([key, value]) => [key, replaceTemplateValue(value, vars)]),
  );

  const body = JSON.parse(
    JSON.stringify(config.body || {}, (_key, value) => {
      if (typeof value === "string") return replaceTemplateValue(value, vars);
      return value;
    }),
  ) as Record<string, unknown>;

  return {
    ...config,
    params,
    body,
  };
};

const requestMethod = async (config: TuneHubMethodConfig) => {
  const url = new URL(config.url);
  Object.entries(config.params || {}).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url, {
    method: config.method,
    headers: config.headers,
    body: config.method === "POST" ? JSON.stringify(config.body || {}) : undefined,
  });

  if (!response.ok) {
    throw new Error(`上游请求失败: ${response.status}`);
  }

  return response.json();
};

export const searchSongs = async (
  env: CloudflareEnv,
  platform: "qq" | "kuwo" | "netease",
  keyword: string,
  page = 1,
  limit = 20,
): Promise<SearchSong[]> => {
  const config = await fetchMethodConfig(env, platform, "search");
  const rendered = renderConfig(config, { keyword, page, limit, pageSize: limit });
  const raw = await requestMethod(rendered);

  if (platform === "kuwo") {
    const list = Array.isArray((raw as { abslist?: unknown[] }).abslist)
      ? ((raw as { abslist: Array<Record<string, string>> }).abslist ?? [])
      : [];
    return list.map((item) => ({
      id: String(item.MUSICRID || "").replace("MUSIC_", ""),
      name: item.SONGNAME || item.NAME || "",
      artist: String(item.ARTIST || "").replace(/&/g, ", "),
      album: item.ALBUM || "",
      platform,
    }));
  }

  if (platform === "netease") {
    const list =
      ((raw as { result?: { songs?: Array<Record<string, unknown>> } }).result?.songs ?? []) || [];
    return list.map((item) => ({
      id: String(item.id || ""),
      name: String(item.name || ""),
      artist: Array.isArray(item.artists)
        ? item.artists.map((s) => String((s as { name?: string }).name || "")).join(", ")
        : "",
      album: String((item.album as { name?: string } | undefined)?.name || ""),
      platform,
    }));
  }

  const list =
    ((raw as { req?: { data?: { body?: { song?: { list?: Array<Record<string, unknown>> } } } } }).req
      ?.data?.body?.song?.list ?? []) || [];

  return list.map((item) => ({
    id: String(item.mid || ""),
    name: String(item.name || ""),
    artist: Array.isArray(item.singer)
      ? item.singer.map((s) => String((s as { name?: string }).name || "")).join(", ")
      : "",
    album: String((item.album as { name?: string } | undefined)?.name || ""),
    platform,
  }));
};

export const searchFirstSong = async (
  env: CloudflareEnv,
  platform: "qq" | "kuwo" | "netease",
  keyword: string,
) => {
  const songs = await searchSongs(env, platform, keyword, 1, 10);
  return songs[0] ?? null;
};

const hashStringToNumber = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const mergeSearchSongs = (songs: SearchSong[]) => {
  const map = new Map<string, SearchSong>();
  songs.forEach((song) => {
    const key = `${song.name}::${song.artist}`;
    if (!map.has(key)) {
      map.set(key, song);
    }
  });
  return [...map.values()];
};

export const toSongSearchResult = (songs: SearchSong[]) => {
  const platformLabelMap = {
    netease: "网易云",
    kuwo: "酷我",
    qq: "QQ",
  } satisfies Record<SearchSong["platform"], string>;

  return songs.map((song) => ({
    id: Number(song.id),
    name: song.name,
    ar: song.artist.split(", ").filter(Boolean).map((name, index) => ({
      id: hashStringToNumber(`${song.platform}-artist-${name}-${index}`),
      name,
    })),
    al: {
      id: hashStringToNumber(`${song.platform}-album-${song.album}`),
      name: song.album || "未知专辑",
    },
    dt: 0,
    alia: [`[${platformLabelMap[song.platform]}]`],
    sourcePlatform: song.platform,
  }));
};

export const toArtistSearchResult = (songs: SearchSong[]) => {
  const map = new Map<string, { id: number; name: string; albumSize: number; musicSize: number }>();
  songs.forEach((song) => {
    song.artist
      .split(", ")
      .filter(Boolean)
      .forEach((name) => {
        const key = name.trim();
        const current = map.get(key) || {
          id: hashStringToNumber(`artist-${key}`),
          name: key,
          albumSize: 0,
          musicSize: 0,
        };
        current.musicSize += 1;
        map.set(key, current);
      });
  });
  return [...map.values()];
};

export const toAlbumSearchResult = (songs: SearchSong[]) => {
  const map = new Map<string, { id: number; name: string; artist: { name: string }[]; size: number }>();
  songs.forEach((song) => {
    const key = `${song.album}::${song.artist}`;
    const current = map.get(key) || {
      id: hashStringToNumber(`album-${key}`),
      name: song.album || "未知专辑",
      artist: song.artist
        .split(", ")
        .filter(Boolean)
        .map((name) => ({ name })),
      size: 0,
    };
    current.size += 1;
    map.set(key, current);
  });
  return [...map.values()];
};

export const normalizeQQMusicResponse = (
  song: SearchSong | null,
  parsed: TuneHubParsedSong | null,
) => {
  if (!song || !parsed?.success) {
    return {
      code: 404,
      message: "未找到可用歌词",
    };
  }

  return {
    code: 200,
    song: {
      id: song.id,
      mid: song.id,
      name: song.name,
      artist: song.artist,
      album: song.album,
      duration: (parsed.info?.duration || 0) * 1000,
    },
    lrc: parsed.lyrics || "",
    qrc: parsed.wordByWordLyrics || "",
    message: "success",
  };
};
