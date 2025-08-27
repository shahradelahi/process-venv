import { afterEach, beforeEach, describe, expect, expectTypeOf, test, vi } from 'vitest';
import { z } from 'zod';

import { InvalidEnvironmentError } from './errors';
import { createEnv } from './index';
import { UnsanitizedEnv } from './typings';

describe('createEnv', () => {
  const originalProcessEnv = process.env;

  beforeEach(() => {
    process.env = {}; // Clear process.env before each test
  });

  afterEach(() => {
    process.env = originalProcessEnv; // Restore original process.env after each test
    vi.restoreAllMocks();
  });

  const baseSchema = {
    APP_NAME: z.string().default('TestApp'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('test'),
    PORT: z.coerce.number().default(3000),
  };

  const featureSchema = {
    FEATURE_FLAG: z.coerce.boolean().default(false),
    API_KEY: z.string(),
  };

  const extendedSchema = {
    OVERRIDE_VAR: z.string().default('default'),
    APP_NAME: z.string().default('OverriddenApp'), // Overrides baseSchema APP_NAME
  };

  test('should load and validate environment variables from initialEnv', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: '8080',
      API_KEY: 'test-api-key',
    };

    const venv = createEnv(
      {
        schema: { ...baseSchema, ...featureSchema },
        shared: ['NODE_ENV', 'PORT'],
      },
      initialEnv
    );

    expect(venv.NODE_ENV).toBe('development');
    expect(venv.PORT).toBe(8080);
    expect(venv.APP_NAME).toBe('TestApp'); // Default value
    expect(venv.API_KEY).toBe('test-api-key');

    expect(process.env['NODE_ENV']).toBe('development');
    expect(process.env['PORT']).toBe('8080');
    expect(process.env['API_KEY']).toBeUndefined();

    // Type assertions
    expectTypeOf(venv.APP_NAME).toEqualTypeOf<string>();
    expectTypeOf(venv.NODE_ENV).toEqualTypeOf<'development' | 'production' | 'test'>();
    expectTypeOf(venv.PORT).toEqualTypeOf<number>();
    expectTypeOf(venv.API_KEY).toEqualTypeOf<string>();
  });

  test('should throw InvalidEnvironmentError when accessing a non-existent variable', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: '8080',
      API_KEY: 'test-api-key',
    };

    const venv = createEnv(
      {
        schema: { ...baseSchema, ...featureSchema },
        shared: ['NODE_ENV', 'PORT'],
      },
      initialEnv
    );

    // @ts-expect-error - Testing access to a non-existent property
    expect(() => venv.NON_EXISTENT_VAR).toThrow(InvalidEnvironmentError);
    // @ts-expect-error - Testing access to a non-existent property
    expect(() => venv.NON_EXISTENT_VAR).toThrow(
      'Attempted to access an invalid environment variable: "NON_EXISTENT_VAR". This variable is not defined in your schema.'
    );
  });

  test('should throw InvalidEnvironmentError when attempting to set a variable', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: '8080',
      API_KEY: 'test-api-key',
    };

    const venv = createEnv(
      {
        schema: { ...baseSchema, ...featureSchema },
        shared: ['NODE_ENV', 'PORT'],
      },
      initialEnv
    );

    // @ts-expect-error - Testing immutability
    expect(() => (venv.API_KEY = 'new-key')).toThrow(InvalidEnvironmentError);
    // @ts-expect-error - Testing immutability
    expect(() => (venv.API_KEY = 'new-key')).toThrow(
      'Attempted to set environment variable: "API_KEY". Environment variables are immutable.'
    );
  });

  test('should throw InvalidEnvironmentError when attempting to delete a variable', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: '8080',
      API_KEY: 'test-api-key',
    };

    const venv = createEnv(
      {
        schema: { ...baseSchema, ...featureSchema },
        shared: ['NODE_ENV', 'PORT'],
      },
      initialEnv
    );

    // @ts-expect-error - Testing immutability
    expect(() => delete venv.API_KEY).toThrow(InvalidEnvironmentError);
    // @ts-expect-error - Testing immutability
    expect(() => delete venv.API_KEY).toThrow(
      'Attempted to delete environment variable: "API_KEY". Environment variables are immutable.'
    );
  });

  test('should throw InvalidEnvironmentError for missing required variables', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: '8080',
      // API_KEY is missing
    };

    expect(() =>
      createEnv(
        {
          schema: { ...baseSchema, ...featureSchema },
          shared: ['NODE_ENV', 'PORT'],
        },
        initialEnv
      )
    ).toThrow(InvalidEnvironmentError);
  });

  test('should throw InvalidEnvironmentError for type mismatch', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: 'not-a-number',
      API_KEY: 'test-api-key',
    };

    expect(() =>
      createEnv(
        {
          schema: { ...baseSchema, ...featureSchema },
          shared: ['NODE_ENV', 'PORT'],
        },
        initialEnv
      )
    ).toThrow(InvalidEnvironmentError);
  });

  test('should merge schemas and env data from extended instances', () => {
    const baseEnv = createEnv(
      {
        schema: baseSchema,
        shared: [],
      },
      { APP_NAME: 'BaseApp', PORT: '1000' }
    );

    const featureEnv = createEnv(
      {
        schema: featureSchema,
      },
      { FEATURE_FLAG: 'true', API_KEY: 'feature-key' }
    );

    // When extending, we pass the output of createEnv directly
    const appEnv = createEnv(
      {
        schema: extendedSchema,
        extends: [baseEnv, featureEnv],
        shared: ['APP_NAME', 'PORT', 'FEATURE_FLAG'],
      },
      { OVERRIDE_VAR: 'app-override' }
    );

    // Check merged data and precedence
    expect(appEnv.APP_NAME).toBe('OverriddenApp'); // extendedSchema default is overridden by baseEnv data
    expect(appEnv.PORT).toBe(1000); // From baseEnv
    expect(appEnv.FEATURE_FLAG).toBe(true); // From featureEnv
    expect(appEnv.API_KEY).toBe('feature-key'); // From featureEnv
    expect(appEnv.OVERRIDE_VAR).toBe('app-override'); // From appEnv initialEnv

    // Check process.env based on appEnv's shared keys
    expect(process.env['APP_NAME']).toBe('OverriddenApp');
    expect(process.env['PORT']).toBe('1000');
    expect(process.env['FEATURE_FLAG']).toBe('true');
    expect(process.env['API_KEY']).toBeUndefined();
    expect(process.env['OVERRIDE_VAR']).toBeUndefined();

    // Type assertions
    expectTypeOf(appEnv.APP_NAME).toEqualTypeOf<string>();
    expectTypeOf(appEnv.NODE_ENV).toEqualTypeOf<'development' | 'production' | 'test'>();
    expectTypeOf(appEnv.PORT).toEqualTypeOf<number>();
    expectTypeOf(appEnv.FEATURE_FLAG).toEqualTypeOf<boolean>();
    expectTypeOf(appEnv.API_KEY).toEqualTypeOf<string>();
    expectTypeOf(appEnv.OVERRIDE_VAR).toEqualTypeOf<string>();
  });

  test('should handle empty extends array gracefully', () => {
    const initialEnv: UnsanitizedEnv = {
      NODE_ENV: 'development',
      PORT: '8080',
      API_KEY: 'test-api-key',
    };

    const venv = createEnv(
      {
        schema: { ...baseSchema, ...featureSchema },
        shared: ['NODE_ENV', 'PORT'],
        extends: [],
      },
      initialEnv
    );

    expect(venv.NODE_ENV).toBe('development');
    expect(venv.PORT).toBe(8080);

    // Type assertions
    expectTypeOf(venv.APP_NAME).toEqualTypeOf<string>();
    expectTypeOf(venv.NODE_ENV).toEqualTypeOf<'development' | 'production' | 'test'>();
    expectTypeOf(venv.PORT).toEqualTypeOf<number>();
    expectTypeOf(venv.API_KEY).toEqualTypeOf<string>();
  });
});
