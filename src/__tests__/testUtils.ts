import { getDMMF, getSchema } from '@prisma/internals';
import path from 'path';

export async function getSampleDMMF() {
  const schema = await getSchema(path.join(__dirname, './sample.prisma'));
  const dmmf = await getDMMF({ datamodel: schema });
  return {
    schemaPath: schema[0][0],
    schema: schema[0][1],
    dmmf,
  };
}
