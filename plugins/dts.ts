import { resolve, dirname } from 'path'
import * as fs from 'fs/promises'
import { createFilter } from '@rollup/pluginutils'
import { normalizePath } from 'vite'
import { Project } from 'ts-morph'

import type { Plugin } from 'vite'
import type { SourceFile } from 'ts-morph'

export default (): Plugin => {
    const filter = createFilter(['**/*.vue', '**/*.ts'], 'node_modules/**')
    const sourceFiles: SourceFile[] = []

    const project = new Project({
        compilerOptions: {
            declaration: true,
            emitDeclarationOnly: true,
            noEmitOnError: true,
            outDir: 'dist'
        },
        tsConfigFilePath: resolve(__dirname, '../tsconfig.json'),
        skipAddingFilesFromTsConfig: true
    })

    let root: string

    return {
        name: 'gen-dts',
        apply: 'build',
        enforce: 'pre',
        configResolved(config) {
            root = config.root
        },
        transform(code, id) {
            if (!code || !filter(id)) return null

            if (/\.vue(\?.*type=script.*)$/.test(id)) {
                const filePath = resolve(root, normalizePath(id.split('?')[0]))

                sourceFiles.push(
                    project.createSourceFile(filePath + (/lang.ts/.test(id) ? '.ts' : '.js'), code)
                )
            } else if (/\.ts$/.test(id)) {
                const filePath = resolve(root, normalizePath(id))

                sourceFiles.push(project.addSourceFileAtPath(filePath))
            }
        },
        async generateBundle() {
            const diagnostics = project.getPreEmitDiagnostics()

            console.log(project.formatDiagnosticsWithColorAndContext(diagnostics))

            project.emitToMemory()

            for (const sourceFile of sourceFiles) {
                const emitOutput = sourceFile.getEmitOutput()

                for (const outputFile of emitOutput.getOutputFiles()) {
                    const filePath = outputFile.getFilePath()

                    await fs.mkdir(dirname(filePath), { recursive: true })
                    await fs.writeFile(filePath, outputFile.getText(), 'utf8')
                }
            }
        }
    }
}