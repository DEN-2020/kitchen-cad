import { useLayoutEffect } from 'react';
/** Keep the app inside the actually visible mobile viewport, including browser chrome changes. */
export function useViewport(){
  useLayoutEffect(()=>{let frame=0;const viewport=window.visualViewport;
    const apply=()=>{if(viewport&&Math.abs(viewport.scale-1)>.01)return;const height=viewport?.height??window.innerHeight;document.documentElement.style.setProperty('--app-height',`${Math.round(height)}px`);document.documentElement.style.setProperty('--app-top',`${Math.round(viewport?.offsetTop??0)}px`)};
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(apply)};apply();viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);window.addEventListener('resize',schedule);
    return()=>{cancelAnimationFrame(frame);viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)};
  },[])
}
