import{ao as k,bn as y,r as R,by as B,bR as w,a as c,j as t,bI as T,h as j}from"./index-5795133f.js";const u=j.button`
  position: relative;
  height: 24px;
  display: inline-block;
  color: white;
  color: ${r=>r.disabled?"var(--canvastext)":"var(--canvas)"};
  background-color: ${r=>r.disabled?"var(--mainGray)":"var(--mainBlue)"};

  padding: 2px;
  border: none;
  border-radius: var(--mainBorderRadius);
  cursor: pointer;
  cursor: ${r=>r.disabled?"not-allowed":"pointer"};
  padding: 1px 6px 1px 6px;

  &:hover {
    background-color: ${r=>r.disabled?"var(--mainGray)":"var(--lightBlue)"};
    color: ${r=>r.disabled?"var(--canvastext)":"var(--canvas)"};
  }

  &:focus {
    outline: 2px solid var(--mainBlue);
    outline-offset: 2px;
  }
`,C=k.memo(function(p){let{name:I,id:a,SVs:e,children:d}=y(p),{location:b={},navigate:v,linkSettings:h,scrollableContainer:n}=R.useContext(B)||{},x=b.search||"";if(e.hidden)return null;let l=d;d.length===0&&(l=e.linkText);let{targetForATag:o,url:i,haveValidTarget:g,externalUri:m}=w({cid:e.cid,activityId:e.activityId,variantIndex:e.variantIndex,edit:e.edit,hash:e.hash,page:e.page,givenUri:e.uri,targetName:e.targetName,linkSettings:h,search:x,id:a});if(e.createButton)return o==="_blank"?c("span",{id:a,children:[t("a",{name:a}),t(u,{id:a+"_button",onClick:()=>window.open(i,o),disabled:e.disabled,children:e.linkText})]}):c("span",{id:a,children:[t("a",{name:a}),t(u,{id:a+"_button",onClick:()=>v(i),disabled:e.disabled,children:e.linkText})]});if(g){if(m||i==="#")return t("a",{style:{color:"var(--mainBlue)",borderRadius:"5px"},target:o,id:a,name:a,href:i,children:l});{let f=n===window?"scrollY":"scrollTop",s={fromLink:!0};return Object.defineProperty(s,"previousScrollPosition",{get:()=>n==null?void 0:n[f],enumerable:!0}),t(T,{style:{color:"var(--mainBlue)",borderRadius:"5px"},target:o,id:a,name:a,to:i,state:s,children:l})}}else return t("span",{id:a,children:l})});export{C as default};
