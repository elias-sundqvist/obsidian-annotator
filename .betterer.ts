import { typescript } from '@betterer/typescript';

export default {
  'stricter ts': () =>
    typescript('./tsconfig.json', {
      strict: true,
      noImplicitAny: true,
    })
    .include('./src/**/*.ts')
    .include('./src/**/*.tsx'),
};
