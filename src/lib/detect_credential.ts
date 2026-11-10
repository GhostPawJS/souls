/** Returns whether text contains a common credential signature. */
export function detectCredential(text: string): boolean {
	return /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|(?:ghp_|gho_|github_pat_)[A-Za-z0-9_]+|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[abprs]-[A-Za-z0-9-]+|npm_[A-Za-z0-9]{36}|\b(?:password|passwd|secret|token|api[_-]?key)\s*[=:]\s*\S+/i.test(
		text,
	);
}
