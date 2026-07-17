import{h as y,r as i,e as P,b1 as V,ao as W,j as d,F as _,a as J}from"./index-ff2008c3.js";const N=y.ul`
  list-style: none;
  overflow: hidden;
  height: 21px;
  display: flex;
  margin-left: -35px;
`,L=y.li`
  float: left;
  &:last-of-type span {
    border-radius: 0px 15px 15px 0px;
    padding: 0px 25px 0px 45px;
    background: var(--lightBlue);
    color: black;
  }
  &:first-of-type span {
    padding: 0px 0px 0px 30px;
  }
  &:only-child span {
    border-radius: 15px;
    padding: 0px 30px 0px 30px;
    background: var(--lightBlue);
    color: black;
  }
`,X=y.div`
  padding: 4px;
  cursor: pointer;
  color: var(--canvastext);
  background: var(--canvas);
  border: 2px solid var(--canvastext);
  border-radius: ${t=>t.radius};
  margin: -2px 0px -2px 0px;
  border-left: 0px;
  border-right: 0px;
  padding-left: 8px;
  padding-right: 8px;
  max-width: 120px;
  white-space: nowrap;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 21.6px;
  &:hover {
    background-color: var(--lightBlue);
    color: black;
  }
  &:focus {
    background-color: var(--lightBlue);
    color: black;
  }
`,K=y.span`
  padding: 0px 0px 0px 45px;
  position: relative;
  float: left;
  color: white;
  background: var(--mainBlue);
  border-radius: 15px 0px 0px 15px;
  cursor: pointer;
  &::after {
    content: " ";
    width: 0;
    height: 0;
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 30px solid var(--mainBlue);
    position: absolute;
    top: 50%;
    margin-top: -50px;
    left: 100%;
    z-index: 2;
  }
  &::before {
    content: " ";
    width: 0;
    height: 0;
    border-top: 50px solid transparent;
    border-bottom: 50px solid transparent;
    border-left: 30px solid white;
    position: absolute;
    top: 50%;
    margin-top: -50px;
    margin-left: 1px;
    left: 100%;
    z-index: 1;
  }
  &:focus {
    text-decoration: underline;
  }
`,T=y.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 175px;
`;function Y({setRef:t,i:h,label:a=null,onClick:b}){let g=i.useRef(null);return i.useEffect(()=>{t(m=>{let p=[...m];return p[h]=g,p})},[h,g,t]),a||(a="_"),d(L,{ref:g,"data-test":`Crumb ${h}`,children:d(K,{"aria-label":a,tabIndex:"0",onClick:b,onKeyDown:m=>{m.key==="Enter"&&b()},children:d(T,{children:a})})})}function A({crumbs:t=[],offset:h=0}){var z,$;let[a,b]=i.useState([]),[g,m]=i.useState(window.innerWidth),[p,j]=i.useState(null),[C,R]=i.useState(!1),H=P(V),w=i.useRef([]),M=i.useRef(null);const E=i.useRef(0),O=i.useRef(null);function F(){m(window.innerWidth)}i.useEffect(()=>(window.onresize=F,()=>{window.onresize=null}),[]);let c=0;if(p!==null&&t.length>2){let e=g;H&&(e=H),e-=h;for(let n of p)e<n.end&&e>=n.start&&(c=n.numHidden)}i.useLayoutEffect(()=>{C&&document.getElementById("breadcrumbitem1").focus()},[C]),i.useLayoutEffect(()=>{var e,n,o,f;if(t.length<a.length&&b(a.slice(0,t.length)),t.length===a.length){let r=[],x=[],B=!1;for(let[s,v]of Object.entries(a)){let k=(e=v.current)==null?void 0:e.getBoundingClientRect();k===void 0&&(k={width:0,right:0});let{width:l,right:u}=k;l===0&&(n=w.current)!=null&&n[s]&&(l=(o=w.current)==null?void 0:o[s]),r.push(l),x.push(u),((f=w.current)==null?void 0:f[s])!==l&&l!==0&&(B=!0)}if(w.current.length>r.length&&(B=!0),E.current!==0&&E.current!==x[0]&&(B=!0),w.current=r,E.current=x[0],B){let s=[],v=52,k=5,l=x[0]+v+r[r.length-2]+r[r.length-1]+k;s.push({start:0,end:l,numHidden:t.length-2});for(let u=3;u<t.length;u++){let D=l;l=l+r[r.length-u],u===t.length-1&&(l=D+r[1]-v),s.push({start:D,end:l,numHidden:t.length-u})}r.length>2&&v>r[1]&&s.pop(),j(s)}}},[t,a,j,p,c]);let I=[];for(let[e,{label:n,onClick:o}]of Object.entries(t))e<c&&e!=0||I.push(d(Y,{label:n,onClick:o,onKeyDown:f=>{f.key==="Enter"&&o()},i:e,setRef:b},`breadcrumbitem${e}`));c>0&&(I[1]=d(L,{ref:M,children:d(K,{"data-test":"Crumb Menu","aria-label":"...",tabIndex:"0",onClick:()=>{R(e=>!e)},onKeyDown:e=>{e.key==="Enter"&&R(n=>!n)},children:"..."})},"breadcrumbitem1"));let S=null;if(c>0&&C){let e=[];for(let[o,{label:f,onClick:r}]of Object.entries(t))if(o!=0){if(o>c)break;e.push(d(X,{tabIndex:"0",id:`breadcrumbitem${o}`,"data-test":`Crumb Menu Item ${o}`,radius:"0px",onClick:r,onKeyDown:x=>{x.key==="Enter"&&r()},children:f},`breadcrumbitem${o}`))}e.length>1?e=[W.cloneElement(e[0],{radius:"5px 5px 0px 0px"})].concat(e.slice(1,-1)).concat(W.cloneElement(e[e.length-1],{radius:"0px 0px 5px 5px"})):e.length==1&&(e=[W.cloneElement(e[0],{radius:"5px"})]);const n=(($=(z=M.current)==null?void 0:z.getBoundingClientRect())==null?void 0:$.left)+25;isNaN(n)?R(!1):S=d("div",{style:{left:n,zIndex:"20",top:"31px",position:"absolute",backgroundColor:"var(--canvas)",border:"2px solid var(--canvastext)",borderRadius:"5px",maxHeight:"121px",overflowY:"scroll"},children:e})}return d(_,{children:J(N,{ref:O,children:[I,S]})})}export{A as B};
