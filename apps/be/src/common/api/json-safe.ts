import { Prisma } from '../../generated/prisma/client.js';

export function toJsonSafeValue<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, currentValue: unknown) =>
      typeof currentValue === 'bigint' ? currentValue.toString() : currentValue,
    ),
  ) as T;
}

export function toJsonCacheValue(
  value: unknown,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (value === undefined) {
    return Prisma.JsonNull;
  }

  return toJsonSafeValue(value) as Prisma.InputJsonValue;
}
