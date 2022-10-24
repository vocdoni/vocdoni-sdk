import { ProcessMetadata, checkValidProcessMetadata, ProcessMetadataTemplate } from '../../../src';

let processMetadata: ProcessMetadata;

beforeEach(() => {
  processMetadata = ProcessMetadataTemplate;
});

describe('Metadata validation', () => {
  it('Should accept a valid Process Metadata JSON', () => {
    expect(() => {
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();
  });

  it('Should reject a non valid Process Metadata JSON', () => {
    expect(() => {
      checkValidProcessMetadata(null);
    }).toThrow();
  });

  it('Should reject invalid Process Metadata JSON payloads', () => {
    // Totally invalid
    expect(() => {
      const payload = JSON.parse('{"test": 123}');
      checkValidProcessMetadata(payload);
    }).toThrow();

    expect(() => {
      const payload = JSON.parse('{"name": {"default": "hello", "fr": "Alô"}}');
      checkValidProcessMetadata(payload);
    }).toThrow();

    expect(() => {
      processMetadata.questions[0].choices[0].value = 'a' as any;
      checkValidProcessMetadata(processMetadata);
    }).toThrow();
  });

  it('Should reject null required fields', () => {
    // Incomplete fields
    expect(() => {
      checkValidProcessMetadata(Object.assign({}, processMetadata, { version: null }));
    }).toThrow();
    expect(() => {
      checkValidProcessMetadata(Object.assign({}, processMetadata, { title: null }));
    }).toThrow();
    expect(() => {
      checkValidProcessMetadata(Object.assign({}, processMetadata, { description: null }));
    }).toThrow();
    expect(() => {
      checkValidProcessMetadata(Object.assign({}, processMetadata, { media: null }));
    }).toThrow();
    expect(() => {
      checkValidProcessMetadata(Object.assign({}, processMetadata, { questions: null }));
    }).toThrow();
  });

  it('Should accept big number of questions', () => {
    processMetadata.questions = [];

    for (let i = 0; i < 200; i++) {
      processMetadata.questions.push({
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
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();

    const result = checkValidProcessMetadata(processMetadata);
    expect(result.questions.length).toEqual(200);
  });

  it('Should accept big number of choices', () => {
    const choiceTemplate = JSON.stringify(processMetadata.questions[0].choices[0]);
    for (let i = 2; i < 200; i++) {
      const choice = JSON.parse(choiceTemplate);
      choice.title = { default: 'Yes ' + String(i) };
      choice.value = i;
      processMetadata.questions[0].choices.push(choice);
    }

    expect(() => {
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();

    const result = checkValidProcessMetadata(processMetadata);
    expect(result.questions[0].choices.length).toEqual(200);
  });

  it('Should allow for arbitrary fields within `meta`', () => {
    processMetadata.meta = undefined;
    expect(() => {
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();

    processMetadata.meta = {};
    expect(() => {
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();

    processMetadata.meta = { a: '1234', b: 2345 };
    expect(() => {
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();

    processMetadata.meta = { a: ['a', 3, null, false] };
    expect(() => {
      checkValidProcessMetadata(processMetadata);
    }).not.toThrow();
  });
});
