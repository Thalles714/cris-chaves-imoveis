import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expectedSource =
	"https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json";
const matrixPath = new URL(
	"../docs/architecture/asvs-5-l2-requirements.json",
	import.meta.url,
);

const matrix = JSON.parse(await readFile(matrixPath, "utf8"));
assert.equal(matrix.baseline, "OWASP ASVS 5.0.0 Level 2", "baseline ASVS inesperada");
assert.equal(
	matrix.source,
	expectedSource,
	"fonte ASVS não está fixada na release oficial",
);
assert.equal(matrix.requirementCount, 253, "a baseline L2 deve conter 253 requisitos");
assert.ok(
	matrix.controls &&
		typeof matrix.controls === "object" &&
		!Array.isArray(matrix.controls),
	"controls deve ser um objeto indexado pelo ID versionado",
);

const entries = Object.entries(matrix.controls);
assert.equal(entries.length, 253, "a matriz deve conter exatamente 253 controles");
assert.equal(new Set(entries.map(([id]) => id)).size, 253, "IDs ASVS duplicados");

const allowedStatuses = new Set(["pending", "verified", "not_applicable"]);
for (const [id, control] of entries) {
	assert.equal(control.id, id, `${id}: chave e ID interno divergem`);
	assert.match(id, /^v5\.0\.0-V\d+\.\d+\.\d+$/, `${id}: ID versionado inválido`);
	assert.ok([1, 2].includes(control.level), `${id}: nível fora do escopo L2`);
	assert.ok(control.chapter?.trim(), `${id}: capítulo ausente`);
	assert.ok(control.section?.trim(), `${id}: seção ausente`);
	assert.ok(control.description?.trim(), `${id}: descrição ausente`);
	assert.ok(allowedStatuses.has(control.status), `${id}: status inválido`);
	assert.equal(typeof control.applicability, "string", `${id}: aplicabilidade inválida`);
	assert.ok(Array.isArray(control.evidence), `${id}: evidência deve ser uma lista`);
	assert.equal(typeof control.justification, "string", `${id}: justificativa inválida`);

	if (control.status === "verified") {
		assert.ok(control.applicability.trim(), `${id}: aplicabilidade ausente`);
		assert.ok(control.evidence.length > 0, `${id}: evidência ausente`);
		assert.ok(
			control.evidence.every((item) => typeof item === "string" && item.trim()),
			`${id}: evidência vazia ou inválida`,
		);
	}
	if (control.status === "not_applicable") {
		assert.ok(control.justification.trim(), `${id}: N/A sem justificativa individual`);
	}
}

const summary = Object.values(matrix.controls).reduce((counts, control) => {
	counts[control.status] = (counts[control.status] ?? 0) + 1;
	return counts;
}, {});
console.log(
	`Matriz ASVS L2 válida: ${entries.length} requisitos; ` +
		`${summary.verified ?? 0} verificados; ${summary.not_applicable ?? 0} N/A; ` +
		`${summary.pending ?? 0} pendentes.`,
);
