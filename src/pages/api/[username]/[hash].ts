import Cors from "cors";
import type { NextApiRequest, NextApiResponse } from "next";

// Initializing the cors middleware
// You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
const cors = Cors({
  methods: ["POST", "GET", "HEAD"],
});

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req: NextApiRequest, res: NextApiResponse, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }

      return resolve(result);
    });
  });
}

export default async function handler(req: any, res: any) {
  // Run the middleware
  await runMiddleware(req, res, cors);
  res.setHeader("Cache-Control", "s-maxage=3600");
  const { hash, username } = req.query;

  if (!hash || !username) {
    return res.status(400).json({ error: "Missing hash or username" });
  }

  const farcaster = await fetch(
    `https://farcaster.xyz/~api/v2/user-thread-casts?castHashPrefix=${hash}&username=${username}&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${process.env.FARCASTER_API_TOKEN}`,
      },
    }
  );
  const cast = await farcaster.json();

  res.status(200).json(cast);
}
