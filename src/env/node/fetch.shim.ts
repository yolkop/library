/**
 * This file is licensed under the MPL 2.0 license.
 * For more information, see https://mozilla.org/MPL/2.0/.
 *
 * This file is part of the yolkbot library,
 * originally created by hijinks & 1ust.
 */

import dns from 'node:dns';
import net from 'node:net';
import tls from 'node:tls';

import { socksConnect } from 'wwws';

import { UserAgent } from '#env/DataLoader';
import { getEnvVar } from '#env/env';

const parseChunkedBody = (body: string): string => {
    const chunks = [];
    let i = 0;
    const len = body.length;

    while (i < len) {
        const rnIdx = body.indexOf('\r\n', i);
        if (rnIdx === -1) break;

        const sizeHex = body.slice(i, rnIdx).trim();
        if (!sizeHex) {
            i = rnIdx + 2;
            continue;
        }

        const size = parseInt(sizeHex, 16);
        if (Number.isNaN(size) || size === 0) break;

        i = rnIdx + 2;
        chunks.push(body.slice(i, i + size));
        i += size + 2;
    }

    return chunks.join('');
}

interface SendHttpRequestParams {
    method: string;
    pathname: string;
    hostname: string;
    port: number;
    headers: Record<string, string | null | undefined>;
    body: string | null;
}

/** The response to an yolkbot fetch request */
export interface xfetchResponse {
    /** The response in JSON format. Throws an error if not JSON parseable */
    json: () => Promise<Record<string, any>>;
    /** The response in Text format */
    text: () => Promise<string>;
}

const sendHttpRequest = (socket: net.Socket, { method, pathname, hostname, port, headers, body }: SendHttpRequestParams, timeoutTime: number, resolve: (data: xfetchResponse) => void, reject: (err: Error) => void): void => {
    const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`[yolkbot fetch] timed out: ${method} ${hostname}:${port}${pathname}`));
    }, timeoutTime);

    headers['user-agent'] ??= UserAgent;

    let reqHeaders = Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join('');
    if (body && !('Content-Length' in headers)) reqHeaders += `Content-Length: ${Buffer.byteLength(body)}\r\n`;

    socket.write(`${method} ${pathname} HTTP/1.1\r\nHost: ${hostname}:${port}\r\n${reqHeaders}Connection: close\r\n\r\n`);
    if (body) socket.write(body);

    let response = '';
    let headersParsed = false;
    let contentLength = 0;
    let bodyStart = 0;

    socket.on('data', (data) => {
        response += data.toString();

        if (!headersParsed) {
            bodyStart = response.indexOf('\r\n\r\n');
            if (bodyStart !== -1) {
                headersParsed = true;
                bodyStart += 4;
                const headersText = response.slice(0, bodyStart - 4);
                const contentLengthRegex = /content-length:\s*(?<length>\d+)/i;
                const contentLengthMatch = contentLengthRegex.exec(headersText);
                if (contentLengthMatch && contentLengthMatch.groups) contentLength = parseInt(contentLengthMatch.groups.length, 10);
            }
        }

        if (headersParsed) {
            const isChunked = /transfer-encoding:\s*chunked/i.test(response);
            if (isChunked) {
                if (response.includes('\r\n0\r\n\r\n')) socket.destroy();
            } else if (contentLength > 0) {
                const bodyReceived = response.length - bodyStart;
                if (bodyReceived >= contentLength) socket.destroy();
            }
        }
    });

    socket.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
    });

    socket.on('close', () => {
        clearTimeout(timeout);

        const headerEnd = response.indexOf('\r\n\r\n');
        if (headerEnd === -1) return reject(new Error('HTTP response is malformed (missing header indicator)'));

        let parsedBody = response.slice(headerEnd + 4);
        if (/transfer-encoding:\s*chunked/i.test(response)) parsedBody = parseChunkedBody(parsedBody);

        resolve({
            json: async () => {
                try {
                    return Promise.resolve(JSON.parse(parsedBody));
                } catch {
                    console.error(`[yolkbot fetch] body: "${parsedBody}"`);
                    throw new Error('[yolkbot fetch] Failed to parse JSON');
                }
            },
            text: async () => Promise.resolve(parsedBody)
        });
    });
};

/** The parameters passable to an yolkbot fetch request */
export interface xfetchParams {
    /** The request HTTP method */
    method?: string;
    /** A socks5(h) proxy to use */
    proxy?: string | null;
    /** Headers to send in the request */
    headers?: Record<string, string | null | undefined>;
    /** The request body */
    body?: string | null;
    /** The request timeout in ms */
    timeout?: number;
}

export const fetchShim = async (url: string, { method = 'GET', proxy, headers = {}, body = null, timeout = 20000 }: xfetchParams = {}): Promise<xfetchResponse> => new Promise<xfetchResponse>((resolve, reject) => {
    try {
        const { hostname, port: rawPort, pathname: path, protocol, search } = new URL(url);
        const isHttps = protocol === 'https:';
        const pathname = path + search;
        const port = rawPort ? parseInt(rawPort, 10) : (isHttps ? 443 : 80);

        if (!proxy) {
            return dns.lookup(hostname, { family: 4 }, (err, host) => {
                if (err) return reject(err);

                const socket: net.Socket = isHttps ? tls.connect({ port, host, servername: hostname, rejectUnauthorized: getEnvVar('NODE_TLS_REJECT_UNAUTHORIZED') !== '0' }) : net.connect({ port, host });
                socket.on('connect', () => sendHttpRequest(socket, { method, pathname, hostname, port, headers, body }, timeout, resolve, reject));
            });
        }

        const proxyInfo = new URL(proxy);
        const scheme = proxyInfo.protocol.replace(':', '');
        if (scheme !== 'socks5' && scheme !== 'socks5h')
            return reject(new Error('[yolkbot fetch] your proxy must be socks5 or socks5h'));

        socksConnect({
            proxy: {
                hostname: proxyInfo.hostname,
                port: Number(proxyInfo.port),
                username: proxyInfo.username,
                password: proxyInfo.password
            },
            destHost: hostname,
            destPort: port,
            useTLS: isHttps,
            resolveDnsLocally: proxyInfo.protocol === 'socks5',
            rejectUnauthorized: getEnvVar('NODE_TLS_REJECT_UNAUTHORIZED') !== '0'
        })
            .then((socket) => sendHttpRequest(socket, { method, pathname, hostname, port, headers, body }, timeout, resolve, reject))
            .catch(reject);
    } catch (err) {
        reject(err);
    }
});