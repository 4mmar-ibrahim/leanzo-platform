import dns from 'dns';
import http from 'http';
import https from 'https';
import { URL } from 'url';

export interface SafeFetchResult {
  buffer: Buffer;
  contentType: string;
  finalUrl: string;
}

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [a, b, c, d] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 100.64.0.0/10 (Shared address / CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 169.254.0.0/16 (Link local & Cloud metadata e.g. 169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (Private network: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (a === 255 && b === 255 && c === 255 && d === 255) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, or link local.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const ipv4Part = normalized.replace('::ffff:', '');
    if (ipv4Part.includes('.')) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // Unique local address (fc00::/7 -> fc00 to fdff)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link local (fe80::/10 -> fe80 to febf)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }

  return false;
}

/**
 * Validates whether a hostname / IP is safe from SSRF.
 */
export async function validateSafeHost(hostname: string): Promise<{ isSafe: boolean; reason?: string; resolvedIp?: string }> {
  const lowerHost = hostname.toLowerCase();

  // Explicit hostnames to block
  if (
    lowerHost === 'localhost' ||
    lowerHost.endsWith('.localhost') ||
    lowerHost.endsWith('.local') ||
    lowerHost.endsWith('.internal') ||
    lowerHost === 'metadata.google.internal' ||
    lowerHost === 'instance-data'
  ) {
    return { isSafe: false, reason: 'SSRF_BLOCKED_FORBIDDEN_HOSTNAME' };
  }

  // If host is a raw IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lowerHost)) {
    if (isPrivateIPv4(lowerHost)) {
      return { isSafe: false, reason: 'SSRF_BLOCKED_PRIVATE_IP' };
    }
    return { isSafe: true, resolvedIp: lowerHost };
  }

  // If host is a raw IPv6 enclosed or not
  const cleanIPv6 = lowerHost.replace(/^\[|\]$/g, '');
  if (cleanIPv6.includes(':')) {
    if (isPrivateIPv6(cleanIPv6)) {
      return { isSafe: false, reason: 'SSRF_BLOCKED_PRIVATE_IPV6' };
    }
    return { isSafe: true, resolvedIp: cleanIPv6 };
  }

  // Resolve DNS to verify the resolved address isn't internal
  try {
    const records = await dns.promises.lookup(lowerHost, { all: true });
    if (!records || records.length === 0) {
      return { isSafe: false, reason: 'DNS_RESOLUTION_EMPTY' };
    }

    for (const record of records) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        return { isSafe: false, reason: `SSRF_BLOCKED_PRIVATE_IP: ${record.address}` };
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        return { isSafe: false, reason: `SSRF_BLOCKED_PRIVATE_IPV6: ${record.address}` };
      }
    }

    return { isSafe: true, resolvedIp: records[0].address };
  } catch (err: any) {
    return { isSafe: false, reason: `DNS_RESOLUTION_FAILED: ${err.message}` };
  }
}

/**
 * Safely fetches media from an external URL with SSRF protection,
 * redirect re-validation, max size cap, and strict timeout.
 */
export async function safeFetchMedia(
  inputUrl: string,
  maxSizeBytes: number = 100 * 1024 * 1024,
  maxRedirects: number = 4
): Promise<SafeFetchResult> {
  let currentUrl = inputUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(currentUrl);
    } catch {
      throw new Error('INVALID_URL_FORMAT');
    }

    // Scheme validation: strictly http or https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error(`UNSUPPORTED_PROTOCOL: ${parsedUrl.protocol}`);
    }

    // SSRF validation of the host
    const hostCheck = await validateSafeHost(parsedUrl.hostname);
    if (!hostCheck.isSafe) {
      throw new Error(`SSRF_PROTECTION_TRIGGERED: ${hostCheck.reason}`);
    }

    // Fetch using native http/https module
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const fetchResult = await new Promise<{
      statusCode?: number;
      headers: http.IncomingHttpHeaders;
      data?: Buffer;
      redirectUrl?: string;
    }>((resolve, reject) => {
      const req = client.get(
        parsedUrl,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,video/*,*/*;q=0.8',
          },
          timeout: 15000, // 15 seconds
        },
        (res) => {
          const { statusCode, headers } = res;

          // Check redirects
          if (
            statusCode &&
            [301, 302, 303, 307, 308].includes(statusCode) &&
            headers.location
          ) {
            res.resume(); // consume stream to free memory
            return resolve({
              statusCode,
              headers,
              redirectUrl: new URL(headers.location, parsedUrl).toString(),
            });
          }

          if (statusCode && (statusCode < 200 || statusCode >= 300)) {
            res.resume();
            return reject(new Error(`HTTP_STATUS_${statusCode}`));
          }

          // Check content-length header if present
          const declaredLength = parseInt(headers['content-length'] || '0', 10);
          if (declaredLength > maxSizeBytes) {
            res.destroy();
            return reject(new Error(`FILE_TOO_LARGE: Declared ${declaredLength} exceeds max ${maxSizeBytes}`));
          }

          const chunks: Buffer[] = [];
          let receivedBytes = 0;

          res.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            if (receivedBytes > maxSizeBytes) {
              res.destroy();
              return reject(new Error(`FILE_TOO_LARGE: Stream exceeded max ${maxSizeBytes}`));
            }
            chunks.push(chunk);
          });

          res.on('end', () => {
            resolve({
              statusCode,
              headers,
              data: Buffer.concat(chunks),
            });
          });

          res.on('error', (err) => {
            reject(err);
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('REQUEST_TIMEOUT'));
      });

      req.on('error', (err) => {
        reject(err);
      });
    });

    if (fetchResult.redirectUrl) {
      currentUrl = fetchResult.redirectUrl;
      redirectsCount++;
      continue;
    }

    if (!fetchResult.data) {
      throw new Error('EMPTY_RESPONSE_BODY');
    }

    const contentType = (fetchResult.headers['content-type'] || '').split(';')[0].trim();

    return {
      buffer: fetchResult.data,
      contentType,
      finalUrl: currentUrl,
    };
  }

  throw new Error('TOO_MANY_REDIRECTS');
}
