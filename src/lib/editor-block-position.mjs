import assert from 'node:assert/strict';
export function checkPositions(section){for(const block of [...(section.visuals||[]),...(section.images||[])])if(block.afterParagraph!==undefined)assert(Number.isInteger(block.afterParagraph)&&block.afterParagraph>=0&&block.afterParagraph<=section.paragraphs.length,'Invalid editorial block position');}
