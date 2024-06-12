# prisma-json-generator

![npm](https://img.shields.io/npm/v/prisma-json-generator)
![GitHub Workflow Status (with branch)](https://img.shields.io/github/actions/workflow/status/svengau/prisma-json-generator/CI.yml?branch=main)

prisma-json-generator is a [Prisma Generator](https://www.prisma.io/docs/concepts/components/prisma-schema/generators) to expose into a single file (.ts, .json or .js) all attributes coming from the Prisma Schema, in particular comments and annotations.

### Get started

- Setup your Prisma project as usual ([Get Started With Prisma](https://www.prisma.io/docs/getting-started))
- Install this package
  - `npm install -D prisma-json-generator`
  - `yarn add -D prisma-json-generator`
  - `pnpm install -D prisma-json-generator`
- Modify your Prisma model file
  ```prisma
  generator json {
      provider = "prisma-json-generator"
      output   = "./schema.ts"
  }
  ```
- Run `npx prisma generate`

Enjoy !

# Thanks

Special Thanks to [@loancrate](https://github.com/loancrate) for his powerful and fast [AST parser](https://github.com/loancrate/prisma-schema-parser), and to [@luisrudge](https://github.com/luisrudge) for
his [prisma-generator-fake-data](https://github.com/luisrudge/prisma-generator-fake-data) generator which help me bootstrap this project!
