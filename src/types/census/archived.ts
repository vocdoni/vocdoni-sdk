import { Census } from './census';
import invariant from 'tiny-invariant';

/**
 * Represents an archived census
 */
export class ArchivedCensus extends Census {
  /**
   * Constructs an archived census
   *
   * @param censusId The id of the census
   * @param censusURI The URI of the census
   */
  public constructor(censusId: string, censusURI: string) {
    invariant(/^(0x)?[0-9a-fA-F]+$/.test(censusId), 'Census identifier is missing or invalid');
    try {
      new URL(censusURI);
    } catch (_) {
      invariant(false, 'Census URI is missing or invalid');
    }
    super(censusId, censusURI);
  }
}
