import test from 'ava'
import {JSONSchema4} from 'json-schema'
import {cloneDeep} from 'lodash'
import {compile} from '../src'

export function run() {
  const SCHEMA: JSONSchema4 = {
    type: 'object',
    properties: {
      firstName: {
        type: 'string',
      },
    },
    required: ['firstName'],
  }

  test('compile() should not mutate its input', async t => {
    const before = cloneDeep(SCHEMA)
    await compile(SCHEMA, 'A')
    t.deepEqual(before, SCHEMA)
  })

  test('compile() should be idempotent', async t => {
    const a = await compile(SCHEMA, 'A')
    const b = await compile(SCHEMA, 'A')
    t.deepEqual(a, b)
  })

  test('compile() should not duplicate named refs when property descriptions differ', async t => {
    const output = await compile(
      {
        title: 'Offer',
        description: 'An offer',
        type: 'object',
        properties: {
          price: {
            description: 'Price excl. VAT',
            $ref: '#/definitions/Price',
          },
          priceInclVAT: {
            description: 'Price incl. VAT',
            $ref: '#/definitions/Price',
          },
        },
        definitions: {
          Price: {
            title: 'Price',
            description: 'A price',
            type: 'object',
            properties: {
              value: {
                description: 'Price as number',
                type: 'number',
              },
              text: {
                description: 'Price as string',
                type: 'string',
              },
            },
          },
        },
      },
      'Offer',
    )

    t.false(output.includes('interface Price1'))
    t.true(output.includes('price?: Price;'))
    t.true(output.includes('priceInclVAT?: Price;'))
    t.true(output.includes('Price excl. VAT'))
    t.true(output.includes('Price incl. VAT'))
    t.true(output.includes('A price'))
  })

  test('compile() should not duplicate shared defs across anyOf branches', async t => {
    const output = await compile(
      {
        title: 'AnyOfSharedDef',
        anyOf: [
          {
            type: 'object',
            properties: {
              foo: {
                description: 'Common value used by the foo branch',
                $ref: '#/$defs/CommonValue',
              },
            },
          },
          {
            type: 'object',
            properties: {
              bar: {
                description: 'Common value used by the bar branch',
                $ref: '#/$defs/CommonValue',
              },
            },
          },
        ],
        $defs: {
          CommonValue: {
            title: 'CommonValue',
            description: 'Shared value',
            type: 'object',
            properties: {
              value: {
                description: 'Common value',
                type: 'string',
              },
            },
          },
        },
      },
      'AnyOfSharedDef',
    )

    t.false(output.includes('interface CommonValue1'))
    t.true(output.includes('foo?: CommonValue;'))
    t.true(output.includes('bar?: CommonValue;'))
    t.true(output.includes('Common value used by the foo branch'))
    t.true(output.includes('Common value used by the bar branch'))
    t.true(output.includes('Shared value'))
  })

  test('compile() should not duplicate shared primitive defs across anyOf branches', async t => {
    const output = await compile(
      {
        title: 'AnyOfSharedPrimitive',
        anyOf: [
          {
            type: 'object',
            properties: {
              foo: {
                description: 'Common value used by the foo branch',
                $ref: '#/$defs/CommonValue',
              },
            },
          },
          {
            type: 'object',
            properties: {
              bar: {
                description: 'Common value used by the bar branch',
                $ref: '#/$defs/CommonValue',
              },
            },
          },
        ],
        $defs: {
          CommonValue: {
            title: 'CommonValue',
            description: 'Shared value',
            type: 'string',
          },
        },
      },
      'AnyOfSharedPrimitive',
    )

    t.false(output.includes('type CommonValue1'))
    t.true(output.includes('foo?: CommonValue;'))
    t.true(output.includes('bar?: CommonValue;'))
    t.true(output.includes('Common value used by the foo branch'))
    t.true(output.includes('Common value used by the bar branch'))
    t.true(output.includes('export type CommonValue = string;'))
  })
}
