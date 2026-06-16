import { z } from "zod";

export const bmcBlockIds = [
  "customerSegments",
  "valuePropositions",
  "channels",
  "customerRelationships",
  "revenueStreams",
  "keyResources",
  "keyActivities",
  "keyPartners",
  "costStructure",
] as const;

export type BmcBlockId = (typeof bmcBlockIds)[number];

export type BmcBlocks = Record<BmcBlockId, string>;

export const bmcBlocksSchema = z.object({
  customerSegments: z.string(),
  valuePropositions: z.string(),
  channels: z.string(),
  customerRelationships: z.string(),
  revenueStreams: z.string(),
  keyResources: z.string(),
  keyActivities: z.string(),
  keyPartners: z.string(),
  costStructure: z.string(),
});

export const BMC_BLOCKS: Array<{
  id: BmcBlockId;
  order: number;
  code: string;
  titleKey: string;
  gridClass: string;
}> = [
  { id: "keyPartners", order: 8, code: "KP", titleKey: "bmc.blocks.keyPartners", gridClass: "row-span-2 col-start-1 row-start-1" },
  { id: "keyActivities", order: 7, code: "KA", titleKey: "bmc.blocks.keyActivities", gridClass: "col-start-2 row-start-1" },
  { id: "keyResources", order: 6, code: "KR", titleKey: "bmc.blocks.keyResources", gridClass: "col-start-2 row-start-2" },
  { id: "valuePropositions", order: 2, code: "VP", titleKey: "bmc.blocks.valuePropositions", gridClass: "row-span-2 col-start-3 row-start-1" },
  { id: "customerRelationships", order: 4, code: "CR", titleKey: "bmc.blocks.customerRelationships", gridClass: "col-start-4 row-start-1" },
  { id: "channels", order: 3, code: "CH", titleKey: "bmc.blocks.channels", gridClass: "col-start-4 row-start-2" },
  { id: "customerSegments", order: 1, code: "CS", titleKey: "bmc.blocks.customerSegments", gridClass: "row-span-2 col-start-5 row-start-1" },
  { id: "costStructure", order: 9, code: "C$", titleKey: "bmc.blocks.costStructure", gridClass: "col-span-3 col-start-1 row-start-3" },
  { id: "revenueStreams", order: 5, code: "R$", titleKey: "bmc.blocks.revenueStreams", gridClass: "col-span-2 col-start-4 row-start-3" },
];

export const BMC_GENERATION_PROMPT =
  "أنشئ نموذج العمل التجاري BMC بكل الكتل التسع بالترتيب: شرائح العملاء، القيم المقترحة، القنوات، العلاقات مع العملاء، مصادر الإيرادات، الموارد الرئيسية، الأنشطة الرئيسية، الشراكات الرئيسية، هيكل التكاليف. املأ كل كتلة بفقرات عملية ومختصرة.";
