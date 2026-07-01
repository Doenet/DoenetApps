import{ao as p,bn as x,r as b,j as e,bp as u,a,F as f,h as n,H as m}from"./index-5795133f.js";import{a as g}from"./index-47ca4f11.js";const h=n.aside`
  background-color: var(--canvas);
  margin: 0px 4px 12px 4px;
  padding: 1em;
  border: 2px solid var(--canvastext);
  border-top: 0px;
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  //   &: focus {
  //   outline: 2px solid var(--canvastext);
  //   outline-offset: 2px;
  //  }
`,v=n.span`
  display: block;
  margin: 12px 4px 0px 4px;
  padding: 6px;
  border: 2px solid var(--canvastext);
  border-top-left-radius: 5px;
  border-top-right-radius: 5px;
  background-color: var(--mainGray);
  &: focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 2px;
  }
`,S=p.memo(function(s){let{name:k,id:i,SVs:r,children:d,actions:t,callAction:o}=x(s),c=l=>{o({action:t.recordVisibilityChange,args:{isVisible:l}})};return b.useEffect(()=>()=>{o({action:t.recordVisibilityChange,args:{isVisible:!1}})},[]),r.hidden?null:e(u,{partialVisibility:!0,onChange:c,children:a(f,{children:[a(v,{tabIndex:"0",children:[e(m,{icon:g})," Feedback"]}),a(h,{id:i,children:[e("a",{name:i}),r.feedbackText,d]})]})})});export{S as default};
