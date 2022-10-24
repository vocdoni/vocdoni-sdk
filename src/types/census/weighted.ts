import { ICensusParticipant, OffchainCensus } from './offchain';
import { CensusType } from './census';

/**
 * Represents a weighted census
 */
export class WeightedCensus extends OffchainCensus {
  /**
   * Constructs a weighted census
   */
  public constructor() {
    super();
    this.type = CensusType.WEIGHTED;
  }

  public add(participants: ICensusParticipant | ICensusParticipant[]) {
    super.addParticipants(participants);
  }

  public remove(key: string) {
    super.removeParticipant(key);
  }
}
