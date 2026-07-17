import{ao as y,bn as A,a as r,j as a,H as s,bs as x,$ as v,aP as w,bt as L,F as m,h as S}from"./index-ff2008c3.js";const l=S.button`
  position: relative;
  height: 24px;
  display: inline-block;
  color: white;
  background-color: var(--mainBlue);
  padding: 2px;
  /* border: var(--mainBorder); */
  border: none;
  border-radius: var(--mainBorderRadius);
  margin: 0px 4px 4px 0px;

  &:hover {
    background-color: var(--lightBlue);
    color: black;
  }
`,P=y.memo(function(g){let{name:R,id:i,SVs:e,actions:u,children:C,callAction:p}=A(g);if(e.hidden)return null;let h=e.disabled,c=()=>p({action:u.submitAnswer});e.submitAllAnswersAtAncestor&&(c=()=>p({action:u.submitAllAnswers}));let d=null;if(e.inputChildren.length>0){let o=e.inputChildren.map(t=>t.componentName);d=C.filter(t=>t&&typeof t!="string"&&o.includes(t.props.componentInstructions.componentName))}if(!e.delegateCheckWork&&!e.suppressCheckwork){let o="unvalidated";(e.justSubmitted||e.numAttemptsLeft<1)&&(e.creditAchieved===1?o="correct":e.creditAchieved===0?o="incorrect":o="partialcorrect");let t={cursor:"pointer",padding:"1px 6px 1px 6px"};h&&(t.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue("--mainGray"));let f=e.submitLabel;e.showCorrectness||(f=e.submitLabelNoCorrectness);let n=r(l,{id:i+"_submit",tabIndex:"0",disabled:h,style:t,onClick:c,onKeyPress:b=>{b.key==="Enter"&&c()},children:[a(s,{style:{},icon:x,transform:{rotate:90}})," ",f]});if(e.showCorrectness){if(o==="correct")t.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue("--mainGreen"),n=r(l,{id:i+"_correct",style:t,children:[a(s,{icon:v}),"  Correct"]});else if(o==="incorrect")t.backgroundColor=getComputedStyle(document.documentElement).getPropertyValue("--mainRed"),n=r(l,{id:i+"_incorrect",style:t,children:[a(s,{icon:w}),"  Incorrect"]});else if(o==="partialcorrect"){t.backgroundColor="#efab34";let k=`${Math.round(e.creditAchieved*100)}% Correct`;n=a(l,{id:i+"_partial",style:t,children:k})}}else o!=="unvalidated"&&(t.backgroundColor="rgb(74, 3, 217)",n=r(l,{id:i+"_saved",style:t,children:[a(s,{icon:L}),"  Response Saved"]}));return e.numAttemptsLeft<0?n=r(m,{children:[n,a("span",{children:"(no attempts remaining)"})]}):e.numAttemptsLeft==1?n=r(m,{children:[n,a("span",{children:"(1 attempt remaining)"})]}):Number.isFinite(e.numAttemptsLeft)&&(n=r(m,{children:[n,r("span",{children:["(",e.numAttemptsLeft," attempts remaining)"]})]})),r("span",{id:i,style:{marginBottom:"4px"},children:[a("a",{name:i}),d,n]})}else return r("span",{id:i,style:{marginBottom:"4px"},children:[a("a",{name:i}),d]})});export{P as default};
