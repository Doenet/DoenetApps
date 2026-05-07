// @ts-expect-error - no declaration file
import Hash from "ipfs-only-hash";

async function getTextEncoder() {
  if (typeof TextEncoder !== "undefined") {
    return TextEncoder;
  }
  const { TextEncoder: NodeTextEncoder } = await import("util");
  return NodeTextEncoder;
}

export async function getCidV1FromString(text: string): Promise<string> {
  // Convert the string to a Uint8Array using TextEncoder
  const TextEncoderLib = await getTextEncoder();
  const encoder = new TextEncoderLib();
  const bytes = encoder.encode(text);

  return getCidV1FromBytes(bytes);
}

/**
 * Calculates the IPFS CIDv1 for a File object
 */
export async function getCidV1FromFile(file: File): Promise<string> {
  // Convert File to bytes
  const bytes = new Uint8Array(await file.arrayBuffer());

  return getCidV1FromBytes(bytes);
}

export async function getCidV1FromBytes(bytes: Uint8Array): Promise<string> {
  const cid = await Hash.of(bytes, {
    cidVersion: 1,
    rawLeaves: true,
  });

  return cid;
}
