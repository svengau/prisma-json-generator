import { formatAst, parsePrismaSchema } from '@loancrate/prisma-schema-parser';
import { GeneratorOptions } from '@prisma/generator-helper';
import { Handler } from '@prisma/generator-helper/dist/generatorHandler';
import { parseEnvValue } from '@prisma/internals';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import util from 'util';

const handler: Handler = {
  onManifest() {
    return {
      version: '1',
      defaultOutput: './schema.ts',
    };
  },
  async onGenerate(options: GeneratorOptions) {
    const { output, config } = options.generator;
    const sortByName = config.sortByName === 'true';
    const includeRaw = config.includeRaw === 'true';
    const outputFilePath = parseEnvValue(output!);
    const extension = path.extname(outputFilePath);
    if (!['.ts', '.js', '.json'].includes(extension)) {
      throw new Error(
        `Invalid extension ${extension} for output file ${outputFilePath}. Use '.ts', '.js' or '.json'`,
      );
    }

    const schema = options.datamodel;

    const astByTypeAndName = parsePrismaSchema(schema)
      .declarations.filter((o) => ['enum', 'type', 'model'].includes(o.kind))
      .reduce(
        (acc, o: any) => {
          acc[o.kind][o.name.value] = {
            ...o,
            attributes: o.members
              .filter((f: any) => f.kind === 'blockAttribute')
              .map((a: any) => formatAst(a)),
            fields: o.members
              .filter((f: any) => f.kind === 'field')
              .reduce((acc: any, f: any) => {
                acc[f.name.value] = {
                  name: f.name?.value,
                  type: f.type?.name?.value,
                  comment: f.comment?.text,
                  attributes: f.attributes?.map((a: any) => formatAst(a)),
                };
                return acc;
              }, {}),
          };
          return acc;
        },
        { model: {}, type: {}, enum: {} } as any,
      );

    let datamodel = {
      ...options.dmmf.datamodel,
      types: options.dmmf.datamodel.types.map((t) => ({
        ...t,
        raw: includeRaw
          ? formatAst(astByTypeAndName['type'][t.name])
          : undefined,
      })),
      enums: options.dmmf.datamodel.enums.map((e) => ({
        ...e,
        raw: includeRaw
          ? formatAst(astByTypeAndName['enum'][e.name])
          : undefined,
      })),
      models: options.dmmf.datamodel.models.map((m) => ({
        ...m,
        attributes: astByTypeAndName['model'][m.name].attributes,
        fields: m.fields.map((f) => ({
          ...f,
          comment: astByTypeAndName['model'][m.name].fields[f.name].comment,
          attributes:
            astByTypeAndName['model'][m.name].fields[f.name].attributes,
        })),
        raw: includeRaw
          ? formatAst(astByTypeAndName['model'][m.name])
          : undefined,
      })),
    };

    if (sortByName) {
      datamodel = {
        types: datamodel.types.reduce((acc, t) => {
          acc[t.name] = t;
          return acc;
        }, {} as any),
        enums: datamodel.enums.reduce((acc, e) => {
          acc[e.name] = e;
          return acc;
        }, {} as any),
        indexes: datamodel.indexes.reduce((acc, i) => {
          acc[i.name as string] = i;
          return acc;
        }, {} as any),
        models: datamodel.models.reduce((acc, m) => {
          acc[m.name] = {
            ...m,
            fields: m.fields.reduce((acc, f) => {
              acc[f.name] = f;
              return acc;
            }, {} as any),
          };
          return acc;
        }, {} as any),
      };
    }

    await mkdir(path.dirname(outputFilePath), { recursive: true });

    await writeFile(
      outputFilePath,
      extension === '.json'
        ? JSON.stringify(datamodel, null, 2)
        : extension === '.ts'
          ? `
// auto-generated file using prisma-json-generator (do not edit)
import * as runtime from "@prisma/client/runtime/library"

export type PrismaFieldEnhanced = runtime.DMMF.Field & { attributes: string[] };

export default ${util.inspect(datamodel, { depth: 10, showHidden: false, maxArrayLength: Infinity })}`
          : `
// auto-generated file using prisma-json-generator (do not edit)
module.exports = ${util.inspect(datamodel, { depth: 10, showHidden: false, maxArrayLength: Infinity })}`,
    );
  },
};

export default handler;
