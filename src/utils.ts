import type { UnsanitizedEnv } from './typings';

export function removeUndefined(obj: UnsanitizedEnv): UnsanitizedEnv {
  const newObj: UnsanitizedEnv = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  }
  return newObj;
}
