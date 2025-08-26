import type { URL } from 'url';

import { StandardSchemaDictionary, StandardSchemaV1 } from './standard';

/**
 * Simplify a type
 * @internal
 */
type Simplify<T> = {
  [P in keyof T]: T[P];
} & {};

/**
 * Get the keys of the possibly undefined values
 * @internal
 */
type PossiblyUndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

/**
 * Make the keys of the type possibly undefined
 * @internal
 */
type UndefinedOptional<T> = Partial<Pick<T, PossiblyUndefinedKeys<T>>> &
  Omit<T, PossiblyUndefinedKeys<T>>;

/**
 * Reverse a Readonly object to be mutable
 * @internal
 */
type Mutable<T> = T extends Readonly<infer U> ? U : T;

/**
 * Reduce an array of records to a single object where later keys override earlier ones
 * @internal
 */
type Reduce<TArr extends Record<string, unknown>[], TAcc = object> = TArr extends []
  ? TAcc
  : TArr extends [infer Head, ...infer Tail]
    ? Tail extends Record<string, unknown>[]
      ? Mutable<Head> & Omit<Reduce<Tail, TAcc>, keyof Head>
      : never
    : never;

/**
 * Represents the default combined schema type, inferring output from the provided schema.
 * @template TSchema The schema format being used.
 */
export type DefaultCombinedSchema<TSchema extends TSchemaFormat> = StandardSchemaV1<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  UndefinedOptional<StandardSchemaDictionary.InferOutput<TSchema>>
>;

/**
 * Defines the expected format for a schema, which is a dictionary of StandardSchemaV1 instances.
 */
export type TSchemaFormat = StandardSchemaDictionary;

/**
 * Defines the expected format for an array of extended `SanitizedEnv` instances.
 */
export type TExtendsFormat = Array<SanitizedEnv<any, any>>;

/**
 * Options for creating a schema, allowing for custom final schema creation.
 * @template TSchema The schema dictionary type.
 * @template TFinalSchema The final combined schema type.
 */
export interface CreateSchemaOptions<
  TSchema extends StandardSchemaDictionary,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TFinalSchema extends StandardSchemaV1<{}, {}>,
> {
  /**
   * A custom function to combine the schemas.
   * Can be used to add further refinement or transformation.
   */
  createFinalSchema?: (shape: TSchema) => TFinalSchema;
}

export interface CreateEnvOptions<
  TSchema extends TSchemaFormat,
  TExtends extends TExtendsFormat,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TFinalSchema extends StandardSchemaV1<{}, {}> = DefaultCombinedSchema<TSchema>,
  TSanitized = SanitizedEnv<TFinalSchema, TExtends>,
> extends CreateSchemaOptions<TSchema, TFinalSchema> {
  /**
   * Specifies the path(s) to the `.env` file(s) to load. This option is only used
   * when `initialEnv` is not provided. Can be a single path string, an array of paths, or a URL.
   *
   * @default `path.resolve(process.cwd(), '.env')`
   * @example
   * ```typescript
   * createEnv({ path: '.env.development', schema: mySchema, shared: [] });
   * createEnv({ path: ['./.env.local', './.env'], schema: mySchema, shared: [] });
   * ```
   */
  path?: string | string[] | URL;

  /**
   * Specifies the encoding to use when reading the `.env` file(s).
   * This option is only relevant when loading from `.env` files.
   *
   * @default `utf8`
   * @example
   * ```typescript
   * createEnv({ encoding: 'latin1', schema: mySchema, shared: [] });
   * ```
   */
  encoding?: string;

  /**
   * Suppresses all output from the underlying `dotenv` package, except for errors.
   * This option is only relevant when loading from `.env` files.
   *
   * @default `false`
   * @example
   * ```typescript
   * createEnv({ quiet: true, schema: mySchema, shared: [] });
   * ```
   */
  quiet?: boolean;

  /**
   * The Standard Schema compliant schema for validating environment variables.
   */
  schema: TSchema;

  /**
   * An array of `SanitizedEnv` instances to extend from. This allows for composing
   * environment configurations from multiple sources or modules.
   * Schemas and environment data from extended instances are merged in the order
   * they appear in this array. The current instance's `schema` and loaded environment
   * data will always take precedence over any conflicts from extended instances.
   *
   * @example
   * ```typescript
   * const baseEnv = createEnv({ schema: baseSchema, shared: [] });
   * const featureEnv = createEnv({ schema: featureSchema, shared: [] });
   * const appEnv = createEnv({
   *   schema: appSchema,
   *   extends: [baseEnv, featureEnv],
   *   shared: [],
   * });
   * ```
   */
  extends?: TExtends;

  /**
   * An array of keys that should be exposed in `process.env`.
   * All other keys will only be accessible via the `SanitizedEnv` instance.
   */
  shared?: (keyof TSanitized)[];

  /**
   * Optional initial environment variables. If provided, these values take precedence
   * over values loaded from `.env` files.
   */
  initial?: TSanitized;
}

/**
 * Represents the fully validated and parsed environment variables, combined from the schema and extended instances.
 * @template TFinalSchema The final combined schema type.
 * @template TExtends The type of the array of extended `SanitizedEnv` instances.
 */
export type SanitizedEnv<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  TFinalSchema extends StandardSchemaV1<{}, {}>,
  TExtends extends TExtendsFormat,
> = Simplify<Reduce<[StandardSchemaV1.InferOutput<TFinalSchema>, ...TExtends]>>;

/**
 * Represents raw environment variables before validation.
 */
export type UnsanitizedEnv = Record<string, string | undefined>;
