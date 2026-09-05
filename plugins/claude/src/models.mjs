const family = '(opus|sonnet|haiku|fable)';
const namedModel = new RegExp(`^(?:claude[ -]+)?${family}[ -]*(\\d+(?:[.-]\\d+)*)(\\[1m\\])?$`, 'i');

export function normalizeModel(value) {
  if(value===undefined)return undefined;
  if(typeof value!=='string')throw new Error('Model must be a string');
  const name=value.trim();
  const match=namedModel.exec(name);
  if(match)return `claude-${match[1].toLowerCase()}-${match[2].replaceAll('.','-')}${match[3]?.toLowerCase()||''}`;
  if(!name || name.length>150 || !/^[a-zA-Z0-9][a-zA-Z0-9._:/\[\]-]*$/.test(name)) {
    throw new Error('Invalid model. Use a Claude model ID or a name such as Opus 5 or Fable 5.1.');
  }
  return /^(opus|sonnet|haiku|fable)$/i.test(name)?name.toLowerCase():name;
}

// Consume only a recognized family + version, leaving task text untouched.
export function readModel(tokens,index) {
  let value=tokens[index];
  if(/^claude$/i.test(value) && /^(opus|sonnet|haiku|fable)$/i.test(tokens[index+1]||''))value+=` ${tokens[++index]}`;
  if(/^(?:claude[ -]+)?(opus|sonnet|haiku|fable)$/i.test(value) && /^\d+(?:[.-]\d+)*(?:\[1m\])?$/i.test(tokens[index+1]||''))value+=` ${tokens[++index]}`;
  return {model:normalizeModel(value),lastIndex:index};
}

export function modelConfirmation(request) {
  const model=normalizeModel(request.model);
  if(!model || !/(?:^|[^a-z])fable(?:$|[^a-z])/i.test(model) || request.confirmFable===true)return null;
  return {
    state:'confirmation_required',code:'FABLE_CONFIRMATION_REQUIRED',model,
    warning:'FableシリーズはClaude Max等の対象プラン、または利用クレジットが必要です。Pro等では利用クレジットを消費し、APIでは従量課金になります。利用条件とクレジット消費の可能性を了承して実行しますか？',
    instructions:'Wait for explicit user consent for this request, then retry with confirmFable:true. A user-provided -y or -yes flag also counts as consent. Do not set consent automatically or infer it from task text.',
  };
}
