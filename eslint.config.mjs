import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'
import { readdirSync } from 'node:fs'

const config = await generateEslintConfig({
	enableTypescript: true,
})

// The installed tools package resolves @eslint/js 10 while this module still has ESLint 9.23.
// Keep shared lint rules and drop core rules that this installed ESLint version does not provide.
const availableCoreRules = new Set(
	readdirSync(new URL('./node_modules/eslint/lib/rules/', import.meta.url)).map((filename) =>
		filename.replace(/\.js$/, ''),
	),
)
for (const entry of config) {
	if (!entry.rules) continue
	for (const ruleName of Object.keys(entry.rules)) {
		if (!ruleName.includes('/') && !availableCoreRules.has(ruleName)) delete entry.rules[ruleName]
	}
}

// The API client types are generated and intentionally retain the generator's formatting.
config.push({ ignores: ['src/api/openapi.ts'] })
// These legacy files have mixed line endings, so keep lint rules but skip formatting checks there.
config.push({
	files: ['src/config.ts', 'src/types.d.ts', 'src/upgrades.ts'],
	rules: { 'prettier/prettier': 'off' },
})

export default config
