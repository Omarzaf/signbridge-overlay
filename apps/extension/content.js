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
	//#endregion
	//#region packages/sync-engine/src/index.ts
	var PLAYBACK_MODEL_BRAND = Symbol("preparedPlaybackModel");
	var ASSET_PLAYBACK_STATES = new Set([
		"ready",
		"missing",
		"corrupt",
		"withdrawn"
	]);
	var AUTHENTIC_PLAYBACK_MODELS = /* @__PURE__ */ new WeakSet();
	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}
	function capturePrepareInput(input) {
		try {
			if (!isRecord(input)) return null;
			const manifest = input["manifest"];
			const manifestIntegrity = input["manifestIntegrity"];
			const assetStates = input["assetStates"];
			const runtimeVersion = input["runtimeVersion"];
			if (manifestIntegrity !== "verified" && manifestIntegrity !== "unverified" && manifestIntegrity !== "corrupt" || !isRecord(assetStates) || typeof runtimeVersion !== "string") return null;
			return Object.freeze({
				manifest,
				manifestIntegrity,
				assetStates,
				runtimeVersion
			});
		} catch {
			return null;
		}
	}
	function captureMediaClock(snapshot) {
		try {
			if (!isRecord(snapshot)) return null;
			const sourceFingerprint = snapshot["sourceFingerprint"];
			const currentTimeMs = snapshot["currentTimeMs"];
			const paused = snapshot["paused"];
			const seeking = snapshot["seeking"];
			const playbackRate = snapshot["playbackRate"];
			return Object.freeze({
				sourceFingerprint,
				currentTimeMs,
				paused,
				seeking,
				playbackRate
			});
		} catch {
			return null;
		}
	}
	function isPublishedForPlayback(manifest) {
		if (!isRecord(manifest)) return false;
		return manifest["releaseStatus"] === "published" && manifest["developmentOnly"] === false && manifest["linguisticReviewStatus"] === "human_reviewed" && isRecord(manifest["publication"]);
	}
	function claimsPublishedRelease(manifest) {
		return isRecord(manifest) && manifest["releaseStatus"] === "published";
	}
	function hasOnlyPublicationGateIssues(validation) {
		return validation.issues.length > 0 && validation.issues.every((issue) => {
			return issue.code === "publication_gate" || issue.path === "$.publication" && issue.code === "required";
		});
	}
	function parseSemver(version) {
		const match = SEMVER_PATTERN.exec(version);
		if (match === null) return null;
		const major = match[1];
		const minor = match[2];
		const patch = match[3];
		if (major === void 0 || minor === void 0 || patch === void 0) return null;
		return [
			major,
			minor,
			patch
		];
	}
	function compareNumericIdentifier(left, right) {
		if (left.length !== right.length) return left.length < right.length ? -1 : 1;
		if (left === right) return 0;
		return left < right ? -1 : 1;
	}
	function runtimeIsCompatible(runtimeVersion, minimumVersion) {
		const runtime = parseSemver(runtimeVersion);
		const minimum = parseSemver(minimumVersion);
		if (runtime === null || minimum === null) return false;
		for (let index = 0; index < runtime.length; index += 1) {
			const runtimePart = runtime[index];
			const minimumPart = minimum[index];
			if (runtimePart === void 0 || minimumPart === void 0) return false;
			const comparison = compareNumericIdentifier(runtimePart, minimumPart);
			if (comparison !== 0) return comparison > 0;
		}
		return true;
	}
	function cloneCaptionFallback(captionFallback) {
		return Object.freeze({
			language: captionFallback.language,
			text: captionFallback.text
		});
	}
	function cloneSegment(segment) {
		const clone = {
			...segment,
			captionFallback: cloneCaptionFallback(segment.captionFallback),
			assetIds: Object.freeze([...segment.assetIds])
		};
		return Object.freeze(clone);
	}
	function cloneAsset(asset) {
		return Object.freeze({
			assetId: asset.assetId,
			path: asset.path,
			sha256: asset.sha256,
			mediaType: asset.mediaType,
			durationMs: asset.durationMs
		});
	}
	function buildAssetsById(assets) {
		const assetsById = Object.create(null);
		for (const asset of assets) assetsById[asset.assetId] = cloneAsset(asset);
		return Object.freeze(assetsById);
	}
	function copyAssetStates(assetStates) {
		const copy = Object.create(null);
		for (const [assetId, state] of Object.entries(assetStates)) {
			if (!ASSET_PLAYBACK_STATES.has(state)) throw new TypeError("invalid asset playback state");
			copy[assetId] = state;
		}
		return Object.freeze(copy);
	}
	function readyModel(manifest, assetStates, runtimeVersion) {
		const segmentIndex = Object.freeze(manifest.segments.map(cloneSegment));
		const model = {
			status: "ready",
			sourceFingerprint: manifest.sourceVideo.fingerprint,
			sourceDurationMs: manifest.sourceVideo.durationMs,
			segmentIndex,
			assetsById: buildAssetsById(manifest.assets),
			assetStates: copyAssetStates(assetStates),
			runtimeVersion
		};
		Object.defineProperty(model, PLAYBACK_MODEL_BRAND, {
			value: true,
			enumerable: false
		});
		Object.freeze(model);
		AUTHENTIC_PLAYBACK_MODELS.add(model);
		return model;
	}
	function blockedModel(reason) {
		const model = {
			status: "blocked",
			reason
		};
		Object.defineProperty(model, PLAYBACK_MODEL_BRAND, {
			value: true,
			enumerable: false
		});
		Object.freeze(model);
		AUTHENTIC_PLAYBACK_MODELS.add(model);
		return model;
	}
	function preparePlaybackModel(input) {
		const captured = capturePrepareInput(input);
		if (captured === null) return blockedModel("invalid_manifest");
		const { manifest, manifestIntegrity, assetStates, runtimeVersion } = captured;
		if (manifestIntegrity === "unverified") return blockedModel("unverified_manifest");
		if (manifestIntegrity === "corrupt") return blockedModel("corrupt_manifest");
		let detachedManifest;
		let validation;
		try {
			detachedManifest = structuredClone(manifest);
			validation = validateSignPack(detachedManifest);
		} catch {
			return blockedModel("invalid_manifest");
		}
		if (!validation.ok) {
			if (claimsPublishedRelease(detachedManifest) && hasOnlyPublicationGateIssues(validation)) return blockedModel("not_published");
			return blockedModel("invalid_manifest");
		}
		if (!isPublishedForPlayback(detachedManifest)) return blockedModel("not_published");
		if (!runtimeIsCompatible(runtimeVersion, validation.value.runtimeCompatibility.minimumVersion)) return blockedModel("incompatible_runtime");
		try {
			return readyModel(validation.value, assetStates, runtimeVersion);
		} catch {
			return blockedModel("invalid_manifest");
		}
	}
	function fallback(reason, mediaTimeMs, segment) {
		if (segment === void 0) return Object.freeze({
			kind: "caption_fallback",
			reason,
			mediaTimeMs,
			preserveSourceCaptions: true
		});
		return Object.freeze({
			kind: "caption_fallback",
			reason,
			mediaTimeMs,
			segmentId: segment.segmentId,
			captionFallback: segment.captionFallback,
			preserveSourceCaptions: true
		});
	}
	function findSegment(segments, currentTimeMs) {
		let low = 0;
		let high = segments.length - 1;
		while (low <= high) {
			const middle = low + Math.floor((high - low) / 2);
			const segment = segments[middle];
			if (segment === void 0) return;
			if (currentTimeMs < segment.startMs) high = middle - 1;
			else if (currentTimeMs >= segment.endMs) low = middle + 1;
			else return segment;
		}
	}
	function validMediaTime(currentTimeMs, sourceDurationMs) {
		return typeof currentTimeMs === "number" && Number.isFinite(currentTimeMs) && currentTimeMs >= 0 && currentTimeMs <= sourceDurationMs;
	}
	function isValidClock(snapshot, sourceDurationMs) {
		return validMediaTime(snapshot.currentTimeMs, sourceDurationMs) && typeof snapshot.playbackRate === "number" && Number.isFinite(snapshot.playbackRate) && snapshot.playbackRate > 0 && typeof snapshot.paused === "boolean" && typeof snapshot.seeking === "boolean";
	}
	function safeMediaTime(snapshot) {
		return typeof snapshot.currentTimeMs === "number" && Number.isFinite(snapshot.currentTimeMs) && snapshot.currentTimeMs >= 0 ? snapshot.currentTimeMs : null;
	}
	function resolveReadyPlaybackState(model, snapshot) {
		if (!isValidClock(snapshot, model.sourceDurationMs)) return fallback("invalid_clock", null);
		if (typeof snapshot.sourceFingerprint !== "string" || snapshot.sourceFingerprint !== model.sourceFingerprint) return fallback("source_mismatch", snapshot.currentTimeMs);
		const segment = findSegment(model.segmentIndex, snapshot.currentTimeMs);
		if (segment === void 0) return fallback("gap", snapshot.currentTimeMs);
		if (segment.translationStatus === "unsupported") return fallback("unsupported_segment", snapshot.currentTimeMs, segment);
		if (segment.translationStatus !== "mapped" || segment.reviewStatus !== "approved") return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
		if (snapshot.playbackRate !== 1) return fallback("unapproved_playback_rate", snapshot.currentTimeMs, segment);
		if (segment.assetIds.length !== 1) return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
		const assetId = segment.assetIds[0];
		if (assetId === void 0) return fallback("missing_asset", snapshot.currentTimeMs, segment);
		const assetState = model.assetStates[assetId];
		if (assetState === void 0 || assetState === "missing") return fallback("missing_asset", snapshot.currentTimeMs, segment);
		if (assetState === "withdrawn") return fallback("withdrawn_asset", snapshot.currentTimeMs, segment);
		if (assetState === "corrupt") return fallback("corrupt_asset", snapshot.currentTimeMs, segment);
		if (assetState !== "ready") return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
		const asset = model.assetsById[assetId];
		if (asset === void 0 || asset.durationMs !== segment.endMs - segment.startMs) return fallback("incompatible_segment", snapshot.currentTimeMs, segment);
		return Object.freeze({
			kind: "active_sign",
			segmentId: segment.segmentId,
			asset,
			mediaTimeMs: snapshot.currentTimeMs,
			assetTimeMs: snapshot.currentTimeMs - segment.startMs,
			paused: snapshot.paused,
			seeking: snapshot.seeking,
			shouldPlay: !snapshot.paused && !snapshot.seeking,
			captionFallback: segment.captionFallback,
			preserveSourceCaptions: true
		});
	}
	function isAuthenticPlaybackModel(model) {
		return typeof model === "object" && model !== null && AUTHENTIC_PLAYBACK_MODELS.has(model);
	}
	function resolvePlaybackState(model, snapshot) {
		try {
			if (!isAuthenticPlaybackModel(model)) return fallback("invalid_manifest", null);
			const capturedSnapshot = captureMediaClock(snapshot);
			if (capturedSnapshot === null) return fallback("invalid_clock", null);
			if (model.status === "blocked") return fallback(model.reason, safeMediaTime(capturedSnapshot));
			return resolveReadyPlaybackState(model, capturedSnapshot);
		} catch {
			return fallback("invalid_clock", null);
		}
	}
	//#endregion
	//#region packages/runtime/src/index.ts
	function createRuntimeController(model) {
		let currentState = null;
		let disposed = false;
		const listeners = /* @__PURE__ */ new Set();
		const sample = (snapshot) => {
			const nextState = resolvePlaybackState(model, snapshot);
			if (disposed) return nextState;
			currentState = nextState;
			for (const listener of [...listeners]) try {
				listener(nextState);
			} catch {}
			return nextState;
		};
		const getState = () => currentState;
		const subscribe = (listener) => {
			if (disposed) return () => {};
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		};
		const dispose = () => {
			disposed = true;
			listeners.clear();
		};
		return {
			sample,
			getState,
			subscribe,
			dispose
		};
	}
	/**
	* `Record<PlaybackFallbackReason, string>` rather than a switch: if the sync
	* engine ever adds a reason code, this file stops compiling instead of quietly
	* rendering an empty explanation.
	*/
	var FALLBACK_DETAIL = {
		invalid_manifest: "This pack's manifest could not be read, so no sign segment can be trusted.",
		not_published: "This pack is an unpublished draft. Nothing in it has been approved for playback.",
		unverified_manifest: "This pack's manifest failed its integrity check and was not interpreted.",
		corrupt_manifest: "This pack's manifest is corrupt and was not interpreted.",
		incompatible_runtime: "This pack requires a newer viewer than the one you are running.",
		invalid_clock: "The source video is not reporting a usable playback time, so nothing can be synchronised to it.",
		source_mismatch: "The video playing is not the video this pack was reviewed against.",
		gap: "No sign segment covers this moment of the video.",
		unsupported_segment: "The reviewer marked this segment unsupported. No sign has been invented for it.",
		missing_asset: "The reviewed media for this segment is not available offline.",
		withdrawn_asset: "The reviewed media for this segment has been withdrawn and must not be shown.",
		corrupt_asset: "The reviewed media for this segment failed its integrity check.",
		incompatible_segment: "This segment is not in a state that permits playback of reviewed signing.",
		unapproved_playback_rate: "Signing is shown at normal speed only. Speed changes have not been reviewed for comprehensibility."
	};
	var ACTIVE_SUMMARY = "Reviewed signing media is playing.";
	var DRAFT_SUMMARY = "Signing is unavailable for this synthetic draft.";
	var GENERAL_SUMMARY = "Signing is unavailable. Source captions remain available.";
	Object.freeze(Object.keys(FALLBACK_DETAIL).sort());
	/**
	* Maps any playback state onto something readable. Every branch produces a
	* non-empty summary, detail, and caption line, which is what "never blank"
	* means in practice: there is no input for which the viewer sees nothing.
	*/
	function describeRendererState(state) {
		if (state.kind === "active_sign") return Object.freeze({
			surface: "sign_asset",
			reasonCode: "active_sign",
			summary: ACTIVE_SUMMARY,
			detail: "Reviewed signing media for this segment is following the source video's clock.",
			captionText: state.captionFallback.text,
			captionsIndependentlyAvailable: true
		});
		return Object.freeze({
			surface: "caption_fallback",
			reasonCode: state.reason,
			summary: state.reason === "not_published" ? DRAFT_SUMMARY : GENERAL_SUMMARY,
			detail: FALLBACK_DETAIL[state.reason],
			captionText: state.captionFallback?.text ?? "Source captions remain independently available.",
			captionsIndependentlyAvailable: true
		});
	}
	//#endregion
	//#region packages/sign-renderer/src/geometry.ts
	/**
	* The exact style the signing surface is allowed to carry. `contain` is the
	* only object-fit that cannot crop; `none` is the only transform that cannot
	* mirror. Exported as a frozen constant so a test can assert the values that
	* are actually applied to the element, not a paraphrase of them.
	*/
	var SIGN_SURFACE_STYLE = Object.freeze({
		objectFit: "contain",
		objectPosition: "center",
		transform: "none"
	});
	function isPositiveFinite(value) {
		return Number.isFinite(value) && value > 0;
	}
	/**
	* Returns null rather than guessing when the measurements are unusable. A
	* caller that cannot place the surface honestly must fall back to captions;
	* it must never render a box of invented size.
	*/
	function resolveAssetGeometry(input) {
		const { containerWidthPx, containerHeightPx, assetWidthPx, assetHeightPx } = input;
		if (!isPositiveFinite(containerWidthPx) || !isPositiveFinite(containerHeightPx) || !isPositiveFinite(assetWidthPx) || !isPositiveFinite(assetHeightPx)) return null;
		const scale = Math.min(containerWidthPx / assetWidthPx, containerHeightPx / assetHeightPx);
		if (!isPositiveFinite(scale)) return null;
		const widthPx = assetWidthPx * scale;
		const heightPx = assetHeightPx * scale;
		return Object.freeze({
			widthPx,
			heightPx,
			offsetXPx: (containerWidthPx - widthPx) / 2,
			offsetYPx: (containerHeightPx - heightPx) / 2,
			scale,
			cropped: false,
			mirrored: false
		});
	}
	function currentTimeMs(surface) {
		const seconds = surface.currentTime;
		return Number.isFinite(seconds) ? seconds * 1e3 : null;
	}
	function safePause(surface) {
		try {
			if (!surface.paused) surface.pause();
		} catch {}
	}
	function safePlay(surface) {
		try {
			const result = surface.play();
			Promise.resolve(result).catch(() => void 0);
		} catch {}
	}
	function pauseSurface(surface) {
		safePause(surface);
		return Object.freeze({
			actions: Object.freeze(["pause"]),
			targetTimeMs: null,
			driftMs: null
		});
	}
	/**
	* Moves any timeline-bearing surface to where one clock sample says it should
	* be. Shared by the signing layer and the synthetic motion surface so both obey
	* the same seek-and-hold rules; neither has a loop of its own to drift with.
	*/
	function alignSurfaceToClock(surface, alignment) {
		const targetTimeMs = alignment.targetTimeMs;
		if (!Number.isFinite(targetTimeMs) || targetTimeMs < 0) return pauseSurface(surface);
		const observedMs = currentTimeMs(surface);
		const actions = [];
		if (observedMs === null) {
			surface.currentTime = targetTimeMs / 1e3;
			actions.push("seek");
		} else if (Math.abs(observedMs - targetTimeMs) > 120) {
			surface.currentTime = targetTimeMs / 1e3;
			actions.push("seek");
		}
		if (alignment.shouldPlay) {
			if (surface.paused) {
				safePlay(surface);
				actions.push("play");
			}
		} else if (!surface.paused) {
			safePause(surface);
			actions.push("pause");
		}
		if (actions.length === 0) actions.push("hold");
		return Object.freeze({
			actions: Object.freeze(actions),
			targetTimeMs,
			driftMs: observedMs === null ? null : observedMs - targetTimeMs
		});
	}
	/**
	* Aligns the signing surface with one media-clock sample.
	*
	* Any state other than `active_sign` pauses the surface: if there is no
	* approved segment for this moment, motion on the signing layer would be
	* motion the viewer could mistake for signing.
	*/
	function applyPlaybackToSurface(surface, state) {
		if (state.kind !== "active_sign") return pauseSurface(surface);
		return alignSurfaceToClock(surface, {
			targetTimeMs: state.assetTimeMs,
			shouldPlay: state.shouldPlay
		});
	}
	//#endregion
	//#region packages/sign-renderer/src/signSurface.ts
	/**
	* Writes the one permitted geometry onto an element. Nothing else in the
	* codebase sets these properties on a signing surface, so the no-crop and
	* no-mirror guarantees hold for whatever the element turns out to be.
	*/
	function applySurfaceGeometry(element, geometry) {
		const style = element.style;
		style.setProperty("object-fit", SIGN_SURFACE_STYLE.objectFit);
		style.setProperty("object-position", SIGN_SURFACE_STYLE.objectPosition);
		style.setProperty("transform", SIGN_SURFACE_STYLE.transform);
		if (geometry === null) {
			style.setProperty("display", "none");
			style.removeProperty("width");
			style.removeProperty("height");
			style.removeProperty("left");
			style.removeProperty("top");
			return;
		}
		style.setProperty("display", "block");
		style.setProperty("width", `${geometry.widthPx}px`);
		style.setProperty("height", `${geometry.heightPx}px`);
		style.setProperty("left", `${geometry.offsetXPx}px`);
		style.setProperty("top", `${geometry.offsetYPx}px`);
	}
	/**
	* The signing layer for reviewed media.
	*
	* It does not choose what to show. It is handed a `PlaybackState` resolved from
	* the source media clock and reflects exactly that: reviewed media when the
	* sync engine says a segment is approved and ready, and nothing at all
	* otherwise. The caption fallback is the overlay's responsibility, so a failure
	* here can never be silent — the surface goes away and the caption stays.
	*/
	function createSignSurface(root) {
		const element = root.ownerDocument.createElement("video");
		element.setAttribute("playsinline", "");
		element.preload = "auto";
		element.controls = false;
		element.muted = true;
		element.setAttribute("aria-hidden", "true");
		element.style.setProperty("position", "absolute");
		applySurfaceGeometry(element, null);
		root.append(element);
		let mountedAssetId = null;
		let lastState = null;
		let disposed = false;
		const measureRoot = () => {
			const bounds = root.getBoundingClientRect();
			return {
				widthPx: bounds.width,
				heightPx: bounds.height
			};
		};
		const render = (state, container) => {
			lastState = state;
			const presentation = describeRendererState(state);
			if (state.kind !== "active_sign") {
				mountedAssetId = null;
				element.removeAttribute("src");
				const timeline = applyPlaybackToSurface(element, state);
				applySurfaceGeometry(element, null);
				return Object.freeze({
					presentation,
					geometry: null,
					timeline,
					showingSignMedia: false
				});
			}
			if (mountedAssetId !== state.asset.assetId) {
				mountedAssetId = state.asset.assetId;
				element.src = state.asset.path;
			}
			const geometry = resolveAssetGeometry({
				containerWidthPx: container.widthPx,
				containerHeightPx: container.heightPx,
				assetWidthPx: element.videoWidth,
				assetHeightPx: element.videoHeight
			});
			const timeline = applyPlaybackToSurface(element, state);
			applySurfaceGeometry(element, geometry);
			return Object.freeze({
				presentation,
				geometry,
				timeline,
				showingSignMedia: geometry !== null
			});
		};
		const renderLatestGeometry = () => {
			if (disposed || lastState === null) return;
			render(lastState, measureRoot());
		};
		element.addEventListener("loadedmetadata", renderLatestGeometry);
		const view = root.ownerDocument.defaultView;
		view?.addEventListener("resize", renderLatestGeometry);
		const ResizeObserverConstructor = view?.ResizeObserver;
		const resizeObserver = ResizeObserverConstructor === void 0 ? null : new ResizeObserverConstructor(renderLatestGeometry);
		resizeObserver?.observe(root);
		return Object.freeze({
			element,
			render,
			dispose: () => {
				disposed = true;
				element.removeEventListener("loadedmetadata", renderLatestGeometry);
				view?.removeEventListener("resize", renderLatestGeometry);
				resizeObserver?.disconnect();
				lastState = null;
				element.removeAttribute("src");
				element.remove();
			}
		});
	}
	//#endregion
	//#region packages/video-adapters/src/index.ts
	var MEDIA_LIFECYCLE_EVENTS = [
		"timeupdate",
		"play",
		"pause",
		"seeking",
		"seeked",
		"ratechange",
		"loadedmetadata",
		"durationchange",
		"emptied",
		"ended",
		"error"
	];
	function invalidSnapshot() {
		return {
			sourceFingerprint: "",
			currentTimeMs: NaN,
			paused: true,
			seeking: true,
			playbackRate: NaN
		};
	}
	function captureSnapshot(media, resolveSourceFingerprint) {
		try {
			const currentSrc = media.currentSrc;
			const sourceFingerprint = resolveSourceFingerprint(currentSrc);
			const currentTime = media.currentTime;
			const paused = media.paused;
			const seeking = media.seeking;
			const playbackRate = media.playbackRate;
			return {
				sourceFingerprint: typeof sourceFingerprint === "string" ? sourceFingerprint : "",
				currentTimeMs: currentTime * 1e3,
				paused,
				seeking,
				playbackRate
			};
		} catch {
			return invalidSnapshot();
		}
	}
	function createHtml5VideoAdapter({ media, controller, resolveSourceFingerprint }) {
		let started = false;
		let frameCallbackId = null;
		const sampleNow = () => controller.sample(captureSnapshot(media, resolveSourceFingerprint));
		const cancelFrameCallback = () => {
			if (frameCallbackId === null) return;
			const callbackId = frameCallbackId;
			frameCallbackId = null;
			try {
				if (typeof media.cancelVideoFrameCallback === "function") media.cancelVideoFrameCallback(callbackId);
			} catch {}
		};
		const handleVideoFrame = () => {
			frameCallbackId = null;
			sampleNow();
			scheduleFrameCallback();
		};
		const scheduleFrameCallback = () => {
			try {
				const requestVideoFrameCallback = media.requestVideoFrameCallback;
				if (!started || media.paused || frameCallbackId !== null || typeof requestVideoFrameCallback !== "function") return;
				frameCallbackId = requestVideoFrameCallback.call(media, handleVideoFrame);
			} catch {
				frameCallbackId = null;
			}
		};
		const handleLifecycleEvent = (event) => {
			sampleNow();
			if (event.type === "pause" || event.type === "ended" || event.type === "emptied" || event.type === "error") {
				cancelFrameCallback();
				return;
			}
			scheduleFrameCallback();
		};
		const start = () => {
			if (!started) {
				for (const eventName of MEDIA_LIFECYCLE_EVENTS) media.addEventListener(eventName, handleLifecycleEvent);
				started = true;
			}
			const state = sampleNow();
			scheduleFrameCallback();
			return state;
		};
		const dispose = () => {
			if (!started) return;
			for (const eventName of MEDIA_LIFECYCLE_EVENTS) media.removeEventListener(eventName, handleLifecycleEvent);
			cancelFrameCallback();
			started = false;
		};
		return Object.freeze({
			sampleNow,
			start,
			dispose
		});
	}
	function defaultPageUrl() {
		try {
			return globalThis.location.href;
		} catch {
			return "";
		}
	}
	function defaultMutationObserver(callback, root) {
		const observer = new MutationObserver(callback);
		observer.observe(root, {
			childList: true,
			subtree: true
		});
		return observer;
	}
	function safePageUrl(getPageUrl) {
		try {
			const pageUrl = getPageUrl();
			return typeof pageUrl === "string" ? pageUrl : "";
		} catch {
			return "";
		}
	}
	function safeDimension(media, name) {
		try {
			const value = media[name];
			return Number.isFinite(value) && value > 0 ? value : 0;
		} catch {
			return 0;
		}
	}
	function primaryPlayerScore(media, preferred) {
		const renderedArea = safeDimension(media, "clientWidth") * safeDimension(media, "clientHeight");
		const intrinsicArea = safeDimension(media, "videoWidth") * safeDimension(media, "videoHeight");
		let score = Math.max(renderedArea, intrinsicArea);
		if (media === preferred) score += Number.MAX_SAFE_INTEGER / 2;
		try {
			if (!media.paused) score += 1e9;
		} catch {}
		return score;
	}
	/** Selects YouTube's main player, falling back to the largest active video. */
	function selectPrimaryVideo(page) {
		try {
			const preferred = page.querySelector("#movie_player video.html5-main-video");
			const candidates = page.querySelectorAll === void 0 ? [] : [...page.querySelectorAll("video")];
			if (candidates.length === 0) return preferred ?? page.querySelector("video");
			let selected = null;
			let selectedScore = Number.NEGATIVE_INFINITY;
			for (const candidate of candidates) {
				const score = primaryPlayerScore(candidate, preferred);
				if (score > selectedScore) {
					selected = candidate;
					selectedScore = score;
				}
			}
			return selected;
		} catch {
			return null;
		}
	}
	function extractYouTubeVideoId(pageUrl) {
		try {
			const url = new URL(pageUrl);
			if (url.protocol !== "https:" || !/(?:^|\.)youtube\.com$/u.test(url.hostname)) return null;
			if (url.pathname === "/watch") {
				const videoId = url.searchParams.get("v");
				return videoId === null || videoId.length === 0 ? null : videoId;
			}
			return /^\/(?:embed|live|shorts)\/([^/?#]+)/u.exec(url.pathname)?.[1] ?? null;
		} catch {
			return null;
		}
	}
	function createYouTubeVideoAdapter({ page, controller, resolveSourceFingerprint, getPageUrl = defaultPageUrl, navigationTarget = globalThis, observeMutations = defaultMutationObserver }) {
		let started = false;
		let disposed = false;
		let activeMedia = null;
		let activeAdapter = null;
		let mutationSubscription = null;
		let lastPageUrl = safePageUrl(getPageUrl);
		let navigationInvalidated = false;
		let lastSourceIdentity = null;
		const invalidate = () => {
			activeAdapter?.dispose();
			activeAdapter = null;
			activeMedia = null;
			navigationInvalidated = true;
			lastSourceIdentity = null;
			return controller.sample(invalidSnapshot());
		};
		const bindCurrentMedia = () => {
			const media = selectPrimaryVideo(page);
			if (media === null) return invalidate();
			if (media !== activeMedia || activeAdapter === null) {
				activeAdapter?.dispose();
				activeMedia = media;
				activeAdapter = createHtml5VideoAdapter({
					media,
					controller,
					resolveSourceFingerprint: (currentSrc) => {
						const pageUrl = safePageUrl(getPageUrl);
						const source = {
							currentSrc,
							pageUrl,
							videoId: extractYouTubeVideoId(pageUrl)
						};
						const sourceIdentity = JSON.stringify(source);
						if (lastSourceIdentity !== null && sourceIdentity !== lastSourceIdentity) controller.sample(invalidSnapshot());
						lastSourceIdentity = sourceIdentity;
						return resolveSourceFingerprint(source);
					}
				});
			}
			const state = activeAdapter.start();
			navigationInvalidated = false;
			return state;
		};
		const refreshAfterNavigation = () => {
			if (!navigationInvalidated) invalidate();
			lastPageUrl = safePageUrl(getPageUrl);
			return bindCurrentMedia();
		};
		const handleNavigationStart = () => {
			invalidate();
		};
		const handleNavigationFinish = () => {
			refreshAfterNavigation();
		};
		const handleMutation = () => {
			const pageUrl = safePageUrl(getPageUrl);
			const media = selectPrimaryVideo(page);
			if (pageUrl !== lastPageUrl || media !== activeMedia) refreshAfterNavigation();
		};
		const sampleNow = () => {
			if (disposed) return controller.sample(invalidSnapshot());
			return activeAdapter?.sampleNow() ?? bindCurrentMedia();
		};
		const start = () => {
			if (disposed) return controller.sample(invalidSnapshot());
			if (!started) {
				page.addEventListener("yt-navigate-start", handleNavigationStart);
				page.addEventListener("yt-navigate-finish", handleNavigationFinish);
				navigationTarget.addEventListener("popstate", handleNavigationFinish);
				try {
					mutationSubscription = observeMutations(handleMutation, page.documentElement);
				} catch {
					mutationSubscription = null;
				}
				started = true;
			}
			lastPageUrl = safePageUrl(getPageUrl);
			return bindCurrentMedia();
		};
		const dispose = () => {
			if (disposed) return;
			disposed = true;
			if (started) {
				page.removeEventListener("yt-navigate-start", handleNavigationStart);
				page.removeEventListener("yt-navigate-finish", handleNavigationFinish);
				navigationTarget.removeEventListener("popstate", handleNavigationFinish);
				mutationSubscription?.disconnect();
				mutationSubscription = null;
				started = false;
			}
			activeAdapter?.dispose();
			activeAdapter = null;
			activeMedia = null;
		};
		return Object.freeze({
			sampleNow,
			start,
			dispose
		});
	}
	//#endregion
	//#region apps/extension/src/content.ts
	var ROOT_ID = "signbridge-local-overlay";
	var MESSAGE_PREFIX = "signbridge:";
	function extensionRuntime() {
		return globalThis.chrome?.runtime ?? null;
	}
	async function sendMessage(message) {
		try {
			return await extensionRuntime()?.sendMessage(message);
		} catch {
			return null;
		}
	}
	function isPackStateResponse(value) {
		if (typeof value !== "object" || value === null) return false;
		const record = value;
		return record["ok"] === true ? typeof record["manifest"] === "object" && record["manifest"] !== null : record["ok"] === false && typeof record["code"] === "string";
	}
	function createBlockedModel(packState) {
		if (packState.ok && packState.manifest !== void 0) return preparePlaybackModel({
			manifest: packState.manifest,
			manifestIntegrity: "verified",
			assetStates: {},
			runtimeVersion: "0.1.0"
		});
		return preparePlaybackModel({
			manifest: null,
			manifestIntegrity: packState.code === "integrity_mismatch" ? "corrupt" : "unverified",
			assetStates: {},
			runtimeVersion: "0.1.0"
		});
	}
	async function boot() {
		if (document.getElementById(ROOT_ID) !== null) return;
		const host = document.createElement("div");
		host.id = ROOT_ID;
		host.dataset["contentBoundary"] = "synthetic-test-only";
		const shadow = host.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = `
    :host { all: initial; }
    aside { position: fixed; inset: 16px 16px auto auto; z-index: 2147483647;
      box-sizing: border-box; max-width: min(380px, calc(100vw - 32px));
      border: 2px solid #f8fafc; border-radius: 10px; padding: 12px;
      color: #f8fafc; background: #111827; box-shadow: 0 6px 24px rgb(0 0 0 / 35%);
      font: 600 14px/1.45 system-ui, sans-serif; }
    strong { color: #fde68a; font-size: 11px; letter-spacing: .08em; }
    p { margin: 8px 0 0; }
    code { color: #bae6fd; }
    button { min-width: 44px; min-height: 44px; margin-top: 10px; border: 2px solid currentColor;
      border-radius: 8px; padding: 8px 10px; color: #111827; background: #fff;
      font: inherit; cursor: pointer; }
    button:focus-visible { outline: 3px solid #fde68a; outline-offset: 3px; }
    .surface { position: absolute; inset: 0; pointer-events: none; }
  `;
		const aside = document.createElement("aside");
		aside.setAttribute("aria-label", "SignBridge status");
		const label = document.createElement("strong");
		label.textContent = "SYNTHETIC TEST ONLY";
		const summary = document.createElement("p");
		summary.setAttribute("role", "status");
		summary.setAttribute("aria-live", "polite");
		summary.setAttribute("aria-atomic", "true");
		summary.textContent = "Checking extension-controlled local pack storage.";
		const detail = document.createElement("p");
		detail.textContent = "Source captions remain independently available.";
		const reason = document.createElement("code");
		reason.textContent = "State: checking_storage";
		const dismiss = document.createElement("button");
		dismiss.type = "button";
		dismiss.textContent = "Dismiss page overlay";
		const surfaceRoot = document.createElement("div");
		surfaceRoot.className = "surface";
		aside.append(label, summary, detail, reason, dismiss, surfaceRoot);
		shadow.append(style, aside);
		let dismissed = false;
		const ensureAttached = () => {
			if (!dismissed && !host.isConnected) document.documentElement.append(host);
		};
		ensureAttached();
		const removalObserver = new MutationObserver(ensureAttached);
		removalObserver.observe(document.documentElement, {
			childList: true,
			subtree: true
		});
		dismiss.addEventListener("click", () => {
			dismissed = true;
			host.remove();
		});
		const rawPackState = await sendMessage({ type: `${MESSAGE_PREFIX}pack-state:get` });
		const packState = isPackStateResponse(rawPackState) ? rawPackState : {
			ok: false,
			code: "storage_unavailable"
		};
		host.dataset["storage"] = packState.ok ? "verified-local" : packState.code ?? "storage_unavailable";
		const controller = createRuntimeController(createBlockedModel(packState));
		const signSurface = createSignSurface(surfaceRoot);
		let sampleCount = 0;
		let lastPublishedStatus = "";
		let lastPresentation = "";
		const publishBrowserStatus = (code, reasonCode) => {
			const statusKey = `${code}:${reasonCode}`;
			if (statusKey === lastPublishedStatus) return;
			lastPublishedStatus = statusKey;
			sendMessage({
				type: `${MESSAGE_PREFIX}status:set`,
				code,
				reasonCode
			});
		};
		const render = (state) => {
			const presentation = describeRendererState(state);
			const bounds = aside.getBoundingClientRect();
			signSurface.render(state, {
				widthPx: bounds.width,
				heightPx: bounds.height
			});
			const presentationKey = `${state.kind}:${presentation.reasonCode}`;
			if (presentationKey === lastPresentation) return;
			lastPresentation = presentationKey;
			host.dataset["reason"] = presentation.reasonCode;
			host.dataset["callGraph"] = "storage>adapter>runtime>renderer";
			summary.textContent = presentation.summary;
			detail.textContent = presentation.detail;
			reason.textContent = `State: ${presentation.reasonCode}`;
			publishBrowserStatus(presentation.reasonCode === "corrupt_manifest" ? "integrity_failure" : "fallback", presentation.reasonCode);
		};
		const unsubscribe = controller.subscribe(render);
		const adapter = createYouTubeVideoAdapter({
			page: document,
			controller: { sample: (snapshot) => {
				sampleCount += 1;
				host.dataset["sampleCount"] = String(sampleCount);
				host.dataset["clockSampled"] = String(Number.isFinite(snapshot.currentTimeMs));
				host.dataset["sourceSampled"] = String(snapshot.sourceFingerprint.length > 0);
				const invalidated = snapshot.sourceFingerprint.length === 0 && !Number.isFinite(snapshot.currentTimeMs);
				const state = controller.sample(snapshot);
				if (invalidated) {
					lastPresentation = "source_invalidated";
					host.dataset["mediaState"] = "invalidated";
					summary.textContent = "The video changed. Waiting for the new media source.";
					detail.textContent = "Source captions remain independently available.";
					reason.textContent = "State: source_invalidated";
					publishBrowserStatus("waiting", "source_invalidated");
				} else host.dataset["mediaState"] = "sampled";
				return state;
			} },
			resolveSourceFingerprint: ({ currentSrc }) => {
				host.dataset["sourceDescriptorSampled"] = String(currentSrc.length > 0);
				return null;
			}
		});
		adapter.start();
		globalThis.addEventListener("pagehide", () => {
			adapter.dispose();
			unsubscribe();
			controller.dispose();
			signSurface.dispose();
			removalObserver.disconnect();
			host.remove();
		}, { once: true });
	}
	boot();
	//#endregion
})();
