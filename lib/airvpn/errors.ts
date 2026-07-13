export class AirVpnApiError extends Error {
  constructor(
    message: string,
    public readonly code: "upstream_unavailable" | "invalid_key" | "upstream_error" = "upstream_error",
  ) {
    super(message);
    this.name = "AirVpnApiError";
  }
}
