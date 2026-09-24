import { handle } from "../lib/handle.js";

export default async function handler(req, res) {
  const result = await handle(req);
  res.writeHead(result.status, result.headers);
  res.end(result.body);
}
