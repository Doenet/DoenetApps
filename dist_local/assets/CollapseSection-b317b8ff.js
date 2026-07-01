import{r as g,a as s,j as i,H as v,a$ as y,h as l}from"./index-5795133f.js";const f=l.div`
  transition: height .25s;
  border-radius: .5em;
  margin: 0px 4px 0px 4px;
  width: ${e=>e.width==="menu"?"var(--menuWidth)":""}; // Menu prop
`,w=l.div`
  font-weight: bold;
  height: 24px;
  line-height: 1.5em;
  user-select: none;
  cursor: ${e=>e.disabled?"not-allowed":"pointer"}; // Disabled prop
  overflow: auto;
  border: var(--mainBorder);
  display: block;
  text-align: center;
  background-color: var(--mainGray);
  color: var(--canvastext);
  &:focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 2px;
  }
`,S=l.div`
  padding: 1em;
  border-radius: 0 0 .5em .5em;
  border: var(--mainBorder);
  border-top: none;
  background-color: var(--canvas);
`,p=l.p` // Only visible with vertical label prop
  font-size: 14px;
  display: ${e=>e.labelVisible};
  margin-right: 5px;
  margin-bottom: ${e=>e.align=="flex"?"none":"2px"};
`;function C(e){const[t,o]=g.useState(!!e.collapsed),r=e.title?String(e.title):"Untitled Section",c=e.label?"static":"none",b=e.vertical?"static":"flex",h=e.width?e.width:null,a=e.disabled?e.disabled:null,d=e.label?e.label:null;let m=t?{display:"none"}:{display:"block"},u=t?{borderRadius:".5em"}:{borderRadius:".5em .5em 0 0"};const x={marginRight:"7px",transition:"transform .25s",transform:`${t?"":"rotate(90deg)"}`};return s(f,{width:h,children:[i(p,{labelVisible:c,align:b,children:d}),s(w,{"data-test":e.dataTest,"aria-label":r,"aria-labelledby":d,"aria-disabled":a,style:u,disabled:a,onClick:()=>{a||o(!t)},onKeyDown:n=>{a||(n.key==="Enter"||n.key==="Spacebar"||n.key===" ")&&o(!t)},tabIndex:"0",children:[i(v,{icon:y,style:x}),r]}),i(S,{style:m,children:e.children})]})}export{C};
