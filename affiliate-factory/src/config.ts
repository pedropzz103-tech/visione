export type ConfigMode = 'dry-run' | 'production';

export class ConfigurationError extends Error {
  public constructor(public readonly missing: string[], code = 'MISSING_CONFIGURATION') {
    super(`${code}: ${missing.join(', ')}`);
    this.name = 'ConfigurationError';
  }
}

export type AffiliateFactoryConfig = {
  mode: ConfigMode;
  publish: boolean;
  telegram: {token: string; chatId: string} | null;
  r2?: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    privateBucket: string;
    publicBucket: string;
    publicBaseUrl: string;
  };
  buffer?: {
    apiKey: string;
    organizationId: string;
    tiktokChannelId: string;
    xChannelId: string;
    threadsChannelId: string;
  };
};

function requireNames(environment: NodeJS.ProcessEnv, names: string[]): void {
  const missing = names.filter((name) => !environment[name]?.trim());
  if (missing.length > 0) {
    throw new ConfigurationError(missing);
  }
}

export function loadConfig(
  environment: NodeJS.ProcessEnv,
  input: {mode: ConfigMode; publish: boolean}
): AffiliateFactoryConfig {
  const token = environment.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = environment.TELEGRAM_ALLOWED_CHAT_ID?.trim();
  if (Boolean(token) !== Boolean(chatId)) {
    throw new ConfigurationError([
      ...(token ? [] : ['TELEGRAM_BOT_TOKEN']),
      ...(chatId ? [] : ['TELEGRAM_ALLOWED_CHAT_ID'])
    ], 'TELEGRAM_CONFIGURATION_INCOMPLETE');
  }
  const telegram = token && chatId ? {token, chatId} : null;
  if (input.mode === 'dry-run') {
    return {mode: input.mode, publish: input.publish, telegram};
  }

  const r2Names = [
    'CLOUDFLARE_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
    'R2_PRIVATE_BUCKET', 'R2_PUBLIC_BUCKET', 'R2_PUBLIC_BASE_URL'
  ];
  const bufferNames = [
    'BUFFER_API_KEY', 'BUFFER_ORGANIZATION_ID', 'BUFFER_TIKTOK_CHANNEL_ID',
    'BUFFER_X_CHANNEL_ID', 'BUFFER_THREADS_CHANNEL_ID'
  ];
  const telegramNames = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ALLOWED_CHAT_ID'];
  requireNames(environment, [
    ...r2Names,
    ...(input.publish ? [...bufferNames, ...telegramNames] : [])
  ]);

  const config: AffiliateFactoryConfig = {
    mode: input.mode,
    publish: input.publish,
    telegram,
    r2: {
      accountId: environment.CLOUDFLARE_ACCOUNT_ID!,
      accessKeyId: environment.R2_ACCESS_KEY_ID!,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY!,
      privateBucket: environment.R2_PRIVATE_BUCKET!,
      publicBucket: environment.R2_PUBLIC_BUCKET!,
      publicBaseUrl: environment.R2_PUBLIC_BASE_URL!
    }
  };
  if (input.publish) {
    config.buffer = {
      apiKey: environment.BUFFER_API_KEY!,
      organizationId: environment.BUFFER_ORGANIZATION_ID!,
      tiktokChannelId: environment.BUFFER_TIKTOK_CHANNEL_ID!,
      xChannelId: environment.BUFFER_X_CHANNEL_ID!,
      threadsChannelId: environment.BUFFER_THREADS_CHANNEL_ID!
    };
  }
  return config;
}

export function formatConfigError(error: unknown): string {
  if (error instanceof ConfigurationError) {
    return `${error.message.split(':')[0]}: ${error.missing.join(', ')}`;
  }
  return 'CONFIGURATION_INVALID';
}
