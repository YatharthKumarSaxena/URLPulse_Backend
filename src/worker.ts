import { prisma } from "./lib/prisma.js";
import { worker } from "./queue/worker.js";

console.log("URLPulse worker started");
const shutdown = async () => { await worker.close(); await prisma.$disconnect(); process.exit(0); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
