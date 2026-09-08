import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["app/**/*.{ts,tsx}", "workers/**/*.ts"];
const serverOnlyPatterns = [
	{
		group: [
			"**/*.server",
			"**/*.server.*",
			"**/.server/**",
			"~/**/*.server",
			"~/**/*.server.*",
			"~/**/.server/**",
		],
		message:
			"Módulos server-only não podem ser importados por código compartilhado com o navegador.",
	},
];

export default tseslint.config(
	{
		ignores: [
			"**/node_modules/**",
			"**/.cache/**",
			"**/build/**",
			"**/.build-check/**",
			"**/dist/**",
			"**/.react-router/**",
			"**/coverage/**",
			"**/playwright-report/**",
			"**/test-results/**",
			"app/lib/supabase/database.types.ts",
			"app-scaffold*/**",
			"foundation-scaffold/**",
			"react-router-foundation/**",
			"assets/**",
			"briefing_export/**",
			"worker-configuration.d.ts",
		],
	},
	{
		linterOptions: {
			reportUnusedDisableDirectives: "error",
		},
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked.map((config) => ({
		...config,
		files: sourceFiles,
	})),
	{
		files: sourceFiles,
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{ fixStyle: "inline-type-imports", prefer: "type-imports" },
			],
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": "error",
			"@typescript-eslint/no-restricted-imports": [
				"error",
				{ patterns: serverOnlyPatterns },
			],
		},
	},
	{
		files: ["app/**/*.{ts,tsx}"],
		languageOptions: {
			globals: globals.browser,
		},
	},
	{
		files: ["app/**/*.{tsx,jsx}"],
		plugins: {
			"jsx-a11y": jsxA11y,
			"react-hooks": reactHooks,
		},
		rules: {
			...jsxA11y.flatConfigs.recommended.rules,
			...reactHooks.configs.flat["recommended-latest"].rules,
		},
	},
	{
		files: ["**/*.{js,mjs,cjs}", "*.config.ts", "tests/**/*.{ts,tsx}"],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: [
			"app/routes/**/*.{ts,tsx}",
			"app/root.tsx",
			"app/entry.server.tsx",
			"app/**/*.server.{ts,tsx}",
			"app/**/.server/**/*.{ts,tsx}",
			"workers/**/*.ts",
		],
		rules: {
			"@typescript-eslint/no-restricted-imports": "off",
		},
	},
);
