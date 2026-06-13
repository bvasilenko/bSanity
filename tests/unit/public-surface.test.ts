import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const bannedPatterns = [
  new RegExp(`\\b${['pi', 'll'].join('')}(s)?\\b`, 'iu'),
  new RegExp(['Q', '5', 'L'].join(''), 'iu'),
  new RegExp(`${['projects', 'b-suite'].join('\\/')}`, 'iu'),
  new RegExp(`${['hold', 'ing'].join('')}\\/`, 'iu'),
  new RegExp(`${['frame', 'works'].join('')}\\/`, 'iu'),
  new RegExp(`${['Co', 'Authored', 'By:'].join('-')}`, 'u'),
  new RegExp('\\u2014', 'u')
]

const roots = ['README.md', 'package.json', 'src', 'functions', 'tests', 'test-fixtures']

describe('public surface', () => {
  it('avoids internal vocabulary and non-ASCII dash punctuation', () => {
    const offenders = collectFiles(roots).filter((file) => bannedPatterns.some((pattern) => pattern.test(readFileSync(file, 'utf8'))))

    expect(offenders).toEqual([])
  })
})

function collectFiles(paths: string[]): string[] {
  return paths.flatMap((path) => {
    const stat = statSync(path)

    if (stat.isFile()) {
      return [path]
    }

    return readdirSync(path).flatMap((entry) => collectFiles([join(path, entry)]))
  })
}
