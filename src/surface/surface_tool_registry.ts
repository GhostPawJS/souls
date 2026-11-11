import { inspectSoulsItemToolSurface } from '../tools/inspect_souls_item_tool.ts';
import { levelUpSoulToolSurface } from '../tools/level_up_soul_tool.ts';
import { manageSoulToolSurface } from '../tools/manage_soul_tool.ts';
import { observeSoulToolSurface } from '../tools/observe_soul_tool.ts';
import { refineSoulToolSurface } from '../tools/refine_soul_tool.ts';
import { reviewSoulsToolSurface } from '../tools/review_souls_tool.ts';
import { reviewTracesToolSurface } from '../tools/review_traces_tool.ts';
import { searchSoulsToolSurface } from '../tools/search_souls_tool.ts';
import { traceSoulToolSurface } from '../tools/trace_soul_tool.ts';
export const surfaceToolRegistry = [
	searchSoulsToolSurface,
	reviewSoulsToolSurface,
	inspectSoulsItemToolSurface,
	observeSoulToolSurface,
	refineSoulToolSurface,
	levelUpSoulToolSurface,
	manageSoulToolSurface,
	traceSoulToolSurface,
	reviewTracesToolSurface,
];
