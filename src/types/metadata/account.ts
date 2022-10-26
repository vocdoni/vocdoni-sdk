import { MultiLanguage } from '../../util/common';
import { object, array, string } from 'yup';
import { multiLanguageStringKeys } from '../../util/lang';

/**
 * Asserts that the given metadata is valid.
 * Throws an exception if it is not.
 */
export function checkValidAccountMetadata(accountMetadata: AccountMetadata) {
  if (typeof accountMetadata != 'object') throw new Error('The metadata must be a JSON object');

  try {
    accountMetadataSchema.validateSync(accountMetadata);
    return (accountMetadataSchema.cast(accountMetadata) as unknown) as AccountMetadata;
  } catch (err) {
    if (Array.isArray(err.errors)) throw new Error('ValidationError: ' + err.errors.join(', '));
    throw err;
  }
}

const accountMetadataSchema = object()
  .shape({
    version: string()
      .matches(/^[0-9]\.[0-9]$/)
      .required(),

    languages: array()
      .of(string().matches(/^([a-z]{2}|default)$/))
      .required(), // TODO: remove default
    name: object()
      .shape(multiLanguageStringKeys)
      .required(),
    description: object()
      .shape(multiLanguageStringKeys)
      .required(),

    newsFeed: object()
      .shape(multiLanguageStringKeys)
      .required(),
    media: object().shape({
      avatar: string().required(),
      header: string().required(),
      logo: string(),
    }),
    meta: object().optional(),
  })
  .unknown(true); // allow deprecated or unknown fields beyond the required ones

type ProtocolVersion = '1.0';

/**
 * JSON metadata. Intended to be stored on IPFS or similar.
 * More info: https://vocdoni.io/docs/#/architecture/components/entity?id=meta
 */
export interface AccountMetadata {
  version: ProtocolVersion; // Protocol version
  languages: ['default']; // FIXME: Remove in favor of actual language codes
  // languages: string[],                  // Two character language code (en, fr, it, ...)

  name: MultiLanguage<string>;
  description: MultiLanguage<string>;

  newsFeed: MultiLanguage<string>;

  media: {
    avatar: string;
    header: string;
    logo?: string;
  };
  meta?: {
    [key: string]: any;
  };
}

export const AccountMetadataTemplate: AccountMetadata = {
  version: '1.0',
  languages: ['default'],
  name: {
    default: 'My account',
    // fr: "Ma communauté"
  },
  description: {
    default: 'The description of my account goes here',
    // fr: "La description officielle de ma communauté est ici"
  },
  newsFeed: {
    default: 'ipfs://QmWybQwdBwF81Dt71bNTDDr8PBpW9kNbWtQ64arswaBz1C',
    // fr: "https://feed2json.org/convert?url=http://www.intertwingly.net/blog/index.atom"
  },
  media: {
    avatar: 'https://source.unsplash.com/random/800x600',
    header: 'https://source.unsplash.com/random/800x600',
    logo: 'https://source.unsplash.com/random/800x600',
  },
  meta: {},
};
