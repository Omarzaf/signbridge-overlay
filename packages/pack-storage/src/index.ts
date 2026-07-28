import {
  validateSignPack,
  type SignPack,
} from "../../signpack-schema/src/index";

export const MAX_CAPTION_PACK_BYTES = 262_144;

const DATABASE_NAME = "signbridge-packs";
const DATABASE_VERSION = 2;
const OBJECT_STORE_NAME = "captionPacks";
const STATE_STORE_NAME = "captionPackState";
const ACTIVE_PACK_KEY = "activePackId";

export type CaptionPackImportErrorCode =
  | "empty_file"
  | "file_too_large"
  | "read_failed"
  | "invalid_utf8"
  | "invalid_json"
  | "invalid_manifest"
  | "unsupported_import_profile"
  | "storage_unavailable"
  | "storage_failed"
  | "pack_id_conflict"
  | "integrity_mismatch"
  | "not_found";

export interface VerifiedLocalCaptionPack {
  readonly assurance: "local_storage_integrity_only";
  readonly packId: string;
  readonly manifestSha256: string;
  readonly manifest: SignPack;
}

export type CaptionPackResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: CaptionPackImportErrorCode };

export interface StoredCaptionPackRecord {
  readonly packId: string;
  readonly manifestSha256: string;
  readonly manifestBytes: ArrayBuffer;
}

export type CaptionPackWriteResult =
  | "stored"
  | "identical"
  | "conflict";

export interface CaptionPackPersistence {
  readonly storeIfAbsent: (
    record: StoredCaptionPackRecord,
  ) => Promise<CaptionPackWriteResult>;
  readonly get: (
    packId: string,
  ) => Promise<StoredCaptionPackRecord | undefined>;
  readonly setActivePackId: (packId: string) => Promise<void>;
  readonly getActivePackId: () => Promise<string | undefined>;
  readonly close: () => void;
}

export interface CaptionPackStore {
  readonly importBlob: (
    blob: Blob,
  ) => Promise<CaptionPackResult<VerifiedLocalCaptionPack>>;
  readonly getVerified: (
    packId: string,
  ) => Promise<CaptionPackResult<VerifiedLocalCaptionPack>>;
  readonly getActiveVerified: () => Promise<
    CaptionPackResult<VerifiedLocalCaptionPack>
  >;
  readonly close: () => void;
}

export interface CaptionPackStoreOptions {
  readonly persistence: CaptionPackPersistence;
  readonly cryptoProvider?: Crypto;
}

export interface IndexedDbCaptionPackStoreOptions {
  readonly databaseName?: string;
  readonly indexedDb?: IDBFactory;
  readonly cryptoProvider?: Crypto;
}

type ParsedCaptionPackResult =
  | {
      readonly ok: true;
      readonly manifest: SignPack;
      readonly manifestBytes: ArrayBuffer;
      readonly manifestSha256: string;
    }
  | {
      readonly ok: false;
      readonly code: CaptionPackImportErrorCode;
    };

class PersistenceFailure extends Error {
  readonly code: "storage_unavailable" | "storage_failed";

  constructor(code: "storage_unavailable" | "storage_failed") {
    super(code);
    this.code = code;
  }
}

function success<T>(value: T): CaptionPackResult<T> {
  return Object.freeze({ ok: true, value });
}

function failure<T>(
  code: CaptionPackImportErrorCode,
): CaptionPackResult<T> {
  return Object.freeze({ ok: false, code });
}

function freezeJson<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    freezeJson(child);
  }
  return Object.freeze(value);
}

function isCaptionOnlySyntheticDraft(manifest: SignPack): boolean {
  return (
    manifest.releaseStatus === "draft" &&
    manifest.developmentOnly === true &&
    manifest.linguisticReviewStatus === "not_reviewed" &&
    manifest.language.signedLanguage === "zxx" &&
    manifest.language.region === "ZZ" &&
    manifest.assets.length === 0 &&
    manifest.segments.every(
      (segment) =>
        segment.translationStatus === "unsupported" &&
        segment.reviewStatus === "pending" &&
        segment.assetIds.length === 0,
    )
  );
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function digestBytes(
  bytes: ArrayBuffer,
  cryptoProvider: Crypto,
): Promise<string> {
  const digest = await cryptoProvider.subtle.digest("SHA-256", bytes);
  return `sha256:${bytesToHex(digest)}`;
}

async function parseCaptionPackBytes(
  bytes: ArrayBuffer,
  cryptoProvider: Crypto,
): Promise<ParsedCaptionPackResult> {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, code: "invalid_utf8" };
  }

  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    return { ok: false, code: "invalid_json" };
  }

  const validation = validateSignPack(input);
  if (!validation.ok) {
    return { ok: false, code: "invalid_manifest" };
  }
  if (!isCaptionOnlySyntheticDraft(validation.value)) {
    return { ok: false, code: "unsupported_import_profile" };
  }

  let manifestSha256: string;
  try {
    manifestSha256 = await digestBytes(bytes, cryptoProvider);
  } catch {
    return { ok: false, code: "storage_unavailable" };
  }

  const manifest = freezeJson(
    structuredClone(validation.value),
  ) as SignPack;
  return {
    ok: true,
    manifest,
    manifestBytes: bytes.slice(0),
    manifestSha256,
  };
}

