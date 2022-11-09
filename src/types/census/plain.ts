import { OffchainCensus } from './offchain';
import { CensusType } from './census';

/**
 * Represents a plain census
 */
export class PlainCensus extends OffchainCensus {
  /**
   * Constructs a plain census
   */
  public constructor() {
    super();
    this.type = CensusType.WEIGHTED;
  }

  public add(participants: string | string[]) {
    super.addParticipants(
      Array.isArray(participants)
        ? participants.map((participant) => {
            return {
              key: participant,
              weight: BigInt(1),
            };
          })
        : {
            key: participants,
            weight: BigInt(1),
          }
    );
  }

  public remove(key: string) {
    super.removeParticipant(key);
  }
}
