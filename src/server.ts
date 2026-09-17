import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { app } from "./app.js";

const server = app.listen(env.PORT, () => console.log(`URLPulse API listening on port ${env.PORT}`));
const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
