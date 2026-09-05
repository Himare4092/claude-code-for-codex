// Claude can emit a result envelope on stdout even when its exit code is nonzero.
export function failureDiagnostic(stdout,stderr,fallback) {
  let detail;
  try {
    const parsed=JSON.parse(stdout);
    const result=Array.isArray(parsed)?parsed.findLast(item=>item?.type==='result'):parsed;
    if(result?.type==='result'&&result.is_error) {
      detail=typeof result.result==='string'&&result.result.trim()
        ?result.result.trim():result.errors?JSON.stringify(result.errors):undefined;
    }
  } catch { /* Fall back to stderr/exit diagnostics for non-JSON output. */ }
  const errorText=stderr?.trim();
  return ([...new Set([detail,errorText].filter(Boolean))].join('\n')||fallback).slice(0,4000);
}
