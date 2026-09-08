import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const sourceUrl =
	"https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0_release/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.flat.json";
const outputPath = new URL(
	"../docs/architecture/asvs-5-l2-requirements.json",
	import.meta.url,
);

const response = await fetch(sourceUrl, {
	headers: { "User-Agent": "cris-chaves-asvs-sync/1.0" },
});
assert.equal(
	response.status,
	200,
	`não foi possível ler o ASVS oficial: ${response.status}`,
);
const source = await response.json();
assert.ok(Array.isArray(source.requirements), "fonte ASVS sem requirements");

const requirements = source.requirements
	.filter((requirement) => Number(requirement.L) <= 2)
	.map((requirement) => ({
		id: `v5.0.0-${requirement.req_id}`,
		chapter: requirement.chapter_name,
		section: requirement.section_name,
		level: Number(requirement.L),
		description: requirement.req_description,
	}));
assert.equal(
	requirements.length,
	253,
	"a baseline ASVS L2 esperada deve ter 253 requisitos",
);
assert.equal(new Set(requirements.map(({ id }) => id)).size, 253, "IDs ASVS duplicados");

let existing = { controls: {} };
try {
	existing = JSON.parse(await readFile(outputPath, "utf8"));
} catch (error) {
	if (error?.code !== "ENOENT") throw error;
}

const controls = Object.fromEntries(
	requirements.map((requirement) => {
		const previous = existing.controls?.[requirement.id];
		return [
			requirement.id,
			{
				...requirement,
				status: previous?.status ?? "pending",
				applicability: previous?.applicability ?? "",
				evidence: previous?.evidence ?? [],
				justification: previous?.justification ?? "",
			},
		];
	}),
);

const allowedStatuses = new Set(["pending", "verified", "not_applicable"]);
for (const control of Object.values(controls)) {
	assert.ok(allowedStatuses.has(control.status), `${control.id}: status inválido`);
	if (control.status === "verified") {
		assert.ok(control.applicability.trim(), `${control.id}: aplicabilidade ausente`);
		assert.ok(control.evidence.length > 0, `${control.id}: evidência ausente`);
	}
	if (control.status === "not_applicable") {
		assert.ok(control.justification.trim(), `${control.id}: N/A sem justificativa`);
	}
}

const matrix = {
	baseline: "OWASP ASVS 5.0.0 Level 2",
	source: sourceUrl,
	requirementCount: requirements.length,
	controls,
};
await writeFile(outputPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");

const summary = Object.values(controls).reduce((counts, control) => {
	counts[control.status] = (counts[control.status] ?? 0) + 1;
	return counts;
}, {});
console.log(
	`ASVS L2 sincronizado: ${requirements.length} requisitos; ` +
		`${summary.verified ?? 0} verificados; ${summary.not_applicable ?? 0} N/A; ` +
		`${summary.pending ?? 0} pendentes.`,
);
