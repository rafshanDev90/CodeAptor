import dns from 'node:dns';
import https from 'node:https';
import tls from 'node:tls';

const { promises: dnsPromises } = dns;

function httpGet(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      rejectUnauthorized: false,
      timeout,
      headers: {
        'User-Agent': 'Codeaptor-Audit/1.0',
      },
    };

    const req = https.request(opts, (res) => {
      const chunks = [];
      let totalSize = 0;

      res.on('data', (chunk) => {
        chunks.push(chunk);
        totalSize += chunk.length;
        if (totalSize > 500000) {
          req.destroy();
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8').slice(0, 100000),
            truncated: true,
          });
        }
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
          truncated: false,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    req.end();
  });
}

function checkSSL(hostname, timeout = 10000) {
  return new Promise((resolve) => {
    const socket = tls.connect(443, hostname, { rejectUnauthorized: false, servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve({
        issuer: cert.issuer ? Object.values(cert.issuer).join(', ') : 'unknown',
        subject: cert.subject ? Object.values(cert.subject).join(', ') : 'unknown',
        validFrom: cert.valid_from,
        validTo: cert.valid_to,
        daysRemaining: cert.valid_to
          ? Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000)
          : null,
        fingerprint: cert.fingerprint,
      });
    });

    socket.on('error', () => {
      resolve(null);
    });

    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve(null);
    });
  });
}

function parseTitle(body) {
  const match = body.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function parseMetaDescription(body) {
  const match = body.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || body.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return match ? match[1].trim() : null;
}

function countLinks(body, baseUrl) {
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["']/gi;
  let m;
  while ((m = regex.exec(body)) !== null) {
    links.push(m[1]);
  }
  return links;
}

async function checkBrokenLinks(links, baseHostname, maxChecks = 10) {
  const internal = links
    .filter(l => l.startsWith('/') || l.includes(baseHostname))
    .slice(0, maxChecks);
  const results = [];

  for (const link of internal) {
    try {
      const url = link.startsWith('http') ? link : `https://${baseHostname}${link}`;
      const res = await httpGet(url, 5000);
      results.push({ url, status: res.status });
    } catch {
      results.push({ url: link, status: 'error' });
    }
  }
  return results;
}

export const analyzeWebsite = {
  description: 'Run a full technical audit on a website: DNS records, SSL certificate, HTTP headers, page size, load time, title, meta description, and broken links.',
  parameters: {
    url: { type: 'string', description: 'The full website URL to analyze (e.g., https://example.com)' },
  },
  execute: async ({ url }) => {
    const startTime = Date.now();
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    const dnsPromise = dnsPromises.resolve4(hostname)
      .then(addrs => ({ status: 'ok', a: addrs }))
      .catch(err => ({ status: 'error', message: err.code }));

    const dnsNsPromise = dnsPromises.resolveNs(hostname)
      .then(ns => ({ status: 'ok', nameservers: ns }))
      .catch(() => ({ status: 'not_found', nameservers: [] }));

    const sslPromise = checkSSL(hostname);
    const httpPromise = httpGet(url);

    const [dnsResult, nsResult, sslResult, httpResult] = await Promise.allSettled([
      dnsPromise, dnsNsPromise, sslPromise, httpPromise,
    ]);

    const loadTime = Date.now() - startTime;

    const page = {};
    let broken = [];

    if (httpResult.status === 'fulfilled' && httpResult.value) {
      const res = httpResult.value;
      const server = res.headers['server'] || 'unknown';
      const contentType = res.headers['content-type'] || 'unknown';
      const size = parseInt(res.headers['content-length'] || '0') || res.body.length;

      page.status = res.status;
      page.server = server;
      page.contentType = contentType;
      page.sizeBytes = size;
      page.sizeKB = Math.round(size / 1024);

      if (res.body) {
        page.title = parseTitle(res.body) || null;
        page.metaDescription = parseMetaDescription(res.body) || null;

        const links = countLinks(res.body, url);
        page.totalLinks = links.length;

        if (links.length > 0) {
          broken = await checkBrokenLinks(links, hostname);
          page.brokenLinks = broken.filter(b => b.status !== 200).length;
          page.brokenLinksDetails = broken.filter(b => b.status !== 200);
        } else {
          page.brokenLinks = 0;
        }
      }
    } else {
      page.error = httpResult.status === 'rejected' ? httpResult.reason.message : 'fetch failed';
    }

    return {
      url,
      hostname,
      loadTimeMs: loadTime,
      dns: dnsResult.status === 'fulfilled' ? dnsResult.value : { status: 'error', message: dnsResult.reason?.message },
      nameservers: nsResult.status === 'fulfilled' ? nsResult.value : { status: 'error' },
      ssl: sslResult.status === 'fulfilled' ? sslResult.value : null,
      page,
    };
  },
};
