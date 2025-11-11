/**
 * JWT User Assertion Signer for APIBlaze Admin API
 * 
 * Creates signed JWTs that assert a user's identity and permissions
 * when making requests to the internal admin API.
 * 
 * Security features:
 * - RS256 signature (asymmetric - worker only needs public key)
 * - Short-lived tokens (5 minutes default)
 * - Body hash binding to prevent replay attacks with modified payloads
 * - JTI (JWT ID) for additional replay protection
 * - Standard claims (iat, exp, nbf, sub, iss, aud)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface UserAssertionClaims {
  sub: string;           // User ID (e.g., "github:12345" or "user_abc123")
  handle: string;        // Username/handle (e.g., "jayjaychicago")
  email?: string;        // User email
  roles?: string[];      // User roles (e.g., ["admin", "developer"])
  teams?: string[];      // Team IDs user belongs to
}

interface JWTPayload extends UserAssertionClaims {
  iss: string;           // Issuer (your dashboard)
  aud: string;           // Audience (admin API)
  iat: number;           // Issued at (Unix timestamp)
  exp: number;           // Expires at (Unix timestamp)
  nbf: number;           // Not before (Unix timestamp)
  jti: string;           // JWT ID (unique identifier for this token)
  bod?: string;          // Body hash (SHA256 of request body)
}

export class JWTUserAssertionSigner {
  private privateKey: string;
  private issuer: string;
  private audience: string;
  private ttlSeconds: number;

  constructor(options?: {
    privateKeyPath?: string;
    privateKey?: string;
    issuer?: string;
    audience?: string;
    ttlSeconds?: number;
  }) {
    // Load private key
    if (options?.privateKey) {
      this.privateKey = options.privateKey;
    } else {
      const keyPath = options?.privateKeyPath || path.join(process.cwd(), 'jwt-private.pem');
      this.privateKey = fs.readFileSync(keyPath, 'utf8');
    }

    this.issuer = options?.issuer || 'apiblaze-dashboard';
    this.audience = options?.audience || 'apiblaze-admin-api';
    this.ttlSeconds = options?.ttlSeconds || 300; // 5 minutes default
  }

  /**
   * Create a signed JWT user assertion
   */
  sign(claims: UserAssertionClaims, requestBody?: unknown): string {
    const now = Math.floor(Date.now() / 1000);
    
    const payload: JWTPayload = {
      // User claims
      ...claims,
      
      // Standard claims
      iss: this.issuer,
      aud: this.audience,
      iat: now,
      nbf: now,
      exp: now + this.ttlSeconds,
      jti: this.generateJTI(),
    };

    // Add body hash for replay protection
    if (requestBody !== undefined) {
      payload.bod = this.hashBody(requestBody);
    }

    // Create JWT manually (RS256)
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createSign('RSA-SHA256')
      .update(signatureInput)
      .sign(this.privateKey, 'base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${signatureInput}.${signature}`;
  }

  /**
   * Generate a unique JWT ID
   */
  private generateJTI(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash the request body for binding
   */
  private hashBody(body: unknown): string {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHash('sha256').update(bodyString).digest('hex');
  }

  /**
   * Base64 URL encode (without padding)
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Create the X-User-Assertion header value
   */
  createAuthHeader(claims: UserAssertionClaims, requestBody?: unknown): string {
    const token = this.sign(claims, requestBody);
    return `Bearer ${token}`;
  }
}

/**
 * Helper function to create a JWT signer instance
 */
export function createJWTSigner(options?: {
  privateKeyPath?: string;
  privateKey?: string;
  issuer?: string;
  audience?: string;
  ttlSeconds?: number;
}): JWTUserAssertionSigner {
  return new JWTUserAssertionSigner(options);
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { createJWTSigner } from '@/lib/jwt-signer';
 * 
 * const signer = createJWTSigner();
 * 
 * const requestBody = {
 *   username: "jayjaychicago",
 *   target: "https://httpbin.org",
 *   auth_type: "api_key"
 * };
 * 
 * const headers = {
 *   'Content-Type': 'application/json',
 *   'X-API-KEY': process.env.APIBLAZE_ADMIN_API_KEY,
 *   'X-User-Assertion': signer.createAuthHeader({
 *     sub: 'github:12345',
 *     handle: 'jayjaychicago',
 *     email: 'jay@example.com',
 *     roles: ['admin']
 *   }, requestBody)
 * };
 * 
 * const response = await fetch('https://internalapi.apiblaze.com/', {
 *   method: 'POST',
 *   headers,
 *   body: JSON.stringify(requestBody)
 * });
 * ```
 */

