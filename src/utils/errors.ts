export class ExternalApiError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ExternalApiError";
  }
}

export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly userMessage: string,
  ) {
    super(message);
    this.name = "ConfigError";
  }
}

export function toSpeakableError(error: unknown, fallback: string): string {
  if (error instanceof ExternalApiError || error instanceof ConfigError) {
    return error.userMessage;
  }
  return fallback;
}
