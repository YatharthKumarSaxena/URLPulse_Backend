import type { RequestHandler } from "express";
import { onProgress } from "../events/progress.events.js";

export const streamBatchProgress: RequestHandler = (req, res) => {
  const param = req.params.batchId;
  const batchId = Array.isArray(param) ? param[0]! : param!;
  res.status(200).set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" });
  res.flushHeaders();
  res.write(`event: connected\ndata: ${JSON.stringify({ batchId })}\n\n`);
  const unsubscribe = onProgress((event) => {
    if (event.batchId === batchId) res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  });
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25_000);
  req.on("close", () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
};
