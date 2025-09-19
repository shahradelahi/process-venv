# process-venv

[![CI](https://github.com/shahradelahi/process-venv/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/shahradelahi/process-venv/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/process-venv.svg)](https://www.npmjs.com/package/process-venv)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat)](/LICENSE)
[![Install Size](https://packagephobia.com/badge?p=process-venv)](https://packagephobia.com/result?p=process-venv)

_process-venv_ is a lightweight TypeScript library for loading, validating, and managing environment variables with a focus on security. It prevents unintended access by third-party dependencies by isolating your secrets from the global `process.env`.

---

- [Motivation](#-motivation)
- [Features](#-features)
- [Installation](#-installation)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#license)

## 💡 Motivation

In Node.js, `process.env` is global. Any dependency can read any variable you set, which is a major security hole. A malicious nested dependency could steal your API keys without you ever knowing.

`process-venv` fixes this by creating a sandboxed environment for your variables. It keeps them off `process.env` and in a private container.

Here’s what that gives you:

1.  **Stop Leaks**: Your variables are private by default. You choose exactly which ones to share with `process.env`, so you control what third-party code sees.
2.  **Fail-Fast Validation**: Validate your variables against a schema when your app starts. No more chasing down bugs caused by a missing `DATABASE_URL` in production. Works with Zod, Valibot, ArkType, or any other [Standard Schema](https://standardschema.dev) validator.
3.  **Immutable Config**: Once loaded, your environment is locked. No more accidental changes at runtime.

It's a safer, more reliable way to manage your config.

## ✨ Features

- **Secure by Default**: Isolates environment variables from `process.env` to prevent leaks.
- **Runtime Schema Validation**: Use Zod, Valibot, ArkType, or any [Standard Schema](https://standardschema.dev) validator to catch errors early.
- **Controlled Exposure**: Explicitly share only the variables you want exposed to `process.env`.
- **Immutable Config**: Your environment is read-only after initialization.
- **Load from Anywhere**: Use `.env` files or any plain JavaScript object.
- **Fully Type-Safe**: Get full autocompletion and type safety for your variables.
- **Zero Dependencies**: Lightweight, with no runtime dependencies besides your chosen validator.

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
import * as z from 'zod';

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

## 📚 Documentation

For all configuration options, please see [the API docs](https://www.jsdocs.io/package/process-venv).

## 🤝 Contributing

Want to contribute? Awesome! To show your support is to star the project, or to raise issues on [GitHub](https://github.com/shahradelahi/process-venv)

Thanks again for your support, it is much appreciated! 🙏

## License

[MIT](/LICENSE) © [Shahrad Elahi](https://github.com/shahradelahi) and [contributors](https://github.com/shahradelahi/process-venv/graphs/contributors).
