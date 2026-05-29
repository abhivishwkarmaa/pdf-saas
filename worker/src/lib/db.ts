import pkg from "@prisma/client";
const { PrismaClient } = pkg as any;

export const prisma = new PrismaClient();
