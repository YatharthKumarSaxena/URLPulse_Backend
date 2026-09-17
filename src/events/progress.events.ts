import { EventEmitter } from "node:events";
import { createRedisConnection } from "../queue/connection.js";

export type ProgressEvent = { batchId: string; type: "progress" | "item"; data: unknown };
const emitter = new EventEmitter();
const channel = "urlpulse:batch-progress";
const publisher = createRedisConnection();
const subscriber = createRedisConnection();

subscriber.subscribe(channel).catch((error: unknown) => console.error("Redis progress subscription failed", error));
subscriber.on("message", (_channel: string, message: string) => {
  try { emitter.emit("progress", JSON.parse(message) as ProgressEvent); } catch { /* ignore malformed message */ }
});

export const publishProgress = async (event: ProgressEvent): Promise<void> => { await publisher.publish(channel, JSON.stringify(event)); };
export const onProgress = (listener: (event: ProgressEvent) => void): (() => void) => {
  emitter.on("progress", listener);
  return () => emitter.off("progress", listener);
};
