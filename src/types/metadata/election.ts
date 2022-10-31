import { object, array, string, number } from 'yup';
import { MultiLanguage, multiLanguageStringKeys } from '../../util/lang';

/**
 * Asserts that the given metadata is valid.
 * Throws an exception if it is not.
 */
export function checkValidElectionMetadata(electionMetadata: ElectionMetadata): ElectionMetadata {
  if (typeof electionMetadata != 'object') throw new Error('The metadata must be a JSON object');
  else if (electionMetadata.questions.length < 1) throw new Error('The metadata needs to have at least one question');
  else if (electionMetadata.questions.some(q => !Array.isArray(q.choices) || q.choices.length < 2))
    throw new Error('All questions need to have at least two choices');

  try {
    electionMetadataSchema.validateSync(electionMetadata);
    return electionMetadataSchema.cast(electionMetadata) as ElectionMetadata;
  } catch (err) {
    if (Array.isArray(err.errors)) throw new Error('ValidationError: ' + err.errors.join(', '));
    throw err;
  }
}

export interface IChoice {
  title: MultiLanguage<string>;
  value: number;
}

export interface IQuestion {
  title: MultiLanguage<string>;
  description?: MultiLanguage<string>;
  choices: Array<IChoice>;
}

const electionMetadataSchema = object()
  .shape({
    version: string()
      .matches(/^[0-9]\.[0-9]$/)
      .required(),
    title: object()
      .shape(multiLanguageStringKeys)
      .required(),
    description: object()
      .shape(multiLanguageStringKeys)
      .required(),
    media: object().shape({
      header: string().required(),
      streamUri: string().optional(),
    }),
    meta: object().optional(),
    questions: array()
      .of(
        object().shape({
          title: object()
            .shape(multiLanguageStringKeys)
            .required(),
          description: object()
            .shape(multiLanguageStringKeys)
            .optional(),
          choices: array()
            .of(
              object().shape({
                title: object()
                  .shape(multiLanguageStringKeys)
                  .required(),
                value: number()
                  .integer()
                  .required(),
              })
            )
            .required(),
        })
      )
      .required(),
    results: object()
      .shape({
        aggregation: string()
          .required()
          .oneOf(['index-weighted', 'discrete-counting']),
        display: string()
          .required()
          .oneOf([
            'rating',
            'simple-question',
            'multiple-choice',
            'linear-weighted',
            'quadratic-voting',
            'multiple-question',
            'raw',
          ]),
      })
      .required(),
  })
  .unknown(true); // allow deprecated or unknown fields beyond the required ones

type ProtocolVersion = '1.1';

export type ElectionResultsAggregation = 'index-weighted' | 'discrete-counting';
export type ElectionResultsDisplay =
  | 'rating'
  | 'simple-question'
  | 'multiple-choice'
  | 'linear-weighted'
  | 'quadratic-voting'
  | 'multiple-question'
  | 'raw';

/**
 * JSON metadata. Intended to be stored on IPFS or similar.
 * More info: https://vocdoni.io/docs/#/architecture/components/process?id=process-metadata-json
 */
export interface ElectionMetadata {
  version: ProtocolVersion; // Version of the metadata schema used
  title: MultiLanguage<string>;
  description: MultiLanguage<string>;
  media: {
    header: string;
    streamUri?: string;
  };
  /** Arbitrary key/value data that specific applications can use for their own needs */
  meta?: any;
  questions: Array<IQuestion>;
  results: {
    aggregation: ElectionResultsAggregation;
    display: ElectionResultsDisplay;
  };
}

export const ElectionMetadataTemplate: ElectionMetadata = {
  version: '1.1',
  title: {
    default: '', // Universal Basic Income
  },
  description: {
    default: '', // ## Markdown text goes here\n### Abstract
  },
  media: {
    header: 'https://source.unsplash.com/random/800x600', // Content URI
    streamUri: '',
  },
  meta: {},
  questions: [
    {
      title: {
        default: '', // Should universal basic income become a human right?
      },
      description: {
        default: '', // ## Markdown text goes here\n### Abstract
      },
      choices: [
        {
          title: {
            default: 'Yes',
          },
          value: 0,
        },
        {
          title: {
            default: 'No',
          },
          value: 1,
        },
      ],
    },
  ],
  results: {
    aggregation: 'discrete-counting',
    display: 'multiple-question',
  },
};
