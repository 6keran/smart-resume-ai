import fs from 'node:fs';
import path from 'node:path';

const SOURCES = [
  path.join(process.cwd(), 'src/lib/career/roleProfiles.ts'),
  path.join(process.cwd(), 'src/lib/learning/youtubeResources.ts'),
];

function extractUrls(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const seen = new Map();
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const matches = line.match(/https?:\/\/[^\s"'`\)]+/g) || [];
    for (const raw of matches) {
      const url = raw.replace(/[.,;]+$/, '');
      if (!seen.has(url)) {
        seen.set(url, { source: rel, line: idx + 1, url });
      }
    }
  });
  return Array.from(seen.values());
}

async function checkUrl(entry, attempt = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
    };

    const initial = await fetch(entry.url, {
      method: 'GET',
      redirect: 'manual',
      headers,
      signal: controller.signal,
    });

    const initialStatus = initial.status;
    let redirectTarget = initial.headers.get('location') || '';
    if (redirectTarget && redirectTarget.startsWith('/')) {
      const parsed = new URL(entry.url);
      redirectTarget = `${parsed.origin}${redirectTarget}`;
    }

    let finalStatus = initialStatus;
    let finalUrl = redirectTarget || entry.url;

    if (initialStatus >= 300 && initialStatus < 400 && redirectTarget) {
      const followed = await fetch(entry.url, {
        method: 'GET',
        redirect: 'follow',
        headers,
        signal: controller.signal,
      });
      finalStatus = followed.status;
      finalUrl = followed.url || finalUrl;
    }

    let oembedStatus = null;
    if (entry.url.includes('youtube.com/watch') || entry.url.includes('youtu.be/')) {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(entry.url)}&format=json`,
        { headers, signal: controller.signal }
      );
      oembedStatus = oembedRes.status;
    }

    return {
      ...entry,
      initialStatus,
      redirectTarget: redirectTarget || '-',
      finalStatus,
      finalUrl: finalUrl === entry.url ? '-' : finalUrl,
      oembedStatus,
      ok:
        oembedStatus !== null
          ? oembedStatus === 200 && finalStatus < 400
          : finalStatus >= 200 && finalStatus < 400,
    };
  } catch (err) {
    clearTimeout(timer);
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500));
      return checkUrl(entry, attempt + 1);
    }
    const reason = err?.cause?.code || (err?.name === 'AbortError' ? 'TIMEOUT' : err?.message || 'FETCH_ERROR');
    return {
      ...entry,
      initialStatus: 'ERR',
      redirectTarget: '-',
      finalStatus: 'ERR',
      finalUrl: '-',
      oembedStatus: null,
      error: reason,
      ok: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const checkedAt = new Date().toISOString();
  const entries = SOURCES.flatMap(extractUrls);
  const results = [];

  for (const entry of entries) {
    results.push(await checkUrl(entry));
  }

  console.log(`Career & Learning Link Verification Report — Checked Date: ${checkedAt}`);
  console.log(`Total Unique URLs Checked: ${results.length}\n`);
  console.log('| Date | Source | Line | URL | Initial | Redirect Target | Final Status | oEmbed | Result |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const statusLabel = r.ok ? 'OK' : `FAIL (${r.error || r.finalStatus})`;
    console.log(
      `| ${checkedAt.slice(0, 10)} | ${r.source} | ${r.line} | ${r.url} | ${r.initialStatus} | ${r.redirectTarget} | ${r.finalStatus} | ${r.oembedStatus ?? '-'} | ${statusLabel} |`
    );
  }

  const dead = results.filter((r) => !r.ok);
  console.log(`\nSummary: ${results.length - dead.length}/${results.length} OK, ${dead.length} non-200/failed.`);
  if (dead.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
