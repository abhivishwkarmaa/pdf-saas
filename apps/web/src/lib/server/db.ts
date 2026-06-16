export const prisma = {
  $queryRaw: async (
    _strings: TemplateStringsArray | string,
    ..._values: any[]
  ): Promise<any[]> => {
    throw new Error("Database connection disabled in stateless mode");
  },
  preset: {
    findMany: async (..._args: any[]): Promise<any[]> => [],
    create: async (args: { data: any }): Promise<any> => {
      return { id: `mock-${Date.now()}`, ...args.data, createdAt: new Date() };
    },
  },
  job: {
    findMany: async (..._args: any[]): Promise<any[]> => [],
  },
};



