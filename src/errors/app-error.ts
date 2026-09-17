export class AppError extends Error {
  public constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}
