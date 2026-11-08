(()=>{
"use strict";
const toggle=document.getElementById("menuToggle");
const panel=document.getElementById("mobileNav");
if(toggle&&panel){
 const close=()=>{panel.classList.remove("is-open");toggle.setAttribute("aria-expanded","false");toggle.setAttribute("aria-label","Abrir menú");};
 toggle.addEventListener("click",()=>{
  const open=!panel.classList.contains("is-open");
  panel.classList.toggle("is-open",open);
  toggle.setAttribute("aria-expanded",String(open));
  toggle.setAttribute("aria-label",open?"Cerrar menú":"Abrir menú");
  toggle.textContent=open?"✕":"☰";
 });
 panel.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
  close();toggle.textContent="☰";
 }));
 window.addEventListener("keydown",ev=>{if(ev.key==="Escape"){close();toggle.textContent="☰";}});
 window.addEventListener("resize",()=>{if(innerWidth>800){close();toggle.textContent="☰";}});
}
document.querySelectorAll("[data-year]").forEach(node=>node.textContent=String(new Date().getFullYear()));
const reveal=[...document.querySelectorAll(".reveal")];
if("IntersectionObserver" in window&&!(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)){
 document.documentElement.classList.add("js-animations");
 const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("is-visible");observer.unobserve(entry.target);}});
 },{threshold:.07,rootMargin:"0px 0px -16px 0px"});
 reveal.forEach(node=>observer.observe(node));
}else reveal.forEach(node=>node.classList.add("is-visible"));
})();