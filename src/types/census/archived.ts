import { Census, CensusType } from './census';
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
   * @param type The type of the census
   * @param size The size of the census
   * @param weight The weight of the census
   */
  public constructor(censusId: string, censusURI?: string, type?: CensusType, size?: number, weight?: bigint) {
    invariant(/^(0x)?[0-9a-fA-F]+$/.test(censusId), 'Census identifier is missing or invalid');
    super(censusId, censusURI, type, size, weight);
  }
}
