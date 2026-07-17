import{e as U,s as $,r as s,v as ie,o as P,g as k,p as se,a,j as e,F as j,B as f,M as le,ac as O,ad as oe,H as E,ae as A,af as N,_ as z,h as de,x as ce,d as he}from"./index-ff2008c3.js";const me=de.div`
  padding: 1rem;
  table {
    /* border-collapse: collapse; */
    border-spacing: 0;
    width: 100%;
    margin-bottom: 20vh;

    thead {
      position: sticky;
      top: 43px;
      box-shadow: 0 2px 0 0px var(--canvastext);
    }

    a {
      text-decoration: var(--mainBlue) underline;
    }

    .sortIcon {
      padding-left: 4px;
    }

    tbody tr:not(:last-child) {
      border-bottom: 1px solid var(--mainGray);
    }

    td:first-child {
      text-align: left;
      max-width: 15rem;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    th {
      position: sticky;
      top: 0;
      background: var(--canvas);
      user-select: none;
      max-width: 4rem;
      //word-wrap: break-word;
      padding: 2px;
      max-height: 10rem;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    th:first-child {
      vertical-align: bottom;
      max-width: 15rem;
      p {
        margin: 5px;
      }
    }

    /* th > p {
      height: 100%;
    } */

    tr:first-child th > p {
      margin: 0px 0px 4px 0px;
      padding: 0px;
    }

    tr:not(:first-child) th:not(:first-child) > p {
      /* writing-mode: vertical-rl; */
      text-align: left;
      /* transform: rotate(180deg); */
      /* max-height: 160px; */
    }

    tr:nth-child(even) {
      background-color: var(--mainGray);
    }

    thead tr:only-child th:not(:first-child) > p {
      /* writing-mode: vertical-rl; */
      text-align: left;
      /* transform: rotate(180deg); */
      /* max-height: 160px; */
    }

    td {
      /* user-select: none; */
      text-align: center;
      max-width: 5rem;
    }
    td,
    th {
      border-right: 2px solid var(--canvastext);
      :last-child {
        border-right: 0;
      }
    }

    tfoot {
      font-weight: bolder;
      position: sticky;
      bottom: 0;
      background-color: var(--canvas);
      box-shadow: inset 0 2px 0 var(--canvastext);
    }
  }
`,m=Object.freeze({FIRST_NAME:"firstName",LAST_NAME:"lastName",STUDENT_ID:"studentId"});function pe(){const u=U($("doenetId")),v=U($("courseId"));let[c,o]=s.useState("request password"),[I,_]=s.useState(""),[T,L]=s.useState([]),[D,q]=s.useState([]),[G,J]=s.useState({}),[g,C]=s.useState(null),[R,K]=s.useState(""),[M,S]=s.useState(!1),[X,Y]=s.useState(""),[B,H]=s.useState(""),x=s.useRef(!1),[V,Z]=s.useState(null);const[l,Q]=s.useState({column:"",descending:!0}),W=ie(),ee=P(()=>async(n,r,t,i)=>{i||await k.get("/api/incrementAttemptNumberForExam.php",{params:{doenetId:n,code:r,userId:t}}),location.href=`/api/examjwt.php?userId=${encodeURIComponent(g.userId)}&doenetId=${encodeURIComponent(n)}&code=${encodeURIComponent(r)}`}),F=P(({set:n})=>async(r,t)=>{n(se,i=>{let d={...i};return r?d.params={doenetId:r,courseId:t}:d.params={courseId:t},d})});async function te(){for(;x.current;){await ce();let{userInformationIsCompletelyRemoved:n,messageArray:r}=await he();if(Z(r.map((t,i)=>e("p",{children:t},`error ${i}`))),n){o("choose exam"),x.current=!1;break}}}function ne(n){K(n.target.value)}function w(n,r=null){Q(t=>t.column!==n?{column:n,descending:!0}:{column:n,descending:r!==null?r:!t.descending})}if(s.useEffect(()=>{const n=l.descending?1:-1;L(r=>[...r].sort((t,i)=>(t[l.column]<i[l.column]?-1:1)*n))},[l.column,l.descending]),c==="request password"||c==="problem with code")return a("div",{style:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",display:"flex",justifyContent:"center",alignItems:"center",margin:"20"},children:[e("img",{style:{width:"250px",height:"250px"},alt:"Doenet Logo",src:"/Doenet_Logo_Frontpage.png"}),a("div",{style:{leftPadding:"10px"},children:[a("label",{children:[e("div",{style:{weight:"bold"},children:"Enter Passcode "}),e("input",{type:"password",value:I,"data-test":"signinCodeInput",onKeyDown:n=>{n.key==="Enter"&&o("check code")},onChange:n=>{_(n.target.value)}})]}),e("div",{children:e("button",{style:{},onClick:()=>o("check code"),"data-test":"signInButton",children:"Submit"})})]})]});if(c==="check code"&&(async r=>{let{data:t}=await k.get("/api/checkPasscode.php",{params:{code:r,doenetId:u,courseId:v}});if(t.success){x.current=!0,te(),o("clearing past user"),L(t.learners),q(t.exams);let i={};for(let d of t.exams)i[d.doenetId]=d;J(i)}else W(t.message),o("problem with code")})(I),c==="clearing past user")return a(j,{children:[e("h1",{children:"Clearing out past user..."}),V,e(f,{value:"Cancel",onClick:()=>{x.current=!1,o("choose exam")}})]});if(c==="choose exam"){if(D.length<1)return e("h1",{children:"No Exams Available!"});let n=[];for(let r of D)n.push(a("tr",{children:[e("td",{style:{textAlign:"center"},children:r.label}),e("td",{style:{textAlign:"center"},children:e("button",{onClick:async()=>{const{data:t}=await k.get("/api/checkSEBheaders.php",{params:{doenetId:r.doenetId}});if(Number(t.legitAccessKey)!==1){o("Problem"),Y("Browser not configured properly to take an exam.");return}else F(r.doenetId,v),H(r.label),o("choose learner")},children:"Choose"})})]}));return e("div",{children:a("table",{children:[a("thead",{children:[e("th",{style:{width:"200px"},children:"Exam"}),e("th",{style:{width:"100px"},children:"Choose"})]}),e("tbody",{children:n})]})})}if(c==="choose learner"){if(!u)return null;if(T.length<1)return e("h1",{children:"No One is Enrolled!"});let n=[],r=G[u].timeLimit;l.column===""&&w(m.LAST_NAME);for(let t of T){if(!t.firstName.toLowerCase().includes(R.toLowerCase())&&!t.lastName.toLowerCase().includes(R.toLowerCase()))continue;let i=null,d=!1;if(t!=null&&t.exam_to_date[u]){let h=le(t==null?void 0:t.exam_to_date[u]);d=r===null;let y=null;if(!d){let p=Number(r)*Number(t.timeLimitMultiplier),b;if(p){let ae=new Date(h.getTime()+p*60*1e3),re=new Date;b=(ae.getTime()-re.getTime())/(1e3*60)}b&&b>1&&(d=!0,y=`${Math.round(b)} mins remain`)}if(d){if(!y){let p=O(h);y=`${h.getMonth()+1}/${h.getDate()} ${p}`}i=a(z,{children:[e(f,{value:"Resume",onClick:()=>{C(t),o("student final check"),S(!0)}}),y]})}else if(h){let p=O(h);i=`${h.getMonth()+1}/${h.getDate()} ${p}`}}n.push(a("tr",{children:[e("td",{style:{textAlign:"center"},children:t.firstName}),e("td",{style:{textAlign:"center"},children:t.lastName}),e("td",{style:{textAlign:"center"},children:t.studentId}),e("td",{style:{textAlign:"center"},children:i}),e("td",{style:{display:"block",margin:"4px auto"},children:e(f,{width:"menu",value:"Start",onClick:()=>{C(t),o("student final check"),S(!1)}})})]}))}return a(me,{children:[a("div",{style:{background:"var(--canvas)",top:0,position:"sticky",paddingLeft:"50px",paddingBottom:"15px",display:"flex"},children:[a("div",{style:{marginRight:"15px",fontSize:"16pt"},children:["Exam: ",B]})," ",e(oe,{onChange:ne,width:"100%"})]}),a("table",{children:[a("thead",{children:[a("th",{style:{width:"200px"},onClick:()=>w(m.FIRST_NAME),children:[e("u",{children:"First Name"})," ",l.column===m.FIRST_NAME&&e(E,{icon:l.descending?A:N})]}),a("th",{style:{width:"200px"},onClick:()=>w(m.LAST_NAME),children:[e("u",{children:"Last Name"})," ",l.column===m.LAST_NAME&&e(E,{icon:l.descending?A:N})]}),a("th",{style:{width:"200px"},onClick:()=>w(m.STUDENT_ID),children:[e("u",{children:"Student ID"})," ",l.column===m.STUDENT_ID&&e(E,{icon:l.descending?A:N})]}),e("th",{style:{width:"240px"},children:"Last Exam"}),e("th",{style:{width:"60px"},children:"Choose"})]}),e("tbody",{children:n})]})]})}if(c==="student final check"){let n="Yes It's me. Start Exam.";return M&&(n="Yes It's me. Resume Exam."),e(j,{children:a("div",{style:{fontSize:"1.5em",position:"absolute",top:"50%",left:"50%",transform:"translate(-50%, -50%)",justifyContent:"center",alignItems:"center",margin:"20"},children:[a("div",{children:[a("div",{style:{marginRight:"15px",fontSize:"16pt"},children:["Exam: ",B]}),e("div",{}),e("div",{children:e("b",{children:"Is this you?"})}),a("div",{children:["Name: ",g.firstName," ",g.lastName]}),a("div",{children:["ID: ",g.studentId]})]}),a(z,{children:[e(f,{alert:!0,value:"No",onClick:()=>{o("request password"),_(""),C(null),F(null,v),S(!1)}}),e(f,{value:n,onClick:()=>{ee(u,I,g.userId,M)}})]})]})})}return c==="Problem"?e("h1",{children:X}):null}export{me as Styles,pe as default};
