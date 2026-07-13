interface ImportMetaEnv {
  readonly NG_APP_API_URL: string;
  readonly NG_APP_CLERK_PUBLISHABLE_KEY: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
