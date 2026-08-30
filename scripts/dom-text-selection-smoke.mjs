import fs from 'node:fs';

const css=fs.readFileSync('src/style.css','utf8');
const fail=message=>{throw new Error(`[dom-text-selection] ${message}`);};

if(!css.includes('-webkit-user-select: none;'))fail('iOS DOM selection guard is missing');
if(!css.includes('user-select: none;'))fail('standard DOM selection guard is missing');
if(!css.includes('-webkit-touch-callout: none;'))fail('iOS long-press callout guard is missing');
if(!css.includes('input, textarea, select, [contenteditable="true"]'))fail('editable-control exception is missing');
if(!css.includes('-webkit-user-select: text;'))fail('editable controls must preserve text selection');
if(!css.includes('user-select: text;'))fail('editable controls must preserve standard text selection');

console.log('[dom-text-selection] OK — app DOM is non-selectable while editable controls remain usable');
