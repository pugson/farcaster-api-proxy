# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Farcaster API proxy built with Next.js. It proxies requests to `farcaster.xyz/~api` with CORS support and caching.

## Commands

- `yarn dev` - Start development server on port 3000
- `yarn build` - Build for production
- `yarn start` - Start production server

## Architecture

The proxy uses Next.js rewrites to map all root paths (`/:path*`) to API routes (`/api/:path*`).

**Single API endpoint:** `src/pages/api/[username]/[hash].ts`
- Accepts `GET/POST/HEAD` requests with CORS enabled
- Proxies to `https://farcaster.xyz/~api/v2/user-thread-casts`
- Returns thread casts for a given username and cast hash prefix
- Responses are cached for 1 hour (`s-maxage=3600`)

**URL pattern:** `/{username}/{hash}` → fetches cast thread

## Environment Variables

- `FARCASTER_API_TOKEN` - Bearer token for Farcaster API authentication (required)
