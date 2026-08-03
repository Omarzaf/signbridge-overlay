(function() {
	//#region packages/signpack-schema/src/types.ts
	var SCHEMA_VERSION = "1.0.0";
	/**
	* Exact three-part semantic version without prerelease or build metadata.
	* Leading zeroes are rejected so each identifier has one canonical spelling.
	*/
	var SEMVER_PATTERN = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/u;
	//#endregion
	//#region packages/signpack-schema/src/validator.ts
	var HASH_PATTERN = /^sha256:[0-9a-f]{64}$/u;
	var ISO_639_3_PATTERN = /^[a-z]{3}$/u;
	var REGION_PATTERN = /^[A-Z]{2}$/u;
	var BCP_47_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u;
	var REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/u;
	var RFC_3339_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
	var ID_PATTERNS = {
		pack: /^spk_[a-z0-9]{12,64}$/u,
		segment: /^seg_[a-z0-9]{12,64}$/u,
		asset: /^ast_[a-z0-9]{12,64}$/u,
		event: /^rev_[a-z0-9]{12,64}$/u,
		proposal: /^proposal_[a-z0-9]{12,64}$/u,
		run: /^run_[a-z0-9]{12,64}$/u,
		ledger: /^ledger_[a-z0-9]{12,64}$/u,
		evidenceLedger: /^evidence_[a-z0-9]{12,64}$/u,
		evidence: /^evd_[a-z0-9]{12,64}$/u,
		signer: /^signer_[a-z0-9]{12,64}$/u,
		reviewer: /^reviewer_[a-z0-9]{12,64}$/u,
		publisher: /^publisher_[a-z0-9]{12,64}$/u,
		service: /^service_[a-z0-9]{12,64}$/u,
		owner: /^owner_[a-z0-9]{12,64}$/u,
		source: /^source_[a-z0-9]{12,64}$/u,
		consent: /^consent_[a-z0-9]{12,64}$/u,
		rights: /^rights_[a-z0-9]{12,64}$/u,
		entrant: /^entrant_[a-z0-9]{12,64}$/u,
		releaseRequest: /^relreq_[a-z0-9]{12,64}$/u
	};
	var Collector = class {
		issues = [];
		add(path, code, message) {
			this.issues.push({
				path,
				code,
				message
			});
		}
	};
	function isPlainObject(value) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
		const prototype = Object.getPrototypeOf(value);
		return prototype === Object.prototype || prototype === null;
	}
	function objectAt(value, path, allowedKeys, requiredKeys, collector) {
		if (!isPlainObject(value)) {
			collector.add(path, "type", "must be an object");
			return;
		}
		const allowed = new Set(allowedKeys);
		for (const key of Object.keys(value)) if (!allowed.has(key)) collector.add(`${path}.${key}`, "unknown_property", "is not allowed");
		for (const key of requiredKeys) if (!(key in value)) collector.add(`${path}.${key}`, "required", "is required");
		return value;
	}
	function stringAt(object, key, path, collector, options = {}) {
		const value = object[key];
		if (typeof value !== "string") {
			collector.add(`${path}.${key}`, "type", "must be a string");
			return;
		}
		if (options.minLength !== void 0 && value.length < options.minLength) collector.add(`${path}.${key}`, "min_length", `must contain at least ${options.minLength} character(s)`);
		if (options.maxLength !== void 0 && value.length > options.maxLength) collector.add(`${path}.${key}`, "max_length", `must contain at most ${options.maxLength} character(s)`);
		if (options.pattern !== void 0 && !options.pattern.test(value)) collector.add(`${path}.${key}`, "format", "has an invalid format");
		if (options.enumValues !== void 0 && !options.enumValues.includes(value)) collector.add(`${path}.${key}`, "enum", `must be one of: ${options.enumValues.join(", ")}`);
		return value;
	}
	function optionalStringAt(object, key, path, collector, options = {}) {
		if (!(key in object)) return;
		return stringAt(object, key, path, collector, options);
	}
	function booleanAt(object, key, path, collector) {
		const value = object[key];
		if (typeof value !== "boolean") {
			collector.add(`${path}.${key}`, "type", "must be a boolean");
			return;
		}
		return value;
	}
	function integerAt(object, key, path, collector, minimum) {
		const value = object[key];
		if (typeof value !== "number" || !Number.isInteger(value)) {
			collector.add(`${path}.${key}`, "type", "must be an integer");
			return;
		}
		if (!Number.isSafeInteger(value)) {
			collector.add(`${path}.${key}`, "safe_integer", "must be a JavaScript safe integer");
			return;
		}
		const integer = value;
		if (integer < minimum) collector.add(`${path}.${key}`, "minimum", `must be at least ${minimum}`);
		return integer;
	}
	function arrayAt(object, key, path, collector, minimumLength = 0) {
		const value = object[key];
		if (!Array.isArray(value)) {
			collector.add(`${path}.${key}`, "type", "must be an array");
			return;
		}
		if (value.length < minimumLength) collector.add(`${path}.${key}`, "min_items", `must contain at least ${minimumLength} item(s)`);
		return value;
	}
	function dateTimeAt(object, key, path, collector) {
		const value = stringAt(object, key, path, collector);
		if (value !== void 0 && parseCanonicalUtcTimestamp(value) === void 0) collector.add(`${path}.${key}`, "date_time", "must be a valid RFC 3339 UTC timestamp");
		return value;
	}
	function parseCanonicalUtcTimestamp(value) {
		if (!RFC_3339_UTC_PATTERN.test(value)) return;
		const timestamp = Date.parse(value);
		if (Number.isNaN(timestamp)) return;
		return new Date(timestamp).toISOString() === (value.includes(".") ? value : value.replace(/Z$/u, ".000Z")) ? timestamp : void 0;
	}
	function uniqueStringArray(values, path, collector, pattern) {
		const result = [];
		const seen = /* @__PURE__ */ new Set();
		values.forEach((value, index) => {
			const itemPath = `${path}[${index}]`;
			if (typeof value !== "string") {
				collector.add(itemPath, "type", "must be a string");
				return;
			}
			if (!pattern.test(value)) collector.add(itemPath, "format", "has an invalid identifier format");
			if (seen.has(value)) collector.add(itemPath, "duplicate", "must be unique");
			seen.add(value);
			result.push(value);
		});
		return result;
	}
	function checkHash(value, path, collector) {
		if (value !== void 0 && !HASH_PATTERN.test(value)) collector.add(path, "hash_format", "must be sha256 followed by exactly 64 lowercase hexadecimal characters");
	}
	function checkRelativeAssetPath(value, path, collector) {
		if (value === void 0) return;
		const validCharacters = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(value);
		const safeParts = value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
		const hasScheme = /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(value);
		if (!value.startsWith("assets/") || value.length > 512 || !validCharacters || !safeParts || hasScheme || value.includes("\\")) collector.add(path, "relative_asset_path", "must be a normalized relative path below assets/");
	}
	function finish(input, collector) {
		if (collector.issues.length > 0) return {
			ok: false,
			issues: collector.issues
		};
		return {
			ok: true,
			value: input
		};
	}
	function validateCaptionFallback(value, path, collector) {
		const object = objectAt(value, path, ["language", "text"], ["language", "text"], collector);
		if (object === void 0) return;
		stringAt(object, "language", path, collector, { pattern: BCP_47_PATTERN });
		stringAt(object, "text", path, collector, {
			minLength: 1,
			maxLength: 1e3
		});
	}
	function validatePublication(value, path, collector) {
		const object = objectAt(value, path, [
			"releaseId",
			"releasedAt",
			"publisherId",
			"assetLedgerHash",
			"reviewLogHash",
			"humanApprovalEventIds"
		], [
			"releaseId",
			"releasedAt",
			"publisherId",
			"assetLedgerHash",
			"reviewLogHash",
			"humanApprovalEventIds"
		], collector);
		if (object === void 0) return;
		checkHash(stringAt(object, "releaseId", path, collector), `${path}.releaseId`, collector);
		dateTimeAt(object, "releasedAt", path, collector);
		stringAt(object, "publisherId", path, collector, { pattern: ID_PATTERNS.publisher });
		checkHash(stringAt(object, "assetLedgerHash", path, collector), `${path}.assetLedgerHash`, collector);
		checkHash(stringAt(object, "reviewLogHash", path, collector), `${path}.reviewLogHash`, collector);
		const eventIds = arrayAt(object, "humanApprovalEventIds", path, collector, 1);
		if (eventIds !== void 0) uniqueStringArray(eventIds, `${path}.humanApprovalEventIds`, collector, ID_PATTERNS.event);
	}
	function validateSignPack(input) {
		const collector = new Collector();
		const root = objectAt(input, "$", [
			"schemaVersion",
			"packId",
			"releaseStatus",
			"developmentOnly",
			"linguisticReviewStatus",
			"language",
			"sourceVideo",
			"runtimeCompatibility",
			"participants",
			"segments",
			"assets",
			"publication"
		], [
			"schemaVersion",
			"packId",
			"releaseStatus",
			"developmentOnly",
			"linguisticReviewStatus",
			"language",
			"sourceVideo",
			"runtimeCompatibility",
			"participants",
			"segments",
			"assets"
		], collector);
		if (root === void 0) return finish(input, collector);
		const schemaVersion = stringAt(root, "schemaVersion", "$", collector);
		if (schemaVersion !== void 0 && schemaVersion !== "1.0.0") collector.add("$.schemaVersion", "schema_version", `must equal ${SCHEMA_VERSION}`);
		stringAt(root, "packId", "$", collector, { pattern: ID_PATTERNS.pack });
		const releaseStatus = stringAt(root, "releaseStatus", "$", collector, { enumValues: ["draft", "published"] });
		const developmentOnly = booleanAt(root, "developmentOnly", "$", collector);
		const linguisticReviewStatus = stringAt(root, "linguisticReviewStatus", "$", collector, { enumValues: ["not_reviewed", "human_reviewed"] });
		const language = objectAt(root["language"], "$.language", [
			"signedLanguage",
			"region",
			"dialect",
			"audience",
			"educationalContext"
		], [
			"signedLanguage",
			"region",
			"dialect",
			"audience",
			"educationalContext"
		], collector);
		let languageSigned;
		let languageRegion;
		if (language !== void 0) {
			languageSigned = stringAt(language, "signedLanguage", "$.language", collector, { pattern: ISO_639_3_PATTERN });
			languageRegion = stringAt(language, "region", "$.language", collector, { pattern: REGION_PATTERN });
			stringAt(language, "dialect", "$.language", collector, {
				minLength: 1,
				maxLength: 120
			});
			stringAt(language, "audience", "$.language", collector, {
				minLength: 1,
				maxLength: 160
			});
			stringAt(language, "educationalContext", "$.language", collector, {
				minLength: 1,
				maxLength: 240
			});
		}
		const sourceVideo = objectAt(root["sourceVideo"], "$.sourceVideo", ["fingerprint", "durationMs"], ["fingerprint", "durationMs"], collector);
		let videoDuration;
		if (sourceVideo !== void 0) {
			checkHash(stringAt(sourceVideo, "fingerprint", "$.sourceVideo", collector), "$.sourceVideo.fingerprint", collector);
			videoDuration = integerAt(sourceVideo, "durationMs", "$.sourceVideo", collector, 1);
		}
		const runtime = objectAt(root["runtimeCompatibility"], "$.runtimeCompatibility", ["minimumVersion"], ["minimumVersion"], collector);
		if (runtime !== void 0) stringAt(runtime, "minimumVersion", "$.runtimeCompatibility", collector, { pattern: SEMVER_PATTERN });
		const participants = objectAt(root["participants"], "$.participants", ["signerRefs", "reviewerRefs"], ["signerRefs", "reviewerRefs"], collector);
		let signerRefs = [];
		let reviewerRefs = [];
		if (participants !== void 0) {
			const signers = arrayAt(participants, "signerRefs", "$.participants", collector);
			if (signers !== void 0) signerRefs = uniqueStringArray(signers, "$.participants.signerRefs", collector, ID_PATTERNS.signer);
			const reviewers = arrayAt(participants, "reviewerRefs", "$.participants", collector);
			if (reviewers !== void 0) reviewerRefs = uniqueStringArray(reviewers, "$.participants.reviewerRefs", collector, ID_PATTERNS.reviewer);
		}
		const segments = arrayAt(root, "segments", "$", collector, 1);
		const segmentIds = /* @__PURE__ */ new Set();
		const referencedAssetIds = /* @__PURE__ */ new Set();
		let previousEnd = 0;
		segments?.forEach((value, index) => {
			const path = `$.segments[${index}]`;
			const segment = objectAt(value, path, [
				"segmentId",
				"startMs",
				"endMs",
				"translationStatus",
				"reviewStatus",
				"decisionHash",
				"captionFallback",
				"assetIds",
				"unsupportedReason",
				"proposalId"
			], [
				"segmentId",
				"startMs",
				"endMs",
				"translationStatus",
				"reviewStatus",
				"decisionHash",
				"captionFallback",
				"assetIds"
			], collector);
			if (segment === void 0) return;
			const segmentId = stringAt(segment, "segmentId", path, collector, { pattern: ID_PATTERNS.segment });
			if (segmentId !== void 0) {
				if (segmentIds.has(segmentId)) collector.add(`${path}.segmentId`, "duplicate", "must be unique");
				segmentIds.add(segmentId);
			}
			const startMs = integerAt(segment, "startMs", path, collector, 0);
			const endMs = integerAt(segment, "endMs", path, collector, 1);
			if (startMs !== void 0 && endMs !== void 0) {
				if (endMs <= startMs) collector.add(`${path}.endMs`, "time_order", "must be greater than startMs");
				if (startMs < previousEnd) collector.add(`${path}.startMs`, "non_monotonic", "must not overlap or precede the prior segment");
				if (videoDuration !== void 0 && endMs > videoDuration) collector.add(`${path}.endMs`, "video_bounds", "must not exceed sourceVideo.durationMs");
				previousEnd = Math.max(previousEnd, endMs);
			}
			const translationStatus = stringAt(segment, "translationStatus", path, collector, { enumValues: [
				"proposed",
				"mapped",
				"unsupported"
			] });
			const reviewStatus = stringAt(segment, "reviewStatus", path, collector, { enumValues: [
				"pending",
				"approved",
				"changes_requested",
				"rejected"
			] });
			checkHash(stringAt(segment, "decisionHash", path, collector), `${path}.decisionHash`, collector);
			validateCaptionFallback(segment["captionFallback"], `${path}.captionFallback`, collector);
			const assetValues = arrayAt(segment, "assetIds", path, collector);
			let assetIds = [];
			if (assetValues !== void 0) {
				assetIds = uniqueStringArray(assetValues, `${path}.assetIds`, collector, ID_PATTERNS.asset);
				assetIds.forEach((assetId) => referencedAssetIds.add(assetId));
			}
			const unsupportedReason = optionalStringAt(segment, "unsupportedReason", path, collector, { pattern: REASON_CODE_PATTERN });
			optionalStringAt(segment, "proposalId", path, collector, { pattern: ID_PATTERNS.proposal });
			if (translationStatus === "mapped") {
				if (assetIds.length === 0) collector.add(`${path}.assetIds`, "mapped_assets", "mapped segments require at least one asset");
				if (unsupportedReason !== void 0) collector.add(`${path}.unsupportedReason`, "state_conflict", "mapped segments cannot declare an unsupported reason");
			}
			if (translationStatus === "unsupported") {
				if (assetIds.length > 0) collector.add(`${path}.assetIds`, "state_conflict", "unsupported segments cannot reference signing assets");
				if (unsupportedReason === void 0) collector.add(`${path}.unsupportedReason`, "required", "unsupported segments require an explicit reason code");
			}
			if (translationStatus === "proposed" && reviewStatus !== "pending") collector.add(`${path}.reviewStatus`, "authority", "proposed translations must remain pending");
		});
		const assets = arrayAt(root, "assets", "$", collector);
		const assetIds = /* @__PURE__ */ new Set();
		const assetPaths = /* @__PURE__ */ new Set();
		assets?.forEach((value, index) => {
			const path = `$.assets[${index}]`;
			const asset = objectAt(value, path, [
				"assetId",
				"path",
				"sha256",
				"mediaType",
				"durationMs"
			], [
				"assetId",
				"path",
				"sha256",
				"mediaType",
				"durationMs"
			], collector);
			if (asset === void 0) return;
			const assetId = stringAt(asset, "assetId", path, collector, { pattern: ID_PATTERNS.asset });
			if (assetId !== void 0) {
				if (assetIds.has(assetId)) collector.add(`${path}.assetId`, "duplicate", "must be unique");
				assetIds.add(assetId);
			}
			const assetPath = stringAt(asset, "path", path, collector);
			checkRelativeAssetPath(assetPath, `${path}.path`, collector);
			if (assetPath !== void 0) {
				if (assetPaths.has(assetPath)) collector.add(`${path}.path`, "duplicate", "must be unique");
				assetPaths.add(assetPath);
			}
			checkHash(stringAt(asset, "sha256", path, collector), `${path}.sha256`, collector);
			stringAt(asset, "mediaType", path, collector, { enumValues: ["video/mp4", "video/webm"] });
			integerAt(asset, "durationMs", path, collector, 1);
		});
		for (const assetId of referencedAssetIds) if (!assetIds.has(assetId)) collector.add("$.segments", "unknown_asset", `references undeclared asset ${assetId}`);
		if ("publication" in root) validatePublication(root["publication"], "$.publication", collector);
		if (releaseStatus === "draft" && "publication" in root) collector.add("$.publication", "draft_publication", "draft packs cannot carry publication metadata");
		if (releaseStatus === "published") {
			if (!("publication" in root)) collector.add("$.publication", "required", "published packs require publication metadata");
			if (developmentOnly !== false) collector.add("$.developmentOnly", "publication_gate", "published packs cannot be development-only");
			if (linguisticReviewStatus !== "human_reviewed") collector.add("$.linguisticReviewStatus", "publication_gate", "published packs require human linguistic review");
			if (languageSigned === "zxx" || languageRegion === "ZZ") collector.add("$.language", "publication_gate", "synthetic language and region sentinels cannot be published");
			if (reviewerRefs.length === 0) collector.add("$.participants.reviewerRefs", "publication_gate", "published packs require a consent-safe reviewer reference");
			if (assetIds.size > 0 && signerRefs.length === 0) collector.add("$.participants.signerRefs", "publication_gate", "packs with signing media require a consent-safe signer reference");
			segments?.forEach((value, index) => {
				if (!isPlainObject(value)) return;
				if (value["reviewStatus"] !== "approved") collector.add(`$.segments[${index}].reviewStatus`, "publication_gate", "every released segment requires human approval");
				if (value["translationStatus"] === "proposed") collector.add(`$.segments[${index}].translationStatus`, "publication_gate", "proposals cannot be published");
			});
		}
		return finish(input, collector);
	}
	var DATABASE_NAME = "signbridge-packs";
	var DATABASE_VERSION = 2;
	var OBJECT_STORE_NAME = "captionPacks";
	var STATE_STORE_NAME = "captionPackState";
	var ACTIVE_PACK_KEY = "activePackId";
	var PersistenceFailure = class extends Error {
		code;
		constructor(code) {
			super(code);
			this.code = code;
		}
	};
	function success(value) {
		return Object.freeze({
			ok: true,
			value
		});
	}
	function failure(code) {
		return Object.freeze({
			ok: false,
			code
		});
	}
	function freezeJson(value) {
		if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
		for (const child of Object.values(value)) freezeJson(child);
		return Object.freeze(value);
	}
	function isCaptionOnlySyntheticDraft(manifest) {
		return manifest.releaseStatus === "draft" && manifest.developmentOnly === true && manifest.linguisticReviewStatus === "not_reviewed" && manifest.language.signedLanguage === "zxx" && manifest.language.region === "ZZ" && manifest.assets.length === 0 && manifest.segments.every((segment) => segment.translationStatus === "unsupported" && segment.reviewStatus === "pending" && segment.assetIds.length === 0);
	}
	function bytesToHex(bytes) {
		return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	async function digestBytes(bytes, cryptoProvider) {
		return `sha256:${bytesToHex(await cryptoProvider.subtle.digest("SHA-256", bytes))}`;
	}
	async function parseCaptionPackBytes(bytes, cryptoProvider) {
		let text;
		try {
			text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
		} catch {
			return {
				ok: false,
				code: "invalid_utf8"
			};
		}
		let input;
		try {
			input = JSON.parse(text);
		} catch {
			return {
				ok: false,
				code: "invalid_json"
			};
		}
		const validation = validateSignPack(input);
		if (!validation.ok) return {
			ok: false,
			code: "invalid_manifest"
		};
		if (!isCaptionOnlySyntheticDraft(validation.value)) return {
			ok: false,
			code: "unsupported_import_profile"
		};
		let manifestSha256;
		try {
			manifestSha256 = await digestBytes(bytes, cryptoProvider);
		} catch {
			return {
				ok: false,
				code: "storage_unavailable"
			};
		}
		return {
			ok: true,
			manifest: freezeJson(structuredClone(validation.value)),
			manifestBytes: bytes.slice(0),
			manifestSha256
		};
	}
	function mapPersistenceError(error) {
		return error instanceof PersistenceFailure ? error.code : "storage_failed";
	}
	function createCaptionPackStore({ persistence, cryptoProvider = globalThis.crypto }) {
		const getVerified = async (packId) => {
			let record;
			try {
				record = await persistence.get(packId);
			} catch (error) {
				return failure(mapPersistenceError(error));
			}
			if (record === void 0) return failure("not_found");
			if (record.packId !== packId) return failure("integrity_mismatch");
			let actualDigest;
			try {
				actualDigest = await digestBytes(record.manifestBytes, cryptoProvider);
			} catch {
				return failure("storage_unavailable");
			}
			if (actualDigest !== record.manifestSha256) return failure("integrity_mismatch");
			const parsed = await parseCaptionPackBytes(record.manifestBytes, cryptoProvider);
			if (!parsed.ok) return failure(parsed.code === "storage_unavailable" ? parsed.code : "integrity_mismatch");
			if (parsed.manifest.packId !== packId) return failure("integrity_mismatch");
			return success(Object.freeze({
				assurance: "local_storage_integrity_only",
				packId,
				manifestSha256: actualDigest,
				manifest: parsed.manifest
			}));
		};
		const importBlob = async (blob) => {
			let size;
			try {
				size = blob.size;
			} catch {
				return failure("read_failed");
			}
			if (size === 0) return failure("empty_file");
			if (!Number.isSafeInteger(size) || size > 262144) return failure("file_too_large");
			let bytes;
			try {
				bytes = await blob.arrayBuffer();
			} catch {
				return failure("read_failed");
			}
			if (bytes.byteLength === 0) return failure("empty_file");
			if (bytes.byteLength > 262144) return failure("file_too_large");
			const parsed = await parseCaptionPackBytes(bytes, cryptoProvider);
			if (!parsed.ok) return failure(parsed.code);
			let writeResult;
			try {
				writeResult = await persistence.storeIfAbsent({
					packId: parsed.manifest.packId,
					manifestSha256: parsed.manifestSha256,
					manifestBytes: parsed.manifestBytes.slice(0)
				});
			} catch (error) {
				return failure(mapPersistenceError(error));
			}
			if (writeResult === "conflict") return failure("pack_id_conflict");
			const verified = await getVerified(parsed.manifest.packId);
			if (!verified.ok) return verified;
			try {
				await persistence.setActivePackId(parsed.manifest.packId);
			} catch {
				return failure("storage_activation_failed");
			}
			return verified;
		};
		const getActiveVerified = async () => {
			let packId;
			try {
				packId = await persistence.getActivePackId();
			} catch (error) {
				return failure(mapPersistenceError(error));
			}
			return packId === void 0 ? failure("not_found") : getVerified(packId);
		};
		return Object.freeze({
			importBlob,
			getVerified,
			getActiveVerified,
			close: () => {
				try {
					persistence.close();
				} catch {}
			}
		});
	}
	function requestResult(request) {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onerror = () => {
				reject(new PersistenceFailure("storage_failed"));
			};
		});
	}
	function transactionComplete(transaction) {
		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => {
				resolve();
			};
			transaction.onerror = () => {
				reject(new PersistenceFailure("storage_failed"));
			};
			transaction.onabort = () => {
				reject(new PersistenceFailure("storage_failed"));
			};
		});
	}
	function createIndexedDbPersistence(indexedDb, databaseName) {
		let closed = false;
		const databasePromise = new Promise((resolve, reject) => {
			const request = indexedDb.open(databaseName, DATABASE_VERSION);
			request.onupgradeneeded = () => {
				const database = request.result;
				if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) database.createObjectStore(OBJECT_STORE_NAME, { keyPath: "packId" });
				if (!database.objectStoreNames.contains(STATE_STORE_NAME)) database.createObjectStore(STATE_STORE_NAME, { keyPath: "key" });
			};
			request.onsuccess = () => {
				const database = request.result;
				database.onversionchange = () => {
					database.close();
				};
				if (closed) {
					database.close();
					reject(new PersistenceFailure("storage_unavailable"));
					return;
				}
				resolve(database);
			};
			request.onerror = () => {
				reject(new PersistenceFailure("storage_unavailable"));
			};
			request.onblocked = () => {
				reject(new PersistenceFailure("storage_unavailable"));
			};
		});
		return {
			storeIfAbsent: async (record) => {
				const transaction = (await databasePromise).transaction(OBJECT_STORE_NAME, "readwrite");
				const store = transaction.objectStore(OBJECT_STORE_NAME);
				const existing = await requestResult(store.get(record.packId));
				if (existing !== void 0) {
					await transactionComplete(transaction);
					return existing.manifestSha256 === record.manifestSha256 ? "identical" : "conflict";
				}
				await requestResult(store.add(record));
				await transactionComplete(transaction);
				return "stored";
			},
			get: async (packId) => {
				const transaction = (await databasePromise).transaction(OBJECT_STORE_NAME, "readonly");
				const record = await requestResult(transaction.objectStore(OBJECT_STORE_NAME).get(packId));
				await transactionComplete(transaction);
				if (record === void 0) return;
				return {
					packId: record.packId,
					manifestSha256: record.manifestSha256,
					manifestBytes: record.manifestBytes.slice(0)
				};
			},
			setActivePackId: async (packId) => {
				const transaction = (await databasePromise).transaction(STATE_STORE_NAME, "readwrite");
				await requestResult(transaction.objectStore(STATE_STORE_NAME).put({
					key: ACTIVE_PACK_KEY,
					packId
				}));
				await transactionComplete(transaction);
			},
			getActivePackId: async () => {
				const transaction = (await databasePromise).transaction(STATE_STORE_NAME, "readonly");
				const record = await requestResult(transaction.objectStore(STATE_STORE_NAME).get(ACTIVE_PACK_KEY));
				await transactionComplete(transaction);
				return typeof record?.packId === "string" ? record.packId : void 0;
			},
			close: () => {
				closed = true;
				databasePromise.then((database) => {
					database.close();
				}, () => {});
			}
		};
	}
	function createIndexedDbCaptionPackStore(options = {}) {
		const indexedDb = options.indexedDb ?? globalThis.indexedDB;
		if (indexedDb === void 0) return createCaptionPackStore({
			persistence: {
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
				close: () => {}
			},
			...options.cryptoProvider === void 0 ? {} : { cryptoProvider: options.cryptoProvider }
		});
		return createCaptionPackStore({
			persistence: createIndexedDbPersistence(indexedDb, options.databaseName ?? DATABASE_NAME),
			...options.cryptoProvider === void 0 ? {} : { cryptoProvider: options.cryptoProvider }
		});
	}
	//#endregion
	//#region apps/extension/src/background.ts
	var MESSAGE_PREFIX = "signbridge:";
	var YOUTUBE_HOSTS = new Set(["www.youtube.com", "m.youtube.com"]);
	var STATUS_CODES = new Set([
		"fallback",
		"integrity_failure",
		"waiting"
	]);
	var store = createIndexedDbCaptionPackStore({ databaseName: "signbridge-extension-caption-packs" });
	var chromeApi = globalThis.chrome;
	var statusByTab = /* @__PURE__ */ new Map();
	function badgeFor(code) {
		if (code === "waiting") return {
			color: "#92400e",
			text: "WAIT"
		};
		if (code === "integrity_failure") return {
			color: "#991b1b",
			text: "ERR"
		};
		return {
			color: "#1e3a8a",
			text: "CAP"
		};
	}
	async function setStatus(tabId, code, reasonCode) {
		const badge = badgeFor(code);
		statusByTab.set(tabId, {
			code,
			reasonCode
		});
		await Promise.all([
			chromeApi.action.setBadgeText({
				tabId,
				text: badge.text
			}),
			chromeApi.action.setBadgeBackgroundColor({
				tabId,
				color: badge.color
			}),
			chromeApi.action.setTitle({
				tabId,
				title: `SignBridge: ${reasonCode}. Source captions remain available.`
			})
		]);
	}
	async function readPackState() {
		const result = await store.getActiveVerified();
		return result.ok ? {
			ok: true,
			manifest: result.value.manifest
		} : {
			ok: false,
			code: result.code
		};
	}
	function parsePageTarget(pageUrl) {
		if (pageUrl === void 0) return null;
		try {
			const url = new URL(pageUrl);
			if (url.protocol !== "http:" && url.protocol !== "https:") return null;
			return {
				isYouTube: YOUTUBE_HOSTS.has(url.hostname),
				originPattern: `${url.origin}/*`
			};
		} catch {
			return null;
		}
	}
	async function targetHasAccess(target) {
		return target.isYouTube || await chromeApi.permissions.contains({ origins: [target.originPattern] });
	}
	chromeApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
		if (message.type === `${MESSAGE_PREFIX}pack-state:get`) {
			readPackState().then(sendResponse, () => {
				sendResponse({
					ok: false,
					code: "storage_unavailable"
				});
			});
			return true;
		}
		if (message.type === `${MESSAGE_PREFIX}status:set`) {
			const tabId = sender.tab?.id;
			const code = message.code;
			const reasonCode = message.reasonCode;
			if (typeof tabId === "number" && typeof code === "string" && STATUS_CODES.has(code) && typeof reasonCode === "string" && reasonCode.length <= 80) setStatus(tabId, code, reasonCode);
			return;
		}
		if (message.type === `${MESSAGE_PREFIX}status:get`) {
			const tabId = message.tabId;
			if (typeof tabId !== "number") {
				sendResponse({
					code: "waiting",
					reasonCode: "no_active_tab"
				});
				return;
			}
			const known = statusByTab.get(tabId);
			if (known !== void 0) {
				sendResponse(known);
				return;
			}
			chromeApi.action.getBadgeText({ tabId }).then((text) => {
				sendResponse({
					code: text === "ERR" ? "integrity_failure" : text === "CAP" ? "fallback" : "waiting",
					reasonCode: text.length === 0 ? "not_sampled" : "browser_badge_state"
				});
			});
			return true;
		}
	});
	chromeApi.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
		const target = parsePageTarget(changeInfo.url ?? tab.url);
		if (target === null) return;
		if (changeInfo.status === "loading") {
			targetHasAccess(target).then((hasAccess) => hasAccess ? setStatus(tabId, "waiting", "navigation_started") : void 0).catch(() => void 0);
			return;
		}
		if (changeInfo.status !== "complete") return;
		if (target.isYouTube) return;
		chromeApi.permissions.contains({ origins: [target.originPattern] }).then((granted) => granted ? chromeApi.scripting.executeScript({
			target: { tabId },
			files: ["content.js"]
		}) : void 0).catch(() => void 0);
	});
	chromeApi.tabs.onRemoved.addListener((tabId) => {
		statusByTab.delete(tabId);
	});
	//#endregion
})();
