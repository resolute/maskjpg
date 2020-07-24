import fs = require('fs');
import crypto = require('crypto');
import got = require('got');

/**
 * Coerce a value to a number.
 * @param arg any value to coerce to a number
 * @param falseReturn returned on failure
 */
export const number = <T, U>(arg: T, falseReturn: number | U) => {
  const num = Number(arg);
  if (!Number.isFinite(num)) {
    return falseReturn;
  }
  return num;
};

/**
 * Coerce a value to an integer. Utilizes the `Math.round()` to ensure integer
 * result.
 * @param arg any value to coerce to an integer
 * @param falseReturn returned on failure
 */
export const integer = <T, U>(arg: T, falseReturn: number | U) => {
  const num = number(arg, false);
  if (num === false) {
    return falseReturn;
  }
  return Math.round(num);
};

/**
 * Returns an integer between 1 (inclusive) and 100 (inclusive).
 * @param arg either a float between 0-1 or numeric between 0 and 100
 * @param falseReturn returned if arg is not a number or less than 0
 */
export const sanitizeQuality = <T, U>(arg: T, falseReturn: number | U) => {
  let num = number(arg, false);
  if (num === false) {
    return falseReturn;
  }
  if (num > 0 && num <= 1) {
    num *= 100;
  }
  const rounded = Math.round(num);
  if (rounded < 1) {
    return falseReturn;
  }
  return rounded;
};

/**
 * Load a file or URL into a buffer.
 * @param input file path or URL
 */
export const readFileOrUrl = (input: string) => {
  const isLocalFile = !/^https?:\/\//.test(input);
  if (!isLocalFile) {
    return got.default(input, { resolveBodyOnly: true, responseType: 'buffer' });
  }
  return fs.promises.readFile(input);
};

/**
 * Accept a path to a file, URL, or a buffer and return it as a buffer.
 * @param input file path, URL, or Buffer
 */
export const readInput = (input: string | Buffer) => {
  if (!input) {
    throw new Error('Input must be a filepath, URL, or buffer.');
  }
  if (Buffer.isBuffer(input)) {
    return input;
  }
  return readFileOrUrl(input);
};

/**
 * Generate two alpha-numeric 3-character long strings from the MD4 hash of the
 * given input buffer. Strings will _always_ begin with a letter.
 * @param input buffer
 */
export const twoHashIds = (input: Buffer) => {
  const hash = crypto.createHash('md4');
  hash.update(input);
  const base64 = hash.digest().toString('base64');
  const match = base64.match(/([a-zA-Z][a-zA-Z0-9]{2}).*?([a-zA-Z][a-zA-Z0-9]{2})/);
  if (!match) {
    throw new Error(`Unable to find acceptable ID in base64 encoded hash “${base64}”`);
  }
  return [match[1], match[2]];
};