function mapPersistenceError(
  error: unknown,
): "storage_unavailable" | "storage_failed" {
  return error instanceof PersistenceFailure ? error.code : "storage_failed";
}

export function createCaptionPackStore({
  persistence,
  cryptoProvider = globalThis.crypto,
}: CaptionPackStoreOptions): CaptionPackStore {
  const getVerified = async (
    packId: string,
  ): Promise<CaptionPackResult<VerifiedLocalCaptionPack>> => {
    let record: StoredCaptionPackRecord | undefined;
    try {
      record = await persistence.get(packId);
    } catch (error) {
      return failure(mapPersistenceError(error));
    }
    if (record === undefined) {
      return failure("not_found");
    }
    if (record.packId !== packId) {
      return failure("integrity_mismatch");
    }

    let actualDigest: string;
    try {
      actualDigest = await digestBytes(
        record.manifestBytes,
        cryptoProvider,
      );
    } catch {
      return failure("storage_unavailable");
    }
    if (actualDigest !== record.manifestSha256) {
      return failure("integrity_mismatch");
    }

    const parsed = await parseCaptionPackBytes(
      record.manifestBytes,
      cryptoProvider,
    );
    if (!parsed.ok) {
      return failure(
        parsed.code === "storage_unavailable"
          ? parsed.code
          : "integrity_mismatch",
      );
    }
    if (parsed.manifest.packId !== packId) {
      return failure("integrity_mismatch");
    }

    return success(
      Object.freeze({
        assurance: "local_storage_integrity_only",
        packId,
        manifestSha256: actualDigest,
        manifest: parsed.manifest,
      }),
    );
  };

  const importBlob = async (
    blob: Blob,
  ): Promise<CaptionPackResult<VerifiedLocalCaptionPack>> => {
    let size: number;
    try {
      size = blob.size;
    } catch {
      return failure("read_failed");
    }
    if (size === 0) {
      return failure("empty_file");
    }
    if (!Number.isSafeInteger(size) || size > MAX_CAPTION_PACK_BYTES) {
      return failure("file_too_large");
    }

    let bytes: ArrayBuffer;
    try {
      bytes = await blob.arrayBuffer();
    } catch {
      return failure("read_failed");
    }
    if (bytes.byteLength === 0) {
      return failure("empty_file");
    }
    if (bytes.byteLength > MAX_CAPTION_PACK_BYTES) {
      return failure("file_too_large");
    }

    const parsed = await parseCaptionPackBytes(bytes, cryptoProvider);
    if (!parsed.ok) {
      return failure(parsed.code);
    }

    let writeResult: CaptionPackWriteResult;
    try {
      writeResult = await persistence.storeIfAbsent({
        packId: parsed.manifest.packId,
        manifestSha256: parsed.manifestSha256,
        manifestBytes: parsed.manifestBytes.slice(0),
      });
    } catch (error) {
      return failure(mapPersistenceError(error));
    }
    if (writeResult === "conflict") {
      return failure("pack_id_conflict");
    }

    const verified = await getVerified(parsed.manifest.packId);
    if (!verified.ok) {
      return verified;
    }
    try {
      await persistence.setActivePackId(parsed.manifest.packId);
    } catch (error) {
      return failure(mapPersistenceError(error));
    }
    return verified;
  };

  const getActiveVerified = async (): Promise<
    CaptionPackResult<VerifiedLocalCaptionPack>
  > => {
    let packId: string | undefined;
    try {
      packId = await persistence.getActivePackId();
    } catch (error) {
      return failure(mapPersistenceError(error));
    }
    return packId === undefined ? failure("not_found") : getVerified(packId);
  };

  return Object.freeze({
    importBlob,
    getVerified,
    getActiveVerified,
    close: (): void => {
      try {
        persistence.close();
      } catch {
        // Closing is best-effort and cannot expose private storage errors.
      }
    },
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = (): void => {
      resolve(request.result);
    };
    request.onerror = (): void => {
      reject(new PersistenceFailure("storage_failed"));
    };
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = (): void => {
      resolve();
    };
    transaction.onerror = (): void => {
      reject(new PersistenceFailure("storage_failed"));
    };
    transaction.onabort = (): void => {
      reject(new PersistenceFailure("storage_failed"));
    };
  });
}

