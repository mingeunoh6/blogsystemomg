//articleShema.ts

import { z } from "zod";

// 1) Zod 스키마 정의 (discriminated union)
const TitleBlock = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "6자리 알파벳/숫자 조합이어야 합니다"),
  type: z.literal("title"),
  content: z.string(),
  level: z.number().int().min(1).max(4),
});

const BodyBlock = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/, "6자리 알파벳/숫자 조합이어야 합니다"),
  type: z.literal("body"),
  content: z.string(),
});

const Block = z.discriminatedUnion("type", [TitleBlock, BodyBlock]);

const EditorDocument = z.object({
  title: z.string(),
  blocks: z.array(Block).min(1),
});

export { TitleBlock, BodyBlock, Block, EditorDocument };
