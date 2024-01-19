import { MultiLanguage } from '../../util/lang';
import { IElectionParameters } from './election';
import { UnpublishedElection } from './unpublished';
import { ElectionMetadata, ElectionMetadataTemplate, ElectionResultsTypeNames } from '../metadata';

export interface IApprovalElectionParameters extends IElectionParameters {}

/**
 * Represents an approval election
 */
export class ApprovalElection extends UnpublishedElection {
  /**
   * Constructs an approval election
   *
   * @param params Approval election parameters
   */
  public constructor(params: IApprovalElectionParameters) {
    super(params);
  }

  public static from(params: IApprovalElectionParameters) {
    return new ApprovalElection(params);
  }

  public addQuestion(title: string | MultiLanguage<string>, description: string | MultiLanguage<string>) {
    return super.addQuestion(
      title,
      description,
      [...new Array(2)].map((_v, index) => ({
        title: '',
        value: index,
      }))
    );
  }

  public generateVoteOptions(): object {
    const maxCount = this.questions.length;
    const maxValue = 1;
    const maxVoteOverwrites = this.voteType.maxVoteOverwrites;
    const maxTotalCost = 0;
    const costExponent = this.voteType.costExponent;

    return { maxCount, maxValue, maxVoteOverwrites, maxTotalCost, costExponent };
  }

  public generateEnvelopeType(): object {
    const serial = false; // TODO
    const anonymous = this.electionType.anonymous;
    const encryptedVotes = this.electionType.secretUntilTheEnd;
    const uniqueValues = false;
    const costFromWeight = false;

    return { serial, anonymous, encryptedVotes, uniqueValues, costFromWeight };
  }

  public generateMetadata(): ElectionMetadata {
    const metadata = ElectionMetadataTemplate;

    metadata.type = {
      name: ElectionResultsTypeNames.APPROVAL,
      properties: {
        rejectValue: 0,
        acceptValue: 1,
      },
    };

    return super.generateMetadata(metadata);
  }
}
