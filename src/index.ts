import { config } from 'dotenv';

import { InvalidEnvironmentError } from './errors';
import { ensureSynchronous, parseWithDictionary, StandardSchemaV1 } from './standard';
import type {
  CreateEnvOptions,
  DefaultCombinedSchema,
  SanitizedEnv,
  TExtendsFormat,
  TSchemaFormat,
  UnsanitizedEnv,
} from './typings';

export function createEnv<
  TSchema extends TSchemaFormat = NonNullable<unknown>,
  const TExtends extends TExtendsFormat = [],
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TFinalSchema extends StandardSchemaV1<{}, {}> = DefaultCombinedSchema<TSchema>,
>(options: CreateEnvOptions<TSchema, TExtends, TFinalSchema>, initialEnv?: UnsanitizedEnv) {
  // 1. Get current instance's raw environment data (from object or .env)
  let rawEnv: UnsanitizedEnv;
  if (initialEnv) {
    rawEnv = initialEnv;
  } else {
    const output = config({
      path: options.path,
      encoding: options.encoding,
      debug: options.quiet ? false : undefined,
      processEnv: {},
    });
    rawEnv = output.parsed || {};
  }

  const schema = (typeof options.schema === 'object' ? options.schema : {}) as any;

  const parsed =
    options.createFinalSchema?.(schema)['~standard'].validate(rawEnv) ??
    parseWithDictionary(schema, rawEnv);

  ensureSynchronous(parsed, 'Validation must be synchronous');

  if (parsed.issues) {
    throw new InvalidEnvironmentError('Invalid environment variables detected.', {
      cause: parsed.issues,
    });
  }

  const env = Object.assign(
    (options.extends ?? []).reduce((acc, curr) => {
      return Object.assign(acc, curr);
    }, {}),
    parsed.value
  );

  // 4. Populate process.env based on current instance's shared keys
  for (const key in env) {
    if ((options.shared as unknown as string[])?.includes(key)) {
      process.env[key] = String(env[key]);
    } else {
      delete process.env[key];
    }
  }

  return Object.freeze(env) as Readonly<SanitizedEnv<TFinalSchema, TExtends>>;
}

export { InvalidEnvironmentError };
export type { CreateEnvOptions, UnsanitizedEnv, SanitizedEnv };
