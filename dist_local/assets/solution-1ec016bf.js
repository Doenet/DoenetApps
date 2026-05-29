import{ao as y,bn as h,r as S,j as t,bp as k,a as x,h as v,H as u,bS as b}from"./index-99bd2cb8.js";const R=v.span`
  // display: block;
  // margin: SVs.open ? 12px 4px 0px 4px : 12px 4px 12px 4px;
  // padding: 6px;
  // border: 2px solid black;
  // border-top-left-radius: 5px;
  // border-top-right-radius: 5px;
  // border-bottom-left-radius: SVs.open ? 0px : 5px;
  // border-bottom-right-radius: SVs.open ? 0px : 5px;
  // background-color: var(--mainGray);
  // cursor: pointer;
  &: focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 2px;
  }
`,T=y.memo(function(g){let{name:V,id:a,SVs:o,children:f,actions:e,callAction:i}=h(g),m=n=>{i({action:e.recordVisibilityChange,args:{isVisible:n}})};S.useEffect(()=>()=>{i({action:e.recordVisibilityChange,args:{isVisible:!1}})},[]);let l="open";if(o.hidden)return null;let s,d=null,c={display:"none"},r,p;return o.open?(s=t(u,{icon:b}),l="close",d=f,c={display:"block",margin:"0px 4px 12px 4px",padding:"6px",border:"2px solid var(--canvastext)",borderTop:"0px",borderBottomLeftRadius:"5px",borderBottomRightRadius:"5px",backgroundColor:"var(--canvas)"},p=n=>{n.key==="Enter"&&i({action:e.closeSolution})},o.canBeClosed?r=()=>{i({action:e.closeSolution})}:r=()=>{}):(s=t(u,{icon:b,rotation:90}),r=()=>{i({action:e.revealSolution})},p=n=>{n.key==="Enter"&&i({action:e.revealSolution})}),t(k,{partialVisibility:!0,onChange:m,children:x("aside",{id:a,style:{margin:"12px 0"},children:[t("a",{name:a}),x(R,{style:{display:"block",margin:o.open?"12px 4px 0px 4px":"12px 4px 12px 4px",padding:"6px",border:"2px solid var(--canvastext)",borderTopLeftRadius:"5px",borderTopRightRadius:"5px",borderBottomLeftRadius:o.open?"0px":"5px",borderBottomRightRadius:o.open?"0px":"5px",backgroundColor:"var(--mainGray)",cursor:"pointer"},tabIndex:"0",id:a+"_button",onClick:r,onKeyDown:p,children:[s," ",o.sectionName," ",o.message," (click to ",l,")"]}),t("span",{style:c,children:d})]})})});export{T as default};
