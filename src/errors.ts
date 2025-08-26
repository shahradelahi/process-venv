export class InvalidEnvironmentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = 'InvalidEnvironmentError';
    this.cause = options?.cause;
    Object.setPrototypeOf(this, InvalidEnvironmentError.prototype);
  }
}
