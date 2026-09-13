export function v22FixPlugin(){
 return {
  name:'v22-fix-generated-syntax',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(!id.endsWith('/src-modern/domain/core.ts'))return null;
   const next=code.replace("[key]:edges.map(v=>Math.max(0,Number(v)||0)};return p}","[key]:edges.map(v=>Math.max(0,Number(v)||0))};return p}");
   if(next===code)throw new Error('v22 edge syntax fix did not apply');
   return next;
  }
 };
}
