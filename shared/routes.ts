import { z } from 'zod';
import { insertPropertySchema, insertCallSchema, properties, calls } from './schema';
import type { CallWithProperty } from './schema';

export const errorSchemas = {
  notFound: z.object({ message: z.string() }),
  validation: z.object({ message: z.string(), field: z.string().optional() }),
};

export const api = {
  properties: {
    list: {
      method: 'GET' as const,
      path: '/api/properties' as const,
      responses: {
        200: z.array(z.custom<typeof properties.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/properties/:id' as const,
      responses: {
        200: z.custom<typeof properties.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },
  calls: {
    list: {
      method: 'GET' as const,
      path: '/api/calls' as const,
      responses: {
        200: z.array(z.custom<CallWithProperty>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/properties/:id/call' as const,
      responses: {
        201: z.custom<typeof calls.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
