import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem?: number },
) => Promise<Buffer>;

const PARAMS = { N: 1 << 15, r: 8, p: 1 } as const;
const KEY_LEN = 64;
const SALT_LEN = 16;
const MAX_MEM = 64 * 1024 * 1024;

const FORMAT = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const derived = await scrypt(password, salt, KEY_LEN, { ...PARAMS, maxmem: MAX_MEM });
  return [
    FORMAT,
    `N=${PARAMS.N},r=${PARAMS.r},p=${PARAMS.p}`,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== FORMAT) return false;

  const params = parseParams(parts[1]!);
  if (!params) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[2]!, "base64");
    expected = Buffer.from(parts[3]!, "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = await scrypt(password, salt, expected.length, { ...params, maxmem: MAX_MEM });
  } catch {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

function parseParams(raw: string): { N: number; r: number; p: number } | null {
  const out: Record<string, number> = {};
  for (const seg of raw.split(",")) {
    const [k, v] = seg.split("=");
    if (!k || !v) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    out[k] = n;
  }
  if (out.N === undefined || out.r === undefined || out.p === undefined) return null;
  return { N: out.N, r: out.r, p: out.p };
}
