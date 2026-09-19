export function hingeCountForHeight(height,override){
 const h=Math.max(0,Number(height)||0),o=Number(override);
 if(Number.isFinite(o)&&o>=1)return Math.max(1,Math.min(6,Math.round(o)));
 if(h<=900)return 2;
 if(h<=1500)return 3;
 if(h<=2100)return 4;
 return 5;
}
export function hingePositionsForHeight(height,count){
 const h=Math.max(1,Number(height)||1),n=Math.max(1,Math.round(Number(count)||1)),edge=Math.min(110,Math.max(70,Math.round(h*.12/5)*5));
 if(n===1)return[h/2];
 const usable=Math.max(0,h-2*edge),step=n>1?usable/(n-1):0;
 return Array.from({length:n},(_,i)=>edge+i*step);
}
