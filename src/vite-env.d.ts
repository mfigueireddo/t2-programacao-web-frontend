/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base do backend, ex.: "http://127.0.0.1:8000". Definida em `.env`. */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
