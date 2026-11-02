import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const config = await generateEslintConfig({ enableTypescript: true, ignores: ['.yarn/**'] })
// Generated API types retain the generator's formatting.
config.push({ ignores: ['src/api/openapi.ts'] })
export default config
