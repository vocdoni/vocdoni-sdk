import { AccountMetadataTemplate, checkValidAccountMetadata } from '../../../../src';

describe('Account metadata', () => {
  it('Should accept a valid account metadata JSON', () => {
    const entityMetadata = AccountMetadataTemplate;

    expect(() => {
      checkValidAccountMetadata(entityMetadata);
    }).not.toThrow();
  });

  it('Should reject invalid account metadata JSON payloads', () => {
    expect(() => {
      const payload = JSON.parse('{"test": 123}');
      checkValidAccountMetadata(payload);
    }).toThrow();

    expect(() => {
      const payload = JSON.parse('{"name": {"default": "hello", "fr": "Alô"}}');
      checkValidAccountMetadata(payload);
    }).toThrow();

    // Incomplete fields
    const accountMetadata = JSON.parse(JSON.stringify(AccountMetadataTemplate));

    expect(() => {
      checkValidAccountMetadata(Object.assign({}, accountMetadata, { version: null }));
    }).toThrow();
    expect(() => {
      checkValidAccountMetadata(Object.assign({}, accountMetadata, { languages: null }));
    }).toThrow();
    expect(() => {
      checkValidAccountMetadata(Object.assign({}, accountMetadata, { name: null }));
    }).toThrow();
    expect(() => {
      checkValidAccountMetadata(Object.assign({}, accountMetadata, { description: null }));
    }).toThrow();
    expect(() => {
      checkValidAccountMetadata(Object.assign({}, accountMetadata, { newsFeed: null }));
    }).toThrow();
    expect(() => {
      checkValidAccountMetadata(Object.assign({}, accountMetadata, { media: { avatar: null } }));
    }).toThrow();
  });
});
