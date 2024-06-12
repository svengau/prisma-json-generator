import { formatAst, parsePrismaSchema } from '@loancrate/prisma-schema-parser';
import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper';
import { parseEnvValue } from '@prisma/internals';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import util from 'util';

generatorHandler({
  onManifest() {
    return {
      version: '1',
      defaultOutput: './schema.ts',
      requiresGenerators: ['prisma-client-js'],
    };
  },
  async onGenerate(options: GeneratorOptions) {
    const { output, config } = options.generator;
    const outputFilePath = parseEnvValue(output!);
    const extension = path.extname(outputFilePath);
    if (!['.ts', '.js', '.json'].includes(extension)) {
      throw new Error(
        `Invalid extension ${extension} for output file ${outputFilePath}. Use '.ts', '.js' or '.json'`,
      );
    }

    const schema = options.datamodel;

    const ast = parsePrismaSchema(schema)
      .declarations.filter((o) => ['model'].includes(o.kind))
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
        { model: {} } as any,
      );

    let datamodel = {
      ...options.dmmf.datamodel,
      models: options.dmmf.datamodel.models.map((m) => ({
        ...m,
        attributes: ast['model'][m.name].attributes,
        fields: m.fields.map((f) => ({
          ...f,
          comment: ast['model'][m.name].fields[f.name].comment,
          attributes: ast['model'][m.name].fields[f.name].attributes,
        })),
      })),
    };

    if (config.sortByName === 'true') {
      datamodel = {
        types: datamodel.types.reduce((acc, t) => {
          acc[t.name] = t;
          return acc;
        }, {} as any),
        enums: datamodel.enums.reduce((acc, e) => {
          acc[e.name] = e;
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
// auto-generated file (do not edit)
import { type Prisma } from "@prisma/client";

export type PrismaFieldEnhanced = Prisma.DMMF.Field & { attributes: string[] };

export default ${util.inspect(datamodel, false, 10)}`
        : `
// auto-generated file (do not edit)
module.exports = ${util.inspect(datamodel, false, 10)}`,
    );
  },
});
