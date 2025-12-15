// CREDIT: https://developer.mozilla.org/en-US/docs/Glossary/Base64
//
// Additional resources:
// https://gist.github.com/enepomnyaschih/72c423f727d395eeaa09697058238727
// https://gist.github.com/jordanbtucker/5a89c1d99099408c7c265a7462f60e1a

export function handleText(input: string | ArrayBuffer | ArrayBufferView) {
	if (typeof input === "string") {
		return new TextEncoder().encode(input);
	} else {
		return input;
	}
}

export function decode(base64: string) {
	const binString = atob(base64);
	return Uint8Array.from(binString, (m) => m.codePointAt(0)!);
}

export function encode(input: string | ArrayBuffer | ArrayBufferView) {
	const bytes = handleText(input);
	const iterable =
		bytes instanceof ArrayBuffer
			? new Uint8Array(bytes)
			: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const binString = Array.from(iterable, (x) => String.fromCodePoint(x)).join("");
	return btoa(binString);
}

export function encodeB64U(input: string | ArrayBuffer | ArrayBufferView) {
	return encode(input).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function decodeB64U(string: string) {
	return decode(string.replaceAll("-", "+").replaceAll("_", "/"));
}
