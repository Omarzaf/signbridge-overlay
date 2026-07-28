import type {
  CaptionPackImportErrorCode,
  CaptionPackStore,
  VerifiedLocalCaptionPack,
} from "../../../packages/pack-storage/src/index";

const IMPORT_SUCCESS =
  "Structural validation and local digest passed. This draft is not published and cannot activate signing.";

const IMPORT_MESSAGES: Readonly<
  Record<CaptionPackImportErrorCode, string>
> = Object.freeze({
  empty_file: "The selected file is empty.",
  file_too_large: "The selected file exceeds the local caption-pack limit.",
  read_failed: "The selected file could not be read.",
  invalid_utf8: "The selected file is not valid UTF-8 JSON.",
  invalid_json: "The selected file is not valid JSON.",
  invalid_manifest: "The selected file is not a valid SignPack.",
  unsupported_import_profile:
    "Only synthetic, caption-only draft SignPacks are accepted.",
  storage_unavailable: "Local pack storage is unavailable.",
  storage_failed: "The caption pack could not be stored locally.",
  storage_activation_failed:
    "The caption pack was stored and verified, but it will not reopen automatically.",
  pack_id_conflict:
    "A different local caption pack already uses this identifier.",
  integrity_mismatch: "The stored caption pack failed local integrity checks.",
  not_found: "No verified local caption pack was found.",
});

export interface CaptionPackImportBinding {
  readonly dispose: () => void;
}

export interface CaptionPackImportOptions {
  readonly input: HTMLInputElement;
  readonly status: HTMLElement;
  readonly store: CaptionPackStore;
  readonly onVerified: (
    pack: VerifiedLocalCaptionPack,
  ) => boolean | Promise<boolean>;
}

export function captionPackImportMessage(
  code: CaptionPackImportErrorCode,
): string {
  return IMPORT_MESSAGES[code];
}

export async function importCaptionPack(
  blob: Blob,
  store: CaptionPackStore,
  onVerified: (
    pack: VerifiedLocalCaptionPack,
  ) => boolean | Promise<boolean>,
): Promise<string> {
  const result = await store.importBlob(blob);
  if (!result.ok) {
    return captionPackImportMessage(result.code);
  }
  const mounted = await onVerified(result.value);
  return mounted
    ? IMPORT_SUCCESS
    : "The verified pack is outside this caption-only playback boundary.";
}

export function bindCaptionPackImport({
  input,
  status,
  store,
  onVerified,
}: CaptionPackImportOptions): CaptionPackImportBinding {
  let disposed = false;

  const handleChange = async (): Promise<void> => {
    const file = input.files?.[0];
    if (file === undefined) {
      return;
    }

    input.disabled = true;
    status.textContent = "Checking the local caption pack…";
    const message = await importCaptionPack(file, store, onVerified);
    if (disposed) {
      return;
    }
    status.textContent = message;
    input.value = "";
    input.disabled = false;
  };

  input.addEventListener("change", handleChange);
  return Object.freeze({
    dispose: (): void => {
      disposed = true;
      input.removeEventListener("change", handleChange);
    },
  });
}
