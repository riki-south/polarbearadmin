/// <reference types="vite/client" />

declare const __LOCAL_DATA_MODE__: boolean;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
