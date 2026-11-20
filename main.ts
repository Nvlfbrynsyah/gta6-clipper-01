import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const videoId = /^[A-Za-z0-9_-]{11}$/;
const shortPath = /^\/shorts\/([A-Za-z0-9_-]{11})\/?$/;
const sharePath = /^\/[A-Za-z0-9_-]{11}\/?$/;
const youtubeHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

function isYouTubeVideo(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  value = value.trim();
  if (value.length > 2048) return false;

  const url = URL.parse(value);
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.port) {
    return false;
  }

  if (url.hostname === 'youtu.be') return sharePath.test(url.pathname);
  if (!youtubeHosts.has(url.hostname)) return false;
  if (url.pathname === '/watch') {
    const ids = url.searchParams.getAll('v');
    return ids.length === 1 && videoId.test(ids[0]);
  }
  return shortPath.test(url.pathname);
}

const source = join(process.env.MAKEFUN_BOT_DIR ?? '/bot', 'VIDEO.json');
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const destination = join(output, 'VIDEO.json');

try {
  const bytes = readFileSync(source);
  if (bytes.length > 16384) {
    throw new Error('VIDEO.json must be at most 16384 bytes.');
  }
  const entry = JSON.parse(bytes.toString('utf8'));
  if (entry?.url === 'https://www.youtube.com/shorts/<id>') {
    throw new Error('The URL is still the placeholder. Replace <id> with the uploaded video’s YouTube URL.');
  }
  if (!isYouTubeVideo(entry?.url)) {
    throw new Error('Expected a YouTube Shorts, watch, or youtu.be URL with an 11-character video ID.');
  }

  mkdirSync(output, { recursive: true });
  writeFileSync(destination, bytes);
  console.log(`Copied ${bytes.length} bytes to ${destination}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Could not copy ${source} to ${destination}: ${message}`);
  process.exitCode = 1;
}
