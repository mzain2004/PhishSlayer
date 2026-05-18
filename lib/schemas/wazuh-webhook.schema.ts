import { z } from 'zod'

// Wazuh rule levels are 0-16 per official Wazuh docs
const WazuhRuleSchema = z.object({
  id: z.string().max(20).regex(/^\d+$/, 'Rule ID must be numeric string'),
  level: z.number().int().min(0).max(16),
  description: z.string().min(1).max(500).transform(s => s.trim()),
  groups: z.array(z.string().max(100).regex(/^[\w.-]+$/)).max(30).optional().default([]),
  mitre: z.object({
    technique: z.array(
      z.string().regex(/^T\d{4}(\.\d{3})?$/, 'Must be valid MITRE technique ID e.g. T1566.001')
    ).max(20).optional().default([]),
    tactic: z.array(z.string().max(50)).max(10).optional().default([]),
    id: z.array(z.string()).max(20).optional().default([]),
  }).optional().default(() => ({ technique: [], tactic: [], id: [] })),
  firedtimes: z.number().int().min(0).optional(),
  mail: z.boolean().optional(),
}).strict()

const WazuhAgentSchema = z.object({
  id: z.string().max(20).regex(/^[\w-]+$/),
  name: z.string().min(1).max(100).regex(/^[\w\s.-]+$/),
  ip: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, 'Must be a valid IPv4 address').optional(),
}).strict()

const WazuhDataSchema = z.record(
  z.string().max(100),
  z.union([z.string().max(2000), z.number(), z.boolean(), z.null()])
).optional()

export const WazuhAlertSchema = z.object({
  id: z.string()
    .min(1).max(100)
    .regex(/^[\w:.-]+$/, 'Alert ID contains invalid characters'),
  rule: WazuhRuleSchema,
  agent: WazuhAgentSchema,
  manager: z.object({
    name: z.string().max(100).optional(),
  }).optional(),
  data: WazuhDataSchema,
  timestamp: z.string().datetime({ offset: true }).optional(),
  full_log: z.string().max(5000).optional(),
  location: z.string().max(200).optional(),
  decoder: z.object({
    name: z.string().max(100).optional(),
  }).optional(),
}).strict()

export type WazuhAlert = z.infer<typeof WazuhAlertSchema>
