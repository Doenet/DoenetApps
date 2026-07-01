import{r,a as y,j as c,h as u,H as w,bf as N,bg as j}from"./index-5795133f.js";const o=[8,9,10,11,12,14,18,24,30,36,48,60,72,96],E=u.div`
  display: ${e=>e.label&&!e.vertical&&"flex"};
  align-items: ${e=>e.label&&!e.vertical&&"center"};
`,F=u.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 20px;
  margin: 0;
  border-radius: 5px;
  border: ${e=>e.alert?"2px solid var(--mainRed)":"var(--mainBorder)"};
  background-color: var(--canvas);
`,O=u.div`
  position: relative;
  width: ${e=>e.width==="menu"?"var(--menuWidth)":e.width};
`,G=u.button`
  background-color: ${e=>e.disabled?"var(--mainGray)":"var(--mainBlue)"};
  border-radius: 0px 2px 2px 0px;
  height: 100%;
  padding: 8px 12px;
  color: ${e=>e.disabled?"black":"white"};
  font-size: 18px;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover {
    cursor: ${e=>e.disabled?"not-allowed":"pointer"};
    color: black;
    background-color: ${e=>e.disabled?"var(--mainGray)":"var(--lightBlue)"};
  }
  &:focus {
    z-index: 10;
    border-radius: 2px;
    outline: ${e=>e.alert?"3px solid var(--mainRed)":"3px solid var(--mainBlue)"};
    outline-offset: 2.5px;
  }
`,K=u.button`
  background-color: ${e=>e.disabled?"var(--mainGray)":"var(--mainBlue)"};
  border-radius: 2px 0px 0px 2px;
  height: 100%;
  padding: 8px 14px;
  width: 36px;
  color: ${e=>e.disabled?"black":"white"};
  font-size: 18px;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  &:hover {
    cursor: ${e=>e.disabled?"not-allowed":"pointer"};
    color: black;
    background-color: ${e=>e.disabled?"var(--mainGray)":"var(--lightBlue)"};
  }
  &:focus {
    z-index: 10;
    border-radius: 2px;
    outline: ${e=>e.alert?"3px solid var(--mainRed)":"3px solid var(--mainBlue)"};
    outline-offset: 2.5px;
  }
`,M=u.input`
  width: 70%;
  text-align: center;
  resize: none;
  cursor: ${e=>e.disabled?"not-allowed":"default"};
  outline: none;
  border: none;
  margin: 0 8px;
  &:focus {
    z-index: 10;
    border-radius: 2px;
    outline: ${e=>e.alert?"3px solid var(--mainRed)":"3px solid var(--mainBlue)"};
    outline-offset: 4px;
  }
`,S=u.span`
  font-size: 14px;
  margin-right: 5px;
`;function L(e){let x="+",m="-";(e.values||e.font)&&(m=c(w,{icon:N}),x=c(w,{icon:j}));const l=e.values||e.font&&o||[],[n,t]=r.useState(e.value||0),[d,b]=r.useState(0),$=r.useRef(null),s=r.useRef(null),B=r.useRef(null),k=r.useRef(null);r.useEffect(()=>{e.placeholder&&n===""?t(""):(e.font||!l.length)&&!n&&t(0),(l.includes(n)||typeof n=="number")&&e.onChange&&e.onChange(n)},[n]),r.useEffect(()=>{e.value!==void 0?t(e.value):e.min!==void 0?t(e.min):e.max!==void 0?t(e.max):e.font?t(o[4]):e.values!==void 0?t(e.values[0]):e.placeholder?t(""):t(0),e.value&&e.values&&b(e.values.indexOf(e.value))},[e.value]);const C=()=>{if(s.current&&s.current.focus(),l.length&&d<=l.length-1){if(d==l.length-1)return;t(l[d+1]),b(d+1)}else(e.max===void 0||e.max!==void 0&&n<e.max)&&t(e.placeholder&&!n?1:parseInt(n)+1)},R=()=>{if(s.current&&s.current.focus(),l.length&&d>=0){if(d==0)return;t(l[d-1]),b(d-1)}else(e.min===void 0||e.min!==void 0&&n>e.min)&&t(e.placeholder&&!n?-1:parseInt(n)-1)},D=(a,i)=>{if(a===null)return-1;let v=0,g=isNaN(i)?Math.abs(a[0].charCodeAt(0)-i.charCodeAt(0)):Math.abs(a[0]-parseInt(i));for(let f=1;f<a.length;f++){let I=isNaN(i)?Math.abs(a[f].charCodeAt(0)-i.charCodeAt(0)):Math.abs(a[f]-parseInt(i));I<g&&(g=I,v=f)}return v},A=()=>{if(!e.font&&l.length){let i=D(l,n);b(i),t(l[i]);return}let a=parseInt(n[0]=="0"?parseInt(n.substring(1)):parseInt(n));e.min!==void 0&&a<e.min?a=e.min:e.max!==void 0&&a>e.max?a=e.max:e.font&&(a<o[0]?a=o[0]:a>o[o.length-1]&&(a=o[o.length-1])),t(a)},T=a=>{const i=a.currentTarget;requestAnimationFrame(()=>{i.contains(document.activeElement)||e.onBlur&&e.onBlur(isNaN(n)?n:parseInt(n))})},z=a=>{e.onKeyDown(a),a.key==="Enter"&&s.current&&s.current.blur()};let h="210px";return e.width&&(h=e.width),y(E,{label:e.label,vertical:e.vertical,children:[e.label&&c(S,{id:"increment-label",children:e.label}),e.label&&e.vertical&&c("br",{}),c(O,{width:h,children:y(F,{ref:k,onBlur:T,alert:e.alert,children:[c(K,{"aria-label":"Decrease","aria-labelledby":"increment-label","aria-disabled":!!e.disabled,ref:B,alert:e.alert,disabled:e.disabled,onClick:R,"data-test":`Decrement ${e.dataTest}`,children:m}),c(M,{"aria-labelledby":"increment-label","aria-haspopup":"true","aria-disabled":!!e.disabled,placeholder:e.placeholder,value:n,"data-test":e.dataTest,ref:s,alert:e.alert,disabled:!!e.disabled,onChange:a=>t(a.target.value),onBlur:A,onKeyDown:e.onKeyDown&&z}),c(G,{alert:e.alert,ref:$,disabled:e.disabled,onClick:C,"aria-labelledby":"increment-label","aria-label":"Increase","aria-disabled":!!e.disabled,"data-test":`Increment ${e.dataTest}`,children:x})]})})]})}export{L as I};
