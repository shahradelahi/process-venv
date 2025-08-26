# process-venv

[![CI](https://github.com/shahradelahi/process-venv/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/shahradelahi/process-venv/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/process-venv.svg)](https://www.npmjs.com/package/process-venv)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](/LICENSE)
[![Install Size](https://packagephobia.com/badge?p=process-venv)](https://packagephobia.com/result?p=process-venv)

A robust and lightweight TypeScript library for securely loading, validating, and managing environment variables, preventing unintended access by third-party dependencies.

---

- [Motivation](#-motivation)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [API](#-api)
- [Contributing](#-contributing)
- [License](#license)

## 🤔 Motivation

In modern applications, especially those with a large number of dependencies, there's a significant risk of sensitive environment variables (like API keys, database credentials, etc.) being inadvertently accessed or logged by "shady" or compromised third-party packages. The traditional approach of loading all `.env` variables directly into `process.env` exposes your entire configuration to every part of your application's dependency tree.

`process-venv` addresses this by providing a "virtual environment" for your application's configuration. It ensures that:

1.  **Isolation:** Only explicitly "shared" environment variables are exposed to `process.env`. All other variables are kept in memory within the `createEnv` instance, accessible only through its properties.
2.  **Validation:** All environment variables are rigorously validated against a [Standard Schema](https://standardschema.dev) compliant schema at application startup, catching missing or malformed configurations early. While the examples use Zod, `process-venv` is designed to work with any Standard Schema compliant validator (e.g., Valibot, ArkType).
3.  **Immutability:** The environment variables are immutable after creation, enhancing predictability and preventing accidental runtime modifications.

This approach significantly enhances the security and reliability of your application's environment management.

## ✨ Features

- ✅ **Secure Isolation**: Prevents unintended access to sensitive environment variables by third-party dependencies.
- ✅ **Standard Schema Validation**: Enforces strict schema validation for all environment variables at runtime, allowing you to use any compliant validator (e.g., Zod, Valibot, ArkType).
- ✅ **Flexible Loading**: Load from `.env` files or directly from an existing object (e.g., from a secret vault).
- ✅ **Immutability**: Environment variables are immutable after creation.
- ✅ **Lightweight**: Minimal footprint with zero runtime dependencies beyond `dotenv` (optional) and your chosen Standard Schema compliant validator.
- ✅ **TypeScript First**: Written entirely in TypeScript with strong type safety.

## 📦 Installation

```bash
pnpm install process-venv
```

## 📖 Usage

### Loading from `.env` files

It is recommended to define your environment schema and initialize `createEnv` in a dedicated file (e.g., `src/env.ts`) and then import the `venv` instance where needed.

```typescript
// -- src/env.ts

import { createEnv } from 'process-venv';
import * as z from 'zod';

export const venv = createEnv({
  schema: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().url(),
    API_KEY: z.string(), // This will be private by default
    SHARED_SECRET: z.string(), // This will be shared
  },
  shared: ['NODE_ENV', 'PORT', 'SHARED_SECRET'],
  // Optional dotenv options:
  // path: ['.env.local', '.env'],
  // quiet: true,
});
```

Then, in your application's entry point (e.g., `src/index.ts`):

```typescript
// -- src/index.ts

import { venv } from './env';

// Access shared variables via process.env (e.g., for frameworks)
console.log('NODE_ENV from process.env:', process.env.NODE_ENV);

// Access all variables securely via the venv instance
console.log('API_KEY from venv:', venv.API_KEY);
console.log('PORT from venv:', venv.PORT);

// process.env.API_KEY will be undefined
console.log('API_KEY from process.env:', process.env.API_KEY);
```

### Loading from an external object

Similarly, for loading from an external object, you can define and initialize your `venv` instance in `src/env.ts`:

```typescript
// -- src/env.ts

import { createEnv } from 'process-venv';
import { z } from 'zod';

const myExternalConfig = {
  NODE_ENV: 'production',
  PORT: '8080',
  DATABASE_URL: 'postgresql://user:pass@host:port/db',
  API_KEY: 'my-super-secret-key-from-vault',
};

export const venv = createEnv(
  {
    schema: {
      NODE_ENV: z.enum(['development', 'production', 'test']),
      PORT: z.coerce.number(),
      DATABASE_URL: z.string().url(),
      API_KEY: z.string(),
    },
    shared: ['NODE_ENV', 'PORT'],
  },
  myExternalConfig
);
```

And then use it in `src/index.ts`:

```typescript
// -- src/index.ts

import { venv } from './env';

console.log('API_KEY from venv:', venv.API_KEY);
console.log('NODE_ENV from process.env:', process.env.NODE_ENV);
```

## 📚 API

### `createEnv<TSchema, TExtends, TFinalSchema>(options: CreateEnvOptions<TSchema, TExtends, TFinalSchema>, initialEnv?: UnsanitizedEnv): Readonly<SanitizedEnv<TFinalSchema, TExtends>>`

Creates a new immutable environment configuration instance.

- `options`: Configuration for loading and validating environment variables, including optional `extends` for composing configurations.
- `initialEnv` (optional): An object of environment variables to use instead of loading from `.env` files. If provided, these values take precedence over `.env` file values.

### Interfaces and Types

- `UnsanitizedEnv`: `Record<string, string | undefined>` - Represents raw environment variables before validation.
- `CreateEnvOptions<TSchema, TExtends, TFinalSchema>`: Configuration options for the `createEnv` function.
  - `path?`: `string | string[] | URL` - Specifies the path(s) to the `.env` file(s) to load.
  - `encoding?`: `string` - Specifies the encoding to use when reading the `.env` file(s).
  - `quiet?`: `boolean` - Suppresses all output from the underlying `dotenv` package, except for errors.
  - `schema`: `StandardSchemaDictionary` - The Standard Schema compliant schema for validating environment variables.
  - `extends?`: `TExtendsFormat` - An array of `SanitizedEnv` instances to extend from.
  - `shared?`: `(keyof TSanitized)[]` - An array of keys that should be exposed in `process.env`.
- `SanitizedEnv<TFinalSchema, TExtends>`: The inferred type of the fully validated and parsed environment variables, combined from the schema and extended instances.
- `InvalidEnvironmentError`: A custom error class thrown when environment validation fails.

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/process-venv)

Thanks again for your support, it is much appreciated! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/process-venv/graphs/contributors).
