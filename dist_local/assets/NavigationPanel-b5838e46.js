import{e as h,s as E,R as L,y as _,v as B,r as S,o as x,k as t,f as G,z as T,A as C,E as M,p as P,G as j,j as i,a as u,U as D,h as r}from"./index-ff2008c3.js";import{C as R}from"./CourseNavigator-79ab18f0.js";import{e as A}from"./RoleDropdown-052288d7.js";import"./index.esm-33907b54.js";/* empty css             */import"./DropdownMenu-f4ac5b33.js";const O=D`
  0% { background-position: -250px 0; }
  100% { background-position: 250px 0; }
`,z=r.table`
  width: 850px;
  border-radius: 5px;
  margin-top: 50px;
  margin-left: 20px;
`,g=r.tr``,s=r.td`
  height: 40px;
  vertical-align: middle;
  padding: 8px;
  /* border-bottom: 2px solid var(--canvastext); */

  &.Td2 {
    width: 50px;
  }

  &.Td3 {
    width: 400px;
  }
`,F=r.tbody``,v=r.span`
  display: block;
  //background-color: var(--canvastext);
  width: 70px;
  height: 16px;
  border-radius: 5px;
`,b=r.span`
  display: block;
  height: 14px;
  border-radius: 5px;
  background: linear-gradient(
    to right,
    var(--mainGray) 20%,
    var(--mainGray) 50%,
    var(--mainGray) 80%
  );
  background-size: 500px 100px;
  animation-name: ${O};
  animation-duration: 1s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
`;function K(){const c=h(E("courseId")),{canEditContent:k}=h(A(c)),w=L(_);B(),S.useLayoutEffect(()=>{w(k=="1"?[]:["AddDriveItems","CutCopyPasteMenu"])},[k,w]);const N=x(({set:a,snapshot:o})=>async({singleItem:e})=>{console.log(`singleItem doenetId:${e==null?void 0:e.doenetId}`,e),e!==null?e.type=="activity"?a(t,"SelectedActivity"):e.type=="order"?a(t,"SelectedOrder"):e.type=="page"?a(t,"SelectedPage"):e.type=="section"?a(t,"SelectedSection"):e.type=="bank"?a(t,"SelectedBank"):e.type=="collectionLink"?a(t,"SelectedCollectionLink"):e.type=="pageLink"?a(t,"SelectedPageLink"):a(t,null):a(t,null)}),m=G();let f=x(({snapshot:a,set:o})=>async()=>{const e=await a.getPromise(T);o(t,null),o(T,[]);for(let d of e)o(C(d),n=>{let l={...n};return l.isSelected=!1,l})});const $=x(({set:a,snapshot:o})=>async({doenetId:e,courseId:d})=>{let n=await o.getPromise(C(e)),{canEditContent:l}=await o.getPromise(A(d));if(n.type=="page")f(),m(`/courseactivityeditor/${n.containingDoenetId}/${e}`);else if(n.type=="pageLink")f(),m(`/courselinkpageviewer/${e}/`);else if(n.type=="activity")if(l=="1"){let p=M(n.content);p==null||(f(),m(`/courseactivityeditor/${e}/${p}`))}else a(P,{page:"course",tool:"assignment",view:"",params:{doenetId:e}});else n.type=="section"&&a(P,p=>({page:"course",tool:"navigation",view:p.view,params:{sectionId:n.doenetId,courseId:d}}))});let y=h(j(c));return(y==null?void 0:y.canViewCourse)=="0"?i("h1",{children:"No Access to view this page."}):i(S.Suspense,{fallback:i(z,{children:u(F,{children:[u(g,{children:[i(s,{className:"Td2",children:i(v,{})}),i(s,{className:"Td3",children:i(b,{})})]}),u(g,{children:[i(s,{className:"Td2",children:i(v,{})}),i(s,{className:"Td3",children:i(b,{})})]}),u(g,{children:[i(s,{className:"Td2",children:i(v,{})}),i(s,{className:"Td3",children:i(b,{})})]})]})}),children:i(I,{children:i(R,{updateSelectMenu:N,doubleClickItem:$})})})}function I(c){return i("div",{style:{maxWidth:"850px",margin:"10px 20px"},children:c.children})}export{K as default};
