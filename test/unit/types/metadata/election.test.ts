import { ElectionMetadata, checkValidElectionMetadata, ElectionMetadataTemplate } from '../../../../src';

let electionMetadata: ElectionMetadata;

beforeEach(() => {
  electionMetadata = ElectionMetadataTemplate;
});

describe('Election metadata', () => {
  it('Should accept a valid Process Metadata JSON', () => {
    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();
  });

  it('Should reject a non valid Process Metadata JSON', () => {
    expect(() => {
      checkValidElectionMetadata(null);
    }).toThrow();
  });

  it('Should reject invalid Process Metadata JSON payloads', () => {
    // Totally invalid
    expect(() => {
      const payload = JSON.parse('{"test": 123}');
      checkValidElectionMetadata(payload);
    }).toThrow();

    expect(() => {
      const payload = JSON.parse('{"name": {"default": "hello", "fr": "Alô"}}');
      checkValidElectionMetadata(payload);
    }).toThrow();

    expect(() => {
      electionMetadata.questions[0].choices[0].value = 'a' as any;
      checkValidElectionMetadata(electionMetadata);
    }).toThrow();
  });

  it('Should reject null required fields', () => {
    // Incomplete fields
    expect(() => {
      checkValidElectionMetadata(Object.assign({}, electionMetadata, { version: null }));
    }).toThrow();
    expect(() => {
      checkValidElectionMetadata(Object.assign({}, electionMetadata, { title: null }));
    }).toThrow();
    expect(() => {
      checkValidElectionMetadata(Object.assign({}, electionMetadata, { description: null }));
    }).toThrow();
    expect(() => {
      checkValidElectionMetadata(Object.assign({}, electionMetadata, { media: null }));
    }).toThrow();
    expect(() => {
      checkValidElectionMetadata(Object.assign({}, electionMetadata, { questions: null }));
    }).toThrow();
  });

  it('Should accept big number of questions', () => {
    electionMetadata.questions = [];

    for (let i = 0; i < 200; i++) {
      electionMetadata.questions.push({
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
      });
    }

    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();

    const result = checkValidElectionMetadata(electionMetadata);
    expect(result.questions.length).toEqual(200);
  });

  it('Should accept big number of choices', () => {
    const choiceTemplate = JSON.stringify(electionMetadata.questions[0].choices[0]);
    for (let i = 2; i < 200; i++) {
      const choice = JSON.parse(choiceTemplate);
      choice.title = { default: 'Yes ' + String(i) };
      choice.value = i;
      electionMetadata.questions[0].choices.push(choice);
    }

    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();

    const result = checkValidElectionMetadata(electionMetadata);
    expect(result.questions[0].choices.length).toEqual(200);
  });

  it('Should allow for arbitrary fields within `meta`', () => {
    electionMetadata.meta = undefined;
    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();

    electionMetadata.meta = {};
    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();

    electionMetadata.meta = { a: '1234', b: 2345 };
    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();

    electionMetadata.meta = { a: ['a', 3, null, false] };
    expect(() => {
      checkValidElectionMetadata(electionMetadata);
    }).not.toThrow();
  });
});
