import { DialogApi, LoadingBarApi, MessageApi, ModalApi, NotificationApi } from "naive-ui";

declare global {
  interface ElectronIpcRendererLike {
    send: (channel: string, ...args: unknown[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    removeAllListeners: (channel?: string) => void;
    removeListener: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<any>;
    sendSync: (channel: string, ...args: unknown[]) => any;
  }

  interface Window {
    // naiveui
    $message: MessageApi;
    $dialog: DialogApi;
    $notification: NotificationApi;
    $loadingBar: LoadingBarApi;
    $modal: ModalApi;
    // electron
    api: {
      store: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: unknown) => Promise<boolean>;
        has: (key: string) => Promise<boolean>;
        delete: (key: string) => Promise<boolean>;
        reset: (keys?: string[]) => Promise<boolean>;
        export: (data: any) => Promise<{ success: boolean; path?: string; error?: string }>;
        import: () => Promise<{ success: boolean; data?: any; error?: string }>;
      };
    };
    electron?: {
      ipcRenderer: ElectronIpcRendererLike;
    };
    // logs
    logger: {
      info: (message: string, ...args: unknown[]) => void;
      warn: (message: string, ...args: unknown[]) => void;
      error: (message: string, ...args: unknown[]) => void;
      debug: (message: string, ...args: unknown[]) => void;
    };
  }
}
