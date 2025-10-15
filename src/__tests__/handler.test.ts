import { describe, test, expect, vi } from 'vitest';
import * as fs from 'fs/promises';

import { getSampleDMMF } from './testUtils';

import handler from '../handler';

const mocks = vi.hoisted(() => {
  return {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});
vi.mock('fs/promises', () => mocks);

describe('handler', () => {
  test('generates ts file', async () => {
    const sampleDMMF = await getSampleDMMF();

    const mockWriteFile = fs.writeFile;

    await handler.onGenerate({
      generator: {
        name: 'json',
        provider: { fromEnvVar: null, value: 'prisma-json-generator' },
        sourceFilePath: '',
        output: {
          value: './schema.ts',
          fromEnvVar: 'null',
        },
        config: {
          sortByName: 'true',
          outputName: 'schema.ts',
          includeRaw: 'true',
        },
        binaryTargets: [],
        previewFeatures: [],
      },
      otherGenerators: [],
      schemaPath: '',
      dmmf: sampleDMMF.dmmf,
      datasources: [],
      datamodel: sampleDMMF.schema,
      version: '',
    });
    expect(mockWriteFile).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledWith(
      './schema.ts',
      expect.any(String),
    );
    expect(mocks.writeFile.mock.calls).toMatchSnapshot();
  });
});
