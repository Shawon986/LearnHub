import { PrismaClient } from "@prisma/client";

// PrismaClient singleton: prevents exhausting connections during
// Next.js dev hot-reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
