import{j as a,a as d,h as C,R as x,p,e as b,s as k,f as w,y as A,b as P,c as T,r as D,G,H as s,I,J as S,K as R,L as h}from"./index-99bd2cb8.js";import{N}from"./Next7Days-f8e49768.js";import{e as V}from"./RoleDropdown-408645b7.js";import"./CourseToolHandler-76119d98.js";import"./index-47ca4f11.js";import"./index.esm-4891ebcb.js";/* empty css             */import"./DropdownMenu-1803f2f5.js";const _=C.button`
  background-image: linear-gradient(
    to bottom left,
    var(--canvas),
    var(--canvas),
    var(--canvas),
    var(--solidLightBlue)
  );
  border-radius: 5px;
  width: 190px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--canvastext);
  border: 2px solid
    ${e=>e.alert?"var(--mainRed)":e.disabled?"var(--mainGray)":"var(--canvastext)"};
  cursor: ${e=>e.disabled?"not-allowed":"pointer"};

  &:focus {
    outline: 2px solid
      ${e=>e.alert?"var(--mainRed)":e.disabled?"var(--mainGray)":"var(--canvastext)"};
    outline-offset: 2px;
  }
`;function r(e){const n=e.label?"static":"none",i=e.vertical?"static":"flex";var o={value:"Card",fontSize:"24px",fontFamily:"Open Sans",margin:"0"},t={value:"Label:",fontSize:"14px",marginRight:"5px",display:`${n}`,margin:"0px 5px 2px 0px"},m={display:`${i}`,alignItems:"center"};e.value&&(o.value=e.value);var c="";e.icon&&(c=e.icon);const f=e.icon?a("div",{style:{padding:"8px",fontSize:"20px"},children:c}):"";e.label&&(t.value=e.label);function u(v){e.onClick&&e.onClick(v)}return d("div",{style:m,children:[a("p",{style:t,children:t.value}),d(_,{"data-test":e.dataTest,alert:e.alert,disabled:e.disabled,"aria-labelledby":t,"aria-label":o.value,onClick:v=>{u(v)},children:[a("h4",{style:o,children:a("b",{children:o.value})}),f]})]})}function U(e){const n=x(p),i=b(k("courseId")),o=w(),{canModifyCourseSettings:t,canManageUsers:m,dataAccessPermission:c,canViewAndModifyGrades:f}=b(V(i)),u=x(A);let y=P(T).contents;D.useEffect(()=>{u(t==="1"?[]:["ClassTimes"])},[t,u]);let g=b(G(i));return(g==null?void 0:g.canViewCourse)=="0"?a("h1",{children:"No Access to view this page."}):d("div",{style:(e==null?void 0:e.style)??{},children:[d("div",{style:{marginLeft:"10px",marginRight:"10px"},children:[a("h1",{children:"Welcome!"}),d("div",{style:{display:"grid",gridAutoFlow:"column dense",gridAutoColumns:"min-content",gap:"30px",width:"850px"},children:[a(r,{dataTest:"Dashboard Content Card",name:"Content",icon:a(s,{icon:I}),value:"Content",onClick:()=>{n(l=>({...l,tool:"navigation"}))}}),m==="1"?a(r,{dataTest:"Dashboard People Card",name:"People",icon:a(s,{icon:S}),value:"People",onClick:()=>n({page:"course",tool:"people",view:"",params:{courseId:i}})}):null,(c??"None")!=="None"?a(r,{dataTest:"Dashboard Data Card",name:"Data",icon:a(s,{icon:R}),value:"Data",onClick:()=>o(`/coursedata/${i}/`)}):null,f==="1"?a(r,{dataTest:"Dashboard Gradebook Card",name:"Gradebook",icon:a(s,{icon:h}),value:"Gradebook",onClick:()=>n(l=>({page:"course",tool:"gradebook",view:l.view,params:{courseId:i}}))}):a(r,{name:"Gradebook",icon:a(s,{icon:h}),style:{marginLeft:"-600px"},value:"Gradebook",onClick:()=>n(l=>({page:"course",tool:"gradebookStudent",view:l.view,params:{courseId:i,userId:y.userId}}))})]})]}),a("div",{style:{marginTop:"10px",margin:"10px"},children:a(N,{courseId:i})})]})}export{U as default};
