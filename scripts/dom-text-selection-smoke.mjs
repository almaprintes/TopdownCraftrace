import fs from 'node:fs';

const css=fs.readFileSync('src/style.css','utf8');
const fail=message=>{throw new Error(`[dom-text-selection] ${message}`);};

if(!/-webkit-user-select\s*:\s*none/.test(css))fail('iOS DOM selection guard is missing');
if(!/(^|[;{])\s*user-select\s*:\s*none/.test(css))fail('standard DOM selection guard is missing');
if(!/-webkit-touch-callout\s*:\s*none/.test(css))fail('iOS long-press callout guard is missing');
if(!css.includes('input, textarea, select, [contenteditable="true"]'))fail('editable-control exception is missing');
if(!/-webkit-user-select\s*:\s*text/.test(css))fail('editable controls must preserve text selection');
if(!/(^|[;{])\s*user-select\s*:\s*text/.test(css))fail('editable controls must preserve standard text selection');

console.log('[dom-text-selection] OK — app DOM is non-selectable while editable controls remain usable');