function createIndexedDbPersistence(
  indexedDb: IDBFactory,
  databaseName: string,
): CaptionPackPersistence {
  let closed = false;
  const databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(databaseName, DATABASE_VERSION);
    request.onupgradeneeded = (): void => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
        database.createObjectStore(OBJECT_STORE_NAME, {
          keyPath: "packId",
        });
      }
      if (!database.objectStoreNames.contains(STATE_STORE_NAME)) {
        database.createObjectStore(STATE_STORE_NAME, {
          keyPath: "key",
        });
      }
    };
    request.onsuccess = (): void => {
      const database = request.result;
      database.onversionchange = (): void => {
        database.close();
      };
      if (closed) {
        database.close();
        reject(new PersistenceFailure("storage_unavailable"));
        return;
      }
      resolve(database);
    };
    request.onerror = (): void => {
      reject(new PersistenceFailure("storage_unavailable"));
    };
    request.onblocked = (): void => {
      reject(new PersistenceFailure("storage_unavailable"));
    };
  });

  return {
    storeIfAbsent: async (
      record,
    ): Promise<CaptionPackWriteResult> => {
      const database = await databasePromise;
      const transaction = database.transaction(
        OBJECT_STORE_NAME,
        "readwrite",
      );
      const store = transaction.objectStore(OBJECT_STORE_NAME);
      const existing = (await requestResult(
        store.get(record.packId),
      )) as StoredCaptionPackRecord | undefined;
      if (existing !== undefined) {
        await transactionComplete(transaction);
        return existing.manifestSha256 === record.manifestSha256
          ? "identical"
          : "conflict";
      }
      await requestResult(store.add(record));
      await transactionComplete(transaction);
      return "stored";
    },
    get: async (
      packId,
    ): Promise<StoredCaptionPackRecord | undefined> => {
      const database = await databasePromise;
      const transaction = database.transaction(
        OBJECT_STORE_NAME,
        "readonly",
      );
      const record = (await requestResult(
        transaction.objectStore(OBJECT_STORE_NAME).get(packId),
      )) as StoredCaptionPackRecord | undefined;
      await transactionComplete(transaction);
      if (record === undefined) {
        return undefined;
      }
      return {
        packId: record.packId,
        manifestSha256: record.manifestSha256,
        manifestBytes: record.manifestBytes.slice(0),
      };
    },
    setActivePackId: async (packId): Promise<void> => {
      const database = await databasePromise;
      const transaction = database.transaction(
        STATE_STORE_NAME,
        "readwrite",
      );
      await requestResult(
        transaction.objectStore(STATE_STORE_NAME).put({
          key: ACTIVE_PACK_KEY,
          packId,
        }),
      );
      await transactionComplete(transaction);
    },
    getActivePackId: async (): Promise<string | undefined> => {
      const database = await databasePromise;
      const transaction = database.transaction(
        STATE_STORE_NAME,
        "readonly",
      );
      const record = (await requestResult(
        transaction.objectStore(STATE_STORE_NAME).get(ACTIVE_PACK_KEY),
      )) as { readonly key: string; readonly packId: unknown } | undefined;
      await transactionComplete(transaction);
      return typeof record?.packId === "string"
        ? record.packId
        : undefined;
    },
    close: (): void => {
      closed = true;
      void databasePromise.then(
        (database) => {
          database.close();
        },
        () => {},
      );
    },
  };
}

export function createIndexedDbCaptionPackStore(
  options: IndexedDbCaptionPackStoreOptions = {},
): CaptionPackStore {
  const indexedDb = options.indexedDb ?? globalThis.indexedDB;
  if (indexedDb === undefined) {
    const unavailablePersistence: CaptionPackPersistence = {
      storeIfAbsent: async () => {
        throw new PersistenceFailure("storage_unavailable");
      },
      get: async () => {
        throw new PersistenceFailure("storage_unavailable");
      },
      setActivePackId: async () => {
        throw new PersistenceFailure("storage_unavailable");
      },
      getActivePackId: async () => {
        throw new PersistenceFailure("storage_unavailable");
      },
      close: (): void => {},
    };
    return createCaptionPackStore({
      persistence: unavailablePersistence,
      ...(options.cryptoProvider === undefined
        ? {}
        : { cryptoProvider: options.cryptoProvider }),
    });
  }

  return createCaptionPackStore({
    persistence: createIndexedDbPersistence(
      indexedDb,
      options.databaseName ?? DATABASE_NAME,
    ),
    ...(options.cryptoProvider === undefined
      ? {}
      : { cryptoProvider: options.cryptoProvider }),
  });
}
