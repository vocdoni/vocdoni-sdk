/**
 * Represents an invalid election
 */
export class InvalidElection {
  /**
   * Constructs an invalid election
   */
  public constructor() {}

  get isValid(): boolean {
    return false;
  }
}
