import { PrismaClient } from "@prisma/client";
import { perfQueryExtension } from "./perf";

export const prisma = new PrismaClient().$extends(perfQueryExtension);
