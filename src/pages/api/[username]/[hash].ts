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

function transformAuthor(author: any) {
  return {
    fid: author.fid,
    displayName: author.display_name || author.username,
    username: author.username,
    profile: {
      bio: {
        text: author.profile?.bio?.text || "",
        mentions: author.profile?.bio?.mentioned_profiles || [],
      },
      location: {
        placeId: "",
        description: "",
      },
    },
    followerCount: author.follower_count || 0,
    followingCount: author.following_count || 0,
    pfp: {
      url: author.pfp_url || "",
      verified: false,
    },
    viewerContext: {
      following: author.viewer_context?.following || false,
      blockedBy: author.viewer_context?.blocked_by || false,
    },
  };
}

function transformEmbed(embed: any) {
  if (embed.url) {
    return {
      type: "url",
      openGraph: {
        url: embed.metadata?.html?.ogUrl || embed.url,
        sourceUrl: embed.url,
        title: embed.metadata?.html?.ogTitle || "",
        description: embed.metadata?.html?.ogDescription || "",
        domain: new URL(embed.url).hostname,
        image: embed.metadata?.html?.ogImage?.[0]?.url || "",
        useLargeImage: true,
      },
    };
  }
  return embed;
}

function transformCast(cast: any): any {
  const timestamp = new Date(cast.timestamp).getTime();

  const images = cast.embeds
    ?.filter((e: any) => e.metadata?.content_type?.startsWith("image/"))
    ?.map((e: any) => ({
      type: "image",
      url: e.url,
      sourceUrl: e.url,
      alt: "Cast image embed",
      media: {
        version: "2",
        width: e.metadata?.image?.width_px || 0,
        height: e.metadata?.image?.height_px || 0,
        staticRaster: e.url,
        mimeType: e.metadata?.content_type || "image/jpeg",
      },
    })) || [];

  const urls = cast.embeds
    ?.filter((e: any) => e.url && !e.metadata?.content_type?.startsWith("image/") && !e.metadata?.content_type?.startsWith("video/"))
    ?.map(transformEmbed) || [];

  const videos = cast.embeds
    ?.filter((e: any) => e.metadata?.content_type?.startsWith("video/"))
    ?.map((e: any) => ({
      type: "video",
      url: e.url,
      sourceUrl: e.url,
    })) || [];

  return {
    hash: cast.hash,
    threadHash: cast.thread_hash || cast.hash,
    author: transformAuthor(cast.author),
    text: cast.text,
    timestamp,
    replies: { count: cast.replies?.count || 0 },
    reactions: { count: cast.reactions?.likes_count || 0 },
    recasts: { count: cast.reactions?.recasts_count || 0 },
    watches: { count: 0 },
    parentHash: cast.parent_hash || undefined,
    parentAuthor: cast.parent_author?.fid ? transformAuthor(cast.parent_author) : undefined,
    mentions: cast.mentioned_profiles?.map(transformAuthor) || [],
    embeds: {
      images,
      urls,
      unknowns: [],
      videos,
      processedCastText: cast.text,
    },
    ancestors: { count: 0 },
    tags: cast.channel ? [{
      type: "channel",
      id: cast.channel.id,
      name: cast.channel.name || cast.channel.id,
      imageUrl: cast.channel.image_url || "",
    }] : [],
    quoteCount: 0,
    combinedRecastCount: cast.reactions?.recasts_count || 0,
    warpsTipped: 0,
    channel: cast.channel ? {
      key: cast.channel.id,
      name: cast.channel.name || cast.channel.id,
      imageUrl: cast.channel.image_url || "",
      authorContext: {
        role: cast.author_channel_context?.role || "none",
        restricted: false,
        banned: false,
      },
      authorRole: cast.author_channel_context?.role || "none",
    } : undefined,
    viewerContext: {
      reacted: cast.viewer_context?.liked || false,
      recast: cast.viewer_context?.recasted || false,
      warpsTipped: 0,
      bookmarked: false,
    },
  };
}

export default async function handler(req: any, res: any) {
  await runMiddleware(req, res, cors);
  res.setHeader("Cache-Control", "s-maxage=3600");
  const { hash, username } = req.query;

  if (!hash || !username) {
    return res.status(400).json({ error: "Missing hash or username" });
  }

  const castUrl = `https://farcaster.xyz/${username}/${hash}`;
  const neynar = await fetch(
    `https://api.neynar.com/v2/farcaster/cast?identifier=${encodeURIComponent(castUrl)}&type=url`,
    {
      headers: {
        "x-api-key": process.env.NEYNAR_API_KEY!,
      },
    }
  );
  const data = await neynar.json();

  if (!data.cast) {
    return res.status(404).json({ error: "Cast not found" });
  }

  const transformedCast = transformCast(data.cast);

  res.status(200).json({
    result: {
      casts: [transformedCast],
    },
  });
}
