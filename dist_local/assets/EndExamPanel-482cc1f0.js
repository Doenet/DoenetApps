import{e as c,s as m,l as b,r as P,g as I,a as e,j as t,h as p}from"./index-99bd2cb8.js";import{creditAchievedAtom as F}from"./AssignmentViewer-ffe6937a.js";import"./RoleDropdown-408645b7.js";import"./DropdownMenu-1803f2f5.js";const C=p.div`
  border-bottom: 2px solid var(--canvastext);
  height: 2px;
  width: 230px;
`,r=p.div`
  position: absolute;
  right: 0px;
  top: 0px;
`,s=p.div`
  position: relative;
  background: var(--canvas);
  cursor: auto;
`;function B(){const h=c(m("doenetId")),a=c(m("attemptNumber")),y=c(m("itemWeights")).split(",").map(Number),[{creditByItem:g,creditForAssignment:n,creditForAttempt:u,totalPointsOrPercent:x},v]=b(F);P.useEffect(()=>{I.get("/api/loadAssessmentCreditAchieved.php",{params:{attemptNumber:a,doenetId:h,tool:"endExam"}}).then(({data:i})=>{i.success&&v({creditByItem:i.creditByItem.map(Number),creditForAssignment:Number(i.creditForAssignment),creditForAttempt:Number(i.creditForAttempt),totalPointsOrPercent:Number(i.totalPointsOrPercent)})})},[h,a]);let f=null;if(g.length>0){let i=0;n&&(i=Math.round(n*x*100)/100);let A=g.map((o,d)=>{let l;return y[d]===0?l=o===0?"Not started":o===1?"Complete":"In progress":l=(o?Math.round(o*1e3)/10:0)+"%",e(s,{children:["Item ",d+1,":"," ",t(r,{"data-test":`Item ${d+1} Credit`,children:l})]},`creditByItem${d}`)});f=e("div",{style:{leftMargin:"100px",leftPadding:"100px"},children:[e(s,{children:["Possible Points:"," ",t(r,{"data-test":"Possible Points",children:x})]}),e(s,{children:["Final Score:"," ",t(r,{"data-test":"Final Score",children:i})]}),t(C,{}),t("b",{children:"Credit For:"}),e(s,{"data-test":"Attempt Container",children:["Attempt ",a,":"," ",e(r,{"data-test":"Attempt Percent",children:[u?Math.round(u*1e3)/10:0,"%"]})]}),t("div",{style:{marginLeft:"15px"},children:A}),e(s,{children:["Assignment:"," ",e(r,{"data-test":"Assignment Percent",children:[n?Math.round(n*1e3)/10:0,"%"]})]})]})}return e("div",{style:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",justifyContent:"center",alignItems:"center",margin:"20"},children:[e("div",{style:{display:"flex",alignItems:"center"},children:[t("div",{children:t("img",{style:{width:"250px",height:"250px"},alt:"Doenet Logo",src:"/Doenet_Logo_Frontpage.png"})}),t("h1",{children:"Exam is finished"})]}),t("div",{style:{display:"flex",justifyContent:"center"},children:t("div",{style:{width:"230px",maxHeight:"340px",overflowY:"scroll"},children:f})})]})}export{B as default};
