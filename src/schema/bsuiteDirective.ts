import { defineField, defineType } from 'sanity'

export const bsuiteDirective = defineType({
  name: 'bsuiteDirective',
  title: 'b-suite directive',
  type: 'object',
  fields: [
    defineField({ name: 'cycleId', title: 'Cycle ID', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'contextTag', title: 'Context tag', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'directive', title: 'Directive', type: 'text', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'perBinary',
      title: 'Per binary verdicts',
      type: 'array',
      of: [
        defineField({
          name: 'binaryVerdict',
          title: 'Binary verdict',
          type: 'object',
          fields: [
            defineField({ name: 'binary', title: 'Binary', type: 'string', validation: (Rule) => Rule.required() }),
            defineField({ name: 'exitCode', title: 'Exit code', type: 'number', validation: (Rule) => Rule.required() }),
            defineField({ name: 'verdict', title: 'Verdict', type: 'string', validation: (Rule) => Rule.required() })
          ]
        })
      ],
      validation: (Rule) => Rule.required()
    }),
    defineField({ name: 'corpusProvenance', title: 'Corpus provenance', type: 'text', validation: (Rule) => Rule.required() })
  ]
})
