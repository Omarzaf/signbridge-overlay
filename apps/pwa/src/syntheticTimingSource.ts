/**
 * A silent media track, built in the browser.
 *
 * docs/decisions/0004-media-clock-is-authoritative.md forbids synchronising
 * against a JavaScript timer, so demonstrating synchronisation needs a genuine
 * `HTMLMediaElement` to play, pause, and seek. There is no reviewed media in
 * this repository to use, and there must not be — so the shell manufactures the
 * one thing it can manufacture honestly: silence.
 *
 * It is built at runtime rather than generated to disk because a generated
 * audio file is still a media file in the tree, and a repository with a strict
 * "no unreviewed media" rule is better with none at all. Uncompressed silence
 * also costs nothing to construct: it is a 44-byte header and a run of one
 * repeated byte.
 */

export const TIMING_SOURCE_SECONDS = 60;

const SAMPLE_RATE = 8000;
const BITS_PER_SAMPLE = 8;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
/** 8-bit PCM is unsigned, so silence is the midpoint of the range, not zero. */
const SILENCE = 128;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/**
 * A canonical 44-byte RIFF/WAVE header followed by PCM silence. Every browser
 * that can play audio at all can decode this, which matters for the
 * low-resource device profile in docs/accessibility-acceptance.md.
 */
export function createSilentTimingSource(
  seconds: number = TIMING_SOURCE_SECONDS,
): Blob {
  const sampleCount = Math.max(1, Math.floor(seconds * SAMPLE_RATE));
  const dataBytes = sampleCount * BYTES_PER_SAMPLE;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM format chunk length
  view.setUint16(20, 1, true); // PCM, uncompressed
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * BYTES_PER_SAMPLE, true); // byte rate
  view.setUint16(32, BYTES_PER_SAMPLE, true); // block align
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);

  new Uint8Array(buffer, 44).fill(SILENCE);

  return new Blob([buffer], { type: "audio/wav" });
}
