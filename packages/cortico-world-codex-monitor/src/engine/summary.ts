import { strings } from '../strings.ts';

const risk=/失败|未通过|未完成|尚未|未运行|未验证|待验证|待测试|受阻|fail|not (?:run|test|verif|complete)|pending|blocked/i;
const segmenter=new Intl.Segmenter(undefined,{granularity:'grapheme'});
const length=(text:string)=>Array.from(text).length;

function clip(text:string,budget:number):string {
  if(length(text)<=budget)return text;
  let result='';
  for(const {segment} of segmenter.segment(text)){
    if(length(result+segment)>budget-1)break;
    result+=segment;
  }
  return result.trimEnd()+'…';
}

function plainLines(input:string):string[] {
  return input
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')
    .replace(/<oai-mem-citation>[\s\S]*?(?:<\/oai-mem-citation>|$)/g,'')
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]*\1[^\n]*(?:\n|$)|$)/gm,'')
    .replace(/[\s\S]*?/g,'')
    .replace(/^::[\w-]+\{[^\n]*$/gm,'')
    .replace(/!\[[^\]\n]*\]\((?:[^()\n]|\([^()\n]*\))*\)/g,'')
    .replace(/\[([^\]\n]+)\]\((?:[^()\n]|\([^()\n]*\))*\)/g,'$1')
    .replace(/\[([^\]\n]+)\]\[[^\]\n]*\]/g,'$1')
    .replace(/<[^>\n]*>/g,'')
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g,entity=>({ '&nbsp;':' ','&amp;':'&','&lt;':'','&gt;':'','&quot;':'"','&#39;':"'" })[entity]||'')
    .split(/\r?\n/)
    .filter(line=>!/^\s*(?:#{1,6}\s|\||[-*_]{3,}\s*$|\[[^\]]+\]:)/.test(line))
    .map(line=>line.replace(/^\s*(?:>\s*|[-*+]\s+|\d+[.)]\s+|\[[ xX]\]\s*)+/,'').replace(/[*`~]/g,'').replace(/(^|\W)_+|_+(?=\W|$)/g,'$1').replace(/\s*\|\s*/g,'，').replace(/\s+/g,' ').trim())
    .filter(line=>line && !/^https?:\/\//i.test(line));
}

function clause(line:string):string {
  return (line.match(/^.*?(?:[。！？!?]|\.(?=\s|$)|$)/)?.[0]||line)
    .replace(/[。！？!?；;.!\s]+$/u,'').trim();
}

/** A plain single sentence; budget includes its terminal punctuation and counts Unicode code points. */
export function summarizeAnswer(input:unknown,budget=50):string {
  if(typeof input!=='string' || budget<3)return '';
  const lines=plainLines(input);
  if(!lines.length)return '';
  const main=clause(lines[0]);
  const clauses=lines.flatMap(line=>line.split(/[。！？!?；;]|\.(?=\s|$)/u)).map(part=>part.trim()).filter(Boolean);
  const warning=clauses.find(part=>risk.test(part) && !main.includes(part));
  const verified=clauses.find(part=>/测试(?:已)?通过|验证通过|tests? passed|checks? passed|verified/i.test(part) && !main.includes(part));
  const secondary=warning || (verified && length(main)+length(verified)+2<=budget ? verified : undefined);
  let text=main;
  if(secondary && !risk.test(main)){
    const note=warning ? warning.split(/[，,]/u).filter(part=>risk.test(part)).map(clause).join('，') : clause(secondary);
    const noteBudget=Math.min(length(note),Math.floor((budget-2)*.6));
    text=clip(main,budget-2-noteBudget)+'；'+clip(note,noteBudget);
  }
  // Additional sentences become clauses, retaining one terminal sentence mark.
  text=text.replace(/[。！？!?]+|\.(?=\s|$)/g,'，').replace(/[，；\s]+$/u,'');
  const punctuation=/\p{Script=Han}/u.test(text)?'。':'.';
  return clip(text,budget-1)+punctuation;
}

/** Local answer retention remains separate from the brief notification text. */
export function extractConclusion(input:unknown):{summary:string;finalAnswer:string}|undefined {
  if(typeof input!=='string' || !input.trim())return;
  const finalAnswer=input.slice(0,64000)
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'')
    .replace(/<oai-mem-citation>[\s\S]*?(?:<\/oai-mem-citation>|$)/g,'')
    .replace(/\b(?:sk-[\w-]{8,}|Bearer\s+[\w.+/-]{12,})/gi,'[REDACTED]')
    .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g,'').trim();
  return {summary:summarizeAnswer(finalAnswer)||strings().statuses.unknown,finalAnswer};
}

/** Reformat even old persisted excerpts before they reach a bubble. */
export function notificationSentence(source:string,input:unknown,fallback:string):string {
  const prefix=(source==='claude'?'Claude Code':'Codex')+'：';
  return prefix+(summarizeAnswer(input,50-length(prefix))||summarizeAnswer(fallback,50-length(prefix)));
}
