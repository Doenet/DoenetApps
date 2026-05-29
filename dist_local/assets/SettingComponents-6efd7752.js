import{h as y,aV as O,r as f,aW as R,j as t,aX as L,a as w,ab as I,e as S,aD as K,aY as _,B as x,v as D,aa as $,F as N,_ as E,b as U,aC as j,C as z,w as W,R as G,aZ as A}from"./index-99bd2cb8.js";import{d as q}from"./CourseToolHandler-76119d98.js";import{C as H}from"./CollapseSection-d7f4e42c.js";import{D as P}from"./DateTime-0444e578.js";import{D as B}from"./DropdownMenu-1803f2f5.js";import{R as X}from"./RelatedItems-c12a7c4c.js";import{R as V}from"./RoleDropdown-408645b7.js";import{T as k}from"./Textfield-2ddbf57e.js";const Y=y.button`
  border-radius: var(--mainBorderRadius);
  border: none;
  height: 36px;
  width: 36px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-color: ${e=>e.color||"var(--canvas)"};
  background-image: ${e=>e.image||"none"};
  cursor: pointer;
  &:focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 2px;
  }
`,Z=y.div`
  border: var(--mainBorder);
  border-radius: var(--mainBorderRadius);
  background-color: var(--canvas);
  height: 352px;
  width: 220px;
  display: none;
  position: relative;
  top: 40px;
  overflow: scroll;
  ${e=>e.visible==="True"&&O`
      display: block;
    `};
`,J=y.div`
  display: grid;
  grid-template-columns: repeat(9, 24px);
  grid-template-rows: 20px;
  width: 224px;
  height: 24px;
`,Q=y.div`
  display: grid;
  grid-template-columns: repeat(4, 54px);
  grid-template-rows: repeat(7, 54px);
  width: 224px;
  height: 140px;
  padding-bottom: 6px;
`,ee=y.div`
  border-radius: var(--mainBorderRadius);
  height: 20px;
  width: 20px;
  margin: 4px;
  background-color: ${e=>e.color||"var(--canvas)"};
`,te=y.p`
  display: static;
  margin-right: 5px;
  font-family: "Open Sans";
  margin-bottom: 6px;
`,ae=y.div`
  display: static;
  width: auto;
`,ie=y.div`
  border-radius: var(--mainBorderRadius);
  height: 50px;
  width: 50px;
  margin: 4px;
  background-size: cover;
  background-position: center center;
  background-repeat: no-repeat;
  background-image: ${e=>e.image||"none"};
`;function ne(e){const[c,m]=f.useState("False"),[r,o]=f.useState(e.initialColor?e.initialColor:"var(--canvas)"),[l,i]=f.useState(e.initialImage?e.initialImage:"none");function s(n){c=="True"?m("False"):c=="False"&&m("True")}function p(n){o(n),i("none"),m("False"),e.colorCallback&&e.colorCallback(n)}function g(n){i(n),o("none"),m("False"),e.imageCallback&&e.imageCallback(n)}var C=[];for(let n=0;n<R.length;n++)C.push(t(ee,{color:"#"+R[n].Color,onClick:()=>{p(R[n].Color)},"aria-label":R[n].Name},n));var h=[];for(let n=0;n<L.length;n++)h.push(t(ie,{image:"url(/drive_pictures/"+L[n].Image+")",onClick:()=>{g(L[n].Image)},"aria-label":L[n].Name},n));return w(ae,{children:[t(te,{id:"color-image-picker-label",children:"Background Image"}),t(Y,{"aria-labelledby":"color-image-picker-label",onClick:n=>{s()},color:"#"+r,image:"url(/drive_pictures/"+l+")",children:w(Z,{visible:c,children:[t(J,{children:C}),t(Q,{children:h})]})})]})}const le=y.div`
  margin: 10px 5px 0 5px;
  display: ${e=>e.flex?"flex":"block"};
  align-items: ${e=>e.flex&&"center"};
`,oe=y.span`
  font-size: 15px;
  line-height: 1.1;
`,re=(e,c="")=>{D();const[m,r]=f.useState(c);return f.useEffect(()=>{r(c)},[c]),[m,r,()=>{let l=m;m===""&&(l=c,c===""&&(l="Untitled Course"),r(l)),c!==l&&e(l)}]};function ve({courseId:e,dataTest:c}){const{modifyCourse:m,label:r}=I(e),[o,l,i]=re(s=>{m({label:s})},r);return t(k,{dataTest:c,label:"Label",vertical:!0,width:"menu",value:o,onChange:s=>l(s.target.value),onKeyDown:s=>{s.keyCode===13&&i()},onBlur:i})}function be({courseId:e}){const{modifyCourse:c,color:m,image:r}=I(e);return t(ne,{initialImage:r,initialColor:m,imageCallback:o=>{c({image:o,color:"none"})},colorCallback:o=>{c({color:o,image:"none"})}})}const se=y.div`
  display: grid;
  grid:
    "first last email button" 1fr
    "role empId . button" 1fr
    / 1fr 1fr 1fr 0.5fr;
  gap: 4px;
  max-width: 850px;
`,de=y.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  grid-area: button;
`;function ye({courseId:e}){const{defaultRoleId:c,addUser:m}=I(e),r=S(K(e)),o={roleId:c,firstName:"",lastName:"",externalId:"",section:""},[l,i]=f.useState(o),[s,p]=f.useState(""),[g,C]=f.useState(!1),h=_();f.useLayoutEffect(()=>{C(h(s))},[s,h]);const n=async()=>{g&&m(s,l,()=>{p(""),i(o)})};return w(se,{children:[t(k,{label:"First",dataTest:"First",width:"250px",value:l.firstName,onChange:u=>{i(a=>({...a,firstName:u.target.value}))},vertical:!0}),t(k,{label:"Last",dataTest:"Last",width:"250px",value:l.lastName,onChange:u=>{i(a=>({...a,lastName:u.target.value}))},vertical:!0}),t(de,{children:t(x,{width:"50px",value:"Add User","data-test":"Add User",onClick:n,disabled:!g,vertical:!0})}),t(k,{label:"Email",dataTest:"Email",width:"250px",value:s,onChange:u=>{p(u.target.value)},onKeyDown:u=>{u.code==="Enter"&&n()},vertical:!0,alert:s!==""&&!g}),t(k,{label:"Section",dataTest:"Section",width:"250px",value:l.section,onChange:u=>{i(a=>({...a,section:u.target.value}))},vertical:!0}),t(k,{label:"External Id",dataTest:"External Id",width:"250px",value:l.externalId,onChange:u=>{i(a=>({...a,externalId:u.target.value}))},vertical:!0}),t(B,{label:"Role",dataTest:"role",width:"190px",items:(r==null?void 0:r.map(({roleLabel:u,roleId:a})=>[a,u]))??[],onChange:({value:u})=>{i(a=>({...a,roleId:u}))},valueIndex:r.findIndex(({roleId:u})=>u==(l==null?void 0:l.roleId))+1,vertical:!0,disabled:!1})]})}function xe({courseId:e,editable:c=!1}){var C,h;D();const{modifyUserRole:m}=I(e),r=S($(e)),o=S(K(e)),[l,i]=f.useState(null),[s,p]=f.useState(null),g=async()=>{m(l==null?void 0:l.email,s==null?void 0:s.roleId,()=>{i(n=>({...n,roleId:s.roleId,roleLabel:s.roleLabel,permissions:s}))},n=>{p(l.permissions)})};return w(N,{children:[t(X,{width:"menu",label:"Select User",options:(r==null?void 0:r.map((n,u)=>w("option",{value:u,children:[n.screenName," (",n.email,")"]},n.email)))??[],onChange:({target:{value:n}})=>{let u=r[n],a=(o==null?void 0:o.find(({roleId:d})=>d===u.roleId))??{};i({...u,permissions:a}),p(a)},vertical:!0}),t(V,{label:"Assigned Role",title:"",onChange:({value:n})=>{p((o==null?void 0:o.find(({roleId:u})=>u===n))??null)},valueRoleId:s==null?void 0:s.roleId,disabled:((C=l==null?void 0:l.permissions)==null?void 0:C.isOwner)==="1"||!c,vertical:!0}),c&&t(x,{width:"menu",value:"Assign Role",onClick:g,disabled:((h=l==null?void 0:l.permissions)==null?void 0:h.isOwner)==="1"})]})}function v({courseId:e,roleId:c,permissionKey:m,onClick:r,invert:o=!1,parentPermissionKey:l=""}){const{[m]:i,[l]:s,isOwner:p}=U(j({courseId:e,roleId:c})).getValue(),[g,C]=f.useState("0");return f.useEffect(()=>{C(p==="1"&&!o||s==="1"||i==="1"?"1":"0")},[p,s,i,o]),w(le,{flex:!0,children:[t(z,{style:{marginRight:"5px"},checked:g==="1",onClick:h=>{r({value:g,set:C,event:h,permissionKey:m})},disabled:s==="1"||p==="1"}),t(oe,{children:m})]})}function we({courseId:e}){const c=D(),{modifyRolePermissions:m}=I(e),r=S(K(e)),[o,l]=f.useState(r[0].roleId),[i,s]=f.useState(r[0]);f.useEffect(()=>{const d=r==null?void 0:r.find(({roleId:b})=>b===o);d?s(d):l(r[0].roleId)},[r,o]);const[p,g]=f.useState({}),[C,h]=f.useState(!1),n=()=>{m(i.roleId,p,()=>{h(!1),setPermissonEdits({})},d=>{setSelectedRolePermissons(selectedRolePermissons)})},u=()=>{m(i.roleId,{isDeleted:"1"},()=>{h(!1),g({})},d=>{s(i),c(d,W.ERROR)})},a=({value:d,set:b,permissionKey:M})=>{let T="0";d==="0"&&(T="1"),g(F=>({...F,[M]:T})),b(T),C||h(!0)};return w(f.Suspense,{fallback:t("div",{children:"Loading roles..."}),children:[t(V,{label:"Role",onChange:({value:d})=>{l(d)},valueRoleId:o,maxMenuHeight:"200px",vertical:!0}),t(k,{label:"Label",width:"menu",value:(p==null?void 0:p.roleLabel)??i.roleLabel,vertical:!0,onChange:d=>{g(b=>({...b,roleLabel:d.target.value})),C||h(!0)},disabled:i.isOwner==="1"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"isIncludedInGradebook",invert:!0}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canViewContentSource",parentPermissionKey:"canEditContent"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canViewUnassignedContent",parentPermissionKey:"canEditContent"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canEditContent"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canPublishContent"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canProctor"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canViewAndModifyGrades"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canViewActivitySettings",parentPermissionKey:"canModifyActivitySettings"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canModifyActivitySettings"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canModifyCourseSettings"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canViewCourse"}),t(B,{label:"Data Access Level",title:"",items:["None","Aggregated","Anonymized","Identified"].map(d=>[d,d]),onChange:({value:d})=>{g(b=>({...b,dataAccessPermission:d})),C||h(!0)},valueIndex:["None","Aggregated","Anonymized","Identified"].findIndex(d=>d===((p==null?void 0:p.dataAccessPermission)??i.dataAccessPermission))+1,vertical:!0,disabled:i.isOwner==="1",width:"menu"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canViewUsers",parentPermissionKey:"canManageUsers"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"canManageUsers",parentPermissionKey:"isAdmin"}),t(v,{courseId:e,roleId:i.roleId,onClick:a,permissionKey:"isAdmin"}),C&&t(E,{vertical:!0,children:t(x,{width:"menu",value:"Save Role",alert:!0,onClick:n,onKeyDown:d=>{d.keyCode===13&&n()}})}),t("br",{}),t(H,{width:"menu",title:"Delete Role",collapsed:!0,children:t(x,{width:"menu",value:"Delete",alert:!0,onClick:u,onKeyDown:d=>{d.keyCode===13&&u()}})})]})}function ke({courseId:e}){D();const c=S(K(e)),{modifyRolePermissions:m}=I(e),r=()=>{m("",{roleLabel:`Role ${c.length}`},()=>{})};return t(x,{width:"menu",value:"Create New Role",onClick:r,onKeyDown:o=>{o.keyCode===13&&r()}})}function Ie({courseId:e}){D();const{deleteCourse:c,label:m}=I(e),r=G(q),o=()=>{c(()=>{r([])})};return t(E,{vertical:!0,children:t(x,{width:"menu",value:"Delete Course",alert:!0,onClick:o,onKeyDown:l=>{l.keyCode===13&&o()}})})}function De({courseId:e}){D();const{duplicateCourse:c,label:m}=I(e),[r,o]=f.useState(!1),[l,i]=f.useState(""),[s,p]=f.useState(""),[g,C]=f.useState("");let h=!1,n=0;if(g!=""&&s!=""&&l!=""){h=!0;let a=new Date(l);n=(new Date(s).getTime()-a.getTime())/(1e3*3600*24)}const u=({dateDifference:a,newLabel:d})=>{c({dateDifference:a,newLabel:d},()=>{console.log("Duplication Success callback"),o(!1)})};return r?w(N,{children:[t("h2",{children:"Duplicate Course"}),t("p",{children:"* - Required"}),t(k,{dataTest:"New Course Label Textfield",vertical:!0,width:"menu",label:"New Course's Label *",onChange:a=>{C(a.target.value)}}),t("p",{children:"Start Dates are used to adjust the new course's activity dates."}),t(P,{dataTest:"Duplication Start Date",offset:"-10px",width:"menu",timePicker:!1,vertical:!0,label:"Source Course's Start Date *",onChange:({valid:a,value:d})=>{if(a){let b=A(d._d);i(b)}else i("")}}),t(P,{dataTest:"Duplication End Date",offset:"-10px",width:"menu",timePicker:!1,vertical:!0,label:"New Course's End Date *",onChange:({valid:a,value:d})=>{if(a){let b=A(d._d);p(b)}else p("")}}),t("br",{}),t("br",{}),w(E,{children:[t(x,{alert:!0,width:"100px",value:"Cancel",onClick:()=>o(!1),onKeyDown:a=>{a.keyCode===13&&o(!1)}}),t(x,{dataTest:"Duplicate Action",width:"100px",value:"Duplicate",disabled:!h,onClick:()=>u({dateDifference:n,newLabel:g}),onKeyDown:a=>{a.keyCode===13&&u({dateDifference:n,newLabel:g})}})]})]}):t(E,{vertical:!0,children:t(x,{dataTest:"Duplicate Course Button",width:"menu",value:"Duplicate Course",onClick:()=>o(!0),onKeyDown:a=>{a.keyCode===13&&o(!0)}})})}export{ye as A,Ie as D,ve as E,we as M,ke as a,be as b,De as c,xe as d};
