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

/**
 * Creates a new immutable environment configuration instance.
 *
 * @template TSchema The type of the schema dictionary used for validation.
 * @template TExtends The type of the array of extended `SanitizedEnv` instances.
 * @template TFinalSchema The final combined schema type after extensions and transformations.
 *
 * @param {CreateEnvOptions<TSchema, TExtends, TFinalSchema>} options Configuration for loading and validating environment variables, including optional `extends` for composing configurations.
 * @param {UnsanitizedEnv} [initialEnv] An optional object of environment variables to use instead of loading from `.env` files. If provided, these values take precedence over `.env` file values.
 * @returns {Readonly<SanitizedEnv<TFinalSchema, TExtends>>} A readonly object containing the validated and sanitized environment variables.
 * @throws {InvalidEnvironmentError} If validation of environment variables fails.
 */
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
