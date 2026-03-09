// Web 端缺少原生 wasm 资源时，回退为透传转换器
export class TextConverter {
  constructor(_config: string) {}

  convert(text: string) {
    return text;
  }
}

export default async function initOpenCC() {
  return Promise.resolve();
}
