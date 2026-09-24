import http from "node:http";
import { handle } from "./lib/handle.js";

const port = Number(process.env.PORT || 8787);
const server = http.createServer(async (req, res) => {
  try {
    const result = await handle(req);
    res.writeHead(result.status, result.headers);
    res.end(result.body);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : "Error");
  }
});

server.listen(port, () => {
  console.log(`gh-badges http://127.0.0.1:${port}`);
});
