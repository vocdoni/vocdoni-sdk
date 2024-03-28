import { IPublishedElectionParameters, PublishedElection } from './published';
import { ArchivedCensus } from '../census/archived';

/**
 * Represents a published election
 */
export class ArchivedElection extends PublishedElection {
  /**
   * Constructs an archived election
   *
   * @param params - Election parameters
   */
  public constructor (params: IPublishedElectionParameters) {
    super(params);
  }

  get census (): ArchivedCensus {
    return super.census;
  }
}
