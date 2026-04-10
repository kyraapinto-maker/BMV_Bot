import { z } from 'zod';
import { insertPropertySchema, insertCallSchema, insertOpportunitySchema, properties, calls, opportunities } from './schema';
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
    },
    create: {
      method: 'POST' as const,
      path: '/api/properties' as const,
      input: insertPropertySchema,
      responses: {
        201: z.custom<typeof properties.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/properties/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    search: {
      method: 'GET' as const,
      path: '/api/properties/search' as const,
      input: z.object({ postcode: z.string() }),
      responses: {
        200: z.array(z.custom<typeof properties.$inferSelect>()),
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
      path: '/api/calls/:unique_index' as const,
      responses: {
        201: z.custom<typeof calls.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    callAll: {
      method: 'POST' as const,
      path: '/api/calls/all' as const,
      responses: {
        200: z.object({ initiated: z.number(), errors: z.number() }),
      },
    },
  },
  opportunities: {
    list: {
      method: 'GET' as const,
      path: '/api/opportunities' as const,
      responses: {
        200: z.array(z.custom<typeof opportunities.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/opportunities' as const,
      input: insertOpportunitySchema,
      responses: {
        201: z.custom<typeof opportunities.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/opportunities/:id' as const,
      input: insertOpportunitySchema.partial(),
      responses: {
        200: z.custom<typeof opportunities.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/opportunities/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    activate: {
      method: 'POST' as const,
      path: '/api/opportunities/:id/activate' as const,
      responses: {
        200: z.custom<typeof opportunities.$inferSelect>(),
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
