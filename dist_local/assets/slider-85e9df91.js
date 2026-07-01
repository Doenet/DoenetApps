import{ao as ae,bn as ne,r as L,R as re,bu as ie,a as T,j as n,h as z,aR as U,bo as J,bq as se}from"./index-5795133f.js";import{A as K}from"./ActionButtonGroup-a37e0812.js";let A=(l,u)=>se.round_numbers_to_decimals(l,u).tree;const q=z.div`
  width: fit-content;
  height: ${l=>l.labeled&&l.noTicked?"60px":l.labeled?"80px":l.noTicked?"40px":"60px"};
  margin-bottom: 12px;
  &:focus {
    outline: 0;
  }
`,Q=z.div`
  padding-top: 10px;
  height: 50px;
`,Y=z.div`
  position: relative;
  border-radius: 3px;
  background-color: var(--canvastext);
  height: 2px;
  width: ${l=>l.width};
  user-select: none;
`,j=z.p`
  display: inline;
  user-select: none;
`,Z=z.div`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  position: relative;
  top: -4px;
  opacity: 1;
  background: ${l=>l.disabled?"var(--mainGray)":"var(--mainBlue)"}; // var(--mainBlue)?
  cursor: pointer;
`,D=z.div`
  position: absolute;
  border-left: 2px solid var(--mainGray);
  height: 10px;
  top: 1px;
  z-index: -2;
  left: ${l=>l.x};
  user-select: none;
`,$=z.p`
  position: absolute;
  left: ${l=>l.x};
  color: var(--canvastext);
  font-size: 12px;
  top: 1px;
  user-select: none;
`;function _(l,u,p,t){let e,i=Math.max(Math.abs(t.firstItem),Math.abs(t.lastItem)),m=Math.round(Math.log(i)/Math.log(10));i===0&&(m=1);let C=5-m;if(l.length===0){let r=[A(t.firstItem,C),A(t.lastItem,C)],a=Math.min(t.numItems,100),h=Math.floor(t.numItems/a);for(let d=1;d<a;d++)r.push(A(t.from+t.step*d*h,C));e=V(r)}else{let r=l.map(a=>A(a,C));e=V(r)}const v=t.numItems;if(t.width.size>e*v)if(l.length===0){let r=[],a=[],h=Math.max(Math.abs(t.firstItem),Math.abs(t.lastItem)),d=Math.round(Math.log(h)/Math.log(10));h===0&&(d=1);let y=5-d;for(let b=0;b<t.numItems;b++){let I=A(t.from+t.step*b,y);r.push(n(D,{x:`${b*u}px`},I)),a.push(n($,{x:`${b*u-3}px`,children:I},I))}return[r,a]}else return[l.map((r,a)=>n(D,{x:`${a*u}px`},r)),l.map((r,a)=>n($,{x:`${a*u-3}px`,children:r},r))];else if(t.width.size<e){let r=[...l];if(l.length===0)for(let a=0;a<Math.min(3,t.numItems);a++)r.push(t.from+t.step*a);return[r.map((a,h)=>h==0?n(D,{x:`${h*u}px`},a):""),r.map((a,h)=>{if(h==0)return n($,{x:`${h*u-3}px`,children:a},a);if(h==2)return n($,{x:`${h*u-3}px`,children:"..."},a)})]}else if(t.width.size<e*v){let r,a;if(l.length===0){let h=Math.floor(t.width.size/e),d=t.lastItem-t.firstItem,y=d/(h+1),b=Math.max(Math.abs(t.firstItem),Math.abs(t.lastItem)),I=Math.round(Math.log(b)/Math.log(10)),w=1-I,x=Math.max(A(y,w),10**-w),M=Math.floor(d/x)+1,k=5-I;a=[...Array(M).keys()].map(O=>t.from+x*O),r=a.map(O=>Math.round((O-t.from)/t.step)),a=a.map(O=>A(O,k))}else{let h=Math.max(2,Math.floor(t.width.size/e)),d=Math.ceil((t.numItems-1)/(h-1)-1e-10),y=Math.floor((t.numItems-1)/d+1e-10)+1;r=[...Array(y).keys()].map(x=>Math.round(d*x));let b=Math.max(Math.abs(t.firstItem),Math.abs(t.lastItem)),w=2-Math.round(Math.log(b)/Math.log(10));a=r.map(x=>A(l[x],w))}return[r.map((h,d)=>n(D,{x:`${h*u}px`},a[d])),r.map((h,d)=>n($,{x:`${h*u}px`,children:a[d]},a[d]))]}else return[l.map(r=>n(D,{x:`${(r-p)*u}px`},r)),l.map(r=>n($,{x:`${(r-p)*u-3}px`,children:r},r))]}function V(l){return l.reduce(function(p,t){return p>t.toString().length?p:t.toString().length})*12}function S(l,u,p){let t=V(l);const e=Object.keys(l).length;if(p.width.size>t*e)return[l.map((i,m)=>n(D,{x:`${m*u}px`},i)),l.map((i,m)=>n($,{x:`${m*u-3}px`,children:i},i))];if(p.width.size<t)return[l.map((i,m)=>m==0?n(D,{x:`${m*u}px`},i):""),l.map((i,m)=>{if(m==0)return n($,{x:`${m*u-3}px`,children:i},i);if(m==2)return n($,{x:`${m*u-3}px`,children:"..."},i)})];if(p.width.size<t*e)return[l.map((i,m)=>n(D,{x:`${m*u}px`},i)),l.map((i,m)=>m==0||e===m+1?n($,{x:`${m*u-3}px`,children:i},i):n($,{x:`${m*u-3}px`,children:i.length<3?i:i.substr(0,3)+"..."},i))]}function ee(l,u,p){return p+l/u}function F(l,u,p){let t=Math.max(0,Math.min(p.numItems-1,Math.round(l-p.firstItem))),e;return u.length===0?e=p.from+p.step*t:e=u[t],[e,t]}const ce=ae.memo(function l(u){let{name:p,id:t,SVs:e,actions:i,ignoreUpdate:m,rendererName:C,callAction:v}=ne(u);l.baseStateVariable="index";const r=L.useRef(null),a=re(ie(C)),[h,d]=L.useState(0),y=L.useRef(!1),[b,I]=L.useState(0),w=e.type==="text"?0:e.firstItem;let x=e.width.size/(e.numItems-1);const[M,k]=L.useState(0);if(L.useEffect(()=>{if(r.current){const c=r.current.getBoundingClientRect();I(c.left)}},[]),L.useEffect(()=>{!y.current&&!m&&(k(e.index),e.type!=="text"?d(e.index/(e.numItems-1)*e.width.size):d(e.index*x))},[e.index]),e.hidden)return null;if(e.disabled){let c="";e.showControls?c=T(K,{style:{marginBottom:"12px"},children:[n(U,{value:"Prev",onClick:g=>P(),disabled:!0}),n(U,{value:"Next",onClick:g=>X(),disabled:!0})]}):c=null;let s="";e.type==="text"?s=S(e.items,x,e):s=_(e.items,x,w,e);let f="";e.showTicks===!1?f=null:f=s;let o=null;if(e.label){let g=e.label;e.labelHasLatex&&(g=n(J.MathJax,{hideUntilTypeset:"first",inline:!0,dynamic:!0,children:g})),e.showValue?o=T(j,{children:[g," = "+e.valueForDisplay]}):o=n(j,{children:g})}else!e.label&&e.showValue?o=n(j,{children:e.valueForDisplay}):o=null;return T(q,{labeled:e.showControls||e.label,noTicked:e.showTicks===!1,ref:r,children:[n("div",{id:`${t}-label`,style:{height:e.label||e.showValue?"20px":"0px"},children:o}),n(Q,{children:T(Y,{width:`${e.width.size}px`,id:t,children:[n(Z,{disabled:!0,style:{left:`${h-4}px`},id:`${t}-handle`}),f]})}),n("div",{style:{height:e.showControls?"20px":"0px"},children:c})]})}function O(c){if(y.current=!0,document.addEventListener("mousemove",G),document.addEventListener("mouseup",W),d(c.nativeEvent.clientX-b),e.type!=="text"){let s=ee(c.nativeEvent.clientX-b,x,w),f=F(s,e.items,e);k(f[1]),a(o=>{let g={...o};return g.ignoreUpdate=!0,g}),v({action:i.changeValue,args:{value:f[0],transient:!0},baseVariableValue:f[1]})}else{let s=Math.round((c.nativeEvent.clientX-b)/x);k(s),a(f=>{let o={...f};return o.ignoreUpdate=!0,o}),v({action:i.changeValue,args:{value:e.items[s],transient:!0},baseVariableValue:s})}}function W(c){if(document.removeEventListener("mousemove",G),document.removeEventListener("mouseup",W),!!y.current)if(y.current=!1,e.type!=="text"){let f=function(g,R,le){return le+g/R}(c.clientX-b,x,w),o=F(f,e.items,e);k(o[1]),d(o[1]*x),a(g=>{let R={...g};return R.ignoreUpdate=!0,R}),v({action:i.changeValue,args:{value:o[0]},baseVariableValue:o[1]})}else{let s=Math.round((c.clientX-b)/x);s=Math.max(0,Math.min(e.numItems-1,s)),k(s),d(s*x),a(f=>{let o={...f};return o.ignoreUpdate=!0,o}),v({action:i.changeValue,args:{value:e.items[s]},baseVariableValue:s})}}function G(c){if(y.current)if(d(Math.max(0,Math.min(e.width.size,c.clientX-b))),e.type!=="text"){let s=ee(c.clientX-b,x,w),f=F(s,e.items,e);k(f[1]),a(o=>{let g={...o};return g.ignoreUpdate=!0,g}),v({action:i.changeValue,args:{value:f[0],transient:!0,skippable:!0},baseVariableValue:f[1]})}else{let s=Math.round((c.clientX-b)/x);k(s),a(f=>{let o={...f};return o.ignoreUpdate=!0,o}),v({action:i.changeValue,args:{value:e.items[s],transient:!0,skippable:!0},baseVariableValue:s})}}function X(c){if(M===e.numItems-1)return;let s;e.items.length===0?s=e.from+e.step*(M+1):s=e.items[M+1],a(f=>{let o={...f};return o.ignoreUpdate=!0,o}),v({action:i.changeValue,args:{value:s},baseVariableValue:M+1}),k(M+1)}function P(c){if(M===0)return;let s;e.items.length===0?s=e.from+e.step*(M-1):s=e.items[M-1],a(f=>{let o={...f};return o.ignoreUpdate=!0,o}),v({action:i.changeValue,args:{value:s},baseVariableValue:M-1}),k(M-1)}function te(c){if(c.key==="ArrowLeft")return P();if(c.key==="ArrowRight")return X()}let B="";e.type==="text"?B=S(e.items,x,e):B=_(e.items,x,w,e);let N="";e.showTicks===!1?N=null:N=B;let H="";e.showControls&&(H=T(K,{style:{marginBottom:"12px"},children:[n(U,{value:"Prev",onClick:c=>P(),id:`${t}-prevbutton`}),n(U,{value:"Next",onClick:c=>X(),id:`${t}-nextbutton`})]})),e.showValue&&(h-4,e.valueForDisplay);let E=null;if(e.label){let c=e.label;e.labelHasLatex&&(c=n(J.MathJax,{hideUntilTypeset:"first",inline:!0,dynamic:!0,children:c})),e.showValue?E=T(j,{children:[c," = "+e.valueForDisplay]}):E=n(j,{children:c})}else!e.label&&e.showValue?E=n(j,{children:e.valueForDisplay}):E=null;return T(q,{ref:r,labeled:e.showControls||e.label,noTicked:e.showTicks===!1,onKeyDown:te,tabIndex:"0",children:[n("div",{id:`${t}-label`,style:{height:e.label||e.showValue?"20px":"0px"},children:E}),n(Q,{onMouseDown:O,children:T(Y,{width:`${e.width.size}px`,id:t,children:[n(Z,{style:{left:`${h-4}px`},id:`${t}-handle`}),N]})}),n("div",{style:{height:e.showControls?"20px":"0px"},children:H})]})});export{ce as default};
