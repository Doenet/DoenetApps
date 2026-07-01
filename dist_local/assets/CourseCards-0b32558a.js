import{r as m,h as L,a as T,j as b,e as N,i as V,R as M,m as W,k as P,l as q,p as F,n as U,o as X,q as Y,t as G}from"./index-5795133f.js";import{d as H}from"./CourseToolHandler-0844fc28.js";import"./index-47ca4f11.js";import"./index.esm-e11cbf7b.js";/* empty css             */function _(e,t,a){var o,c,d,h,p;t==null&&(t=100);function r(){var g=Date.now()-h;g<t&&g>=0?o=setTimeout(r,t-g):(o=null,a||(p=e.apply(d,c),d=c=null))}var w=function(){d=this,c=arguments,h=Date.now();var g=a&&!o;return o||(o=setTimeout(r,t)),g&&(p=e.apply(d,c),d=c=null),p};return w.clear=function(){o&&(clearTimeout(o),o=null)},w.flush=function(){o&&(p=e.apply(d,c),d=c=null,clearTimeout(o),o=null)},w}_.debounce=_;var $=_;function J(e){let{debounce:t,scroll:a,polyfill:o,offsetSize:c}=e===void 0?{debounce:0,scroll:!1,offsetSize:!1}:e;const d=o||(typeof window>"u"?class{}:window.ResizeObserver);if(!d)throw new Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");const[h,p]=m.useState({left:0,top:0,width:0,height:0,bottom:0,right:0,x:0,y:0}),r=m.useRef({element:null,scrollContainers:null,resizeObserver:null,lastBounds:h}),w=t?typeof t=="number"?t:t.scroll:null,g=t?typeof t=="number"?t:t.resize:null,C=m.useRef(!1);m.useEffect(()=>(C.current=!0,()=>void(C.current=!1)));const[R,y,S]=m.useMemo(()=>{const u=()=>{if(!r.current.element)return;const{left:K,top:n,width:i,height:s,bottom:f,right:v,x:l,y:A}=r.current.element.getBoundingClientRect(),z={left:K,top:n,width:i,height:s,bottom:f,right:v,x:l,y:A};r.current.element instanceof HTMLElement&&c&&(z.height=r.current.element.offsetHeight,z.width=r.current.element.offsetWidth),Object.freeze(z),C.current&&!te(r.current.lastBounds,z)&&p(r.current.lastBounds=z)};return[u,g?$(u,g):u,w?$(u,w):u]},[p,c,w,g]);function I(){r.current.scrollContainers&&(r.current.scrollContainers.forEach(u=>u.removeEventListener("scroll",S,!0)),r.current.scrollContainers=null),r.current.resizeObserver&&(r.current.resizeObserver.disconnect(),r.current.resizeObserver=null)}function k(){r.current.element&&(r.current.resizeObserver=new d(S),r.current.resizeObserver.observe(r.current.element),a&&r.current.scrollContainers&&r.current.scrollContainers.forEach(u=>u.addEventListener("scroll",S,{capture:!0,passive:!0})))}const O=u=>{!u||u===r.current.element||(I(),r.current.element=u,r.current.scrollContainers=j(u),k())};return Z(S,!!a),Q(y),m.useEffect(()=>{I(),k()},[a,S,y]),m.useEffect(()=>I,[]),[O,h,R]}function Q(e){m.useEffect(()=>{const t=e;return window.addEventListener("resize",t),()=>void window.removeEventListener("resize",t)},[e])}function Z(e,t){m.useEffect(()=>{if(t){const a=e;return window.addEventListener("scroll",a,{capture:!0,passive:!0}),()=>void window.removeEventListener("scroll",a,!0)}},[e,t])}function j(e){const t=[];if(!e||e===document.body)return t;const{overflow:a,overflowX:o,overflowY:c}=window.getComputedStyle(e);return[a,o,c].some(d=>d==="auto"||d==="scroll")&&t.push(e),[...t,...j(e.parentElement)]}const ee=["x","y","top","bottom","left","right","width","height"],te=(e,t)=>ee.every(a=>e[a]===t[a]),re=L.figure`
  margin: 0px;
  position: relative;
  background-size: cover;
  background-position: center center;
  width: ${e=>e.width?e.width:"100%"};
  height: ${e=>e.height?e.height:"100%"};
  overflow: hidden;
  font-size: 10px;
  line-height: 12px;
  border-radius: 5px;
  display: flex; // added
  flex-direction: column; // added
  justify-content: space-between;
  border: 2px solid var(--canvastext);
  cursor: pointer;
  &:focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 2px;
  }
`,ne=L.img`
  height: 100%;
  //width: 100%;
  color: var(--mainRed);
  // display: none;
  background-image: ${e=>e.url=="url(/drive_pictures/none)"?"none":e.url};
  background-color: ${e=>e.color=="none"?"none":"#"+e.color};
  background-size: cover;
  background-position: center;
`,ie=L.figcaption`
  border-radius: 0px 0px 5px 5px;
  // position: absolute;
  border-top: 2px solid var(--canvastext);
  height: 65px;
  width: inherit;
  background: var(--canvas);
`,B=L.p`
  text-transform: capitalize;
  text-align: ${e=>e.textAlign?e.textAlign:"left"};
  line-height: ${e=>e.lineHeight?e.lineHeight:"normal"};
  margin: 7px;
  width: 100%;
  color: var(--canvastext);
  font-family: helvetica;
  font-size: 12px;
  overflow: hidden;
  white-space: ${e=>e.whiteSpace?e.whiteSpace:"nowrap"};
  text-overflow: ellipsis;
`,se=e=>{let t=`url(/drive_pictures/${e.image})`;return T(re,{"data-test":"Course Card",className:"driveCard","aria-labelledby":"card-label role-label",url:t,color:e.color,width:e.width,height:e.height,children:[b(ne,{url:t,color:e.color}),T(ie,{style:{backgroundColor:e.isSelected?"var(--lightBlue)":""},children:[b(B,{id:"card-label",textAlign:e.textAlign,lineHeight:e.lineHeight,whiteSpace:e.whiteSpace,style:{color:e.isSelected?"black":"var(--canvastext)"},children:b("b",{"data-test":"driveCardLabel",children:e.label})}),b(B,{id:"role-label",style:{color:e.isSelected?"black":"var(--canvastext)"},children:e.roleLabel})]})]})};function le(e,t,a){const o=()=>t[e.findIndex(h=>matchMedia(h).matches)]||a,[c,d]=m.useState(o);return m.useEffect(()=>{const h=()=>d(o);return window.addEventListener("resize",h),()=>window.removeEventListener("resize",h)},[]),c}const oe=L.div`
  border-radius: 5px;
  padding-right: 4px;
  padding-bottom: 4px;
  &:focus {
    outline: 2px solid var(--canvastext);
    outline-offset: 3px;
  }
`;function ge(e){const t=N(V),a=M(W);if(m.useEffect(()=>(a(c=>[...c,{atom:P,value:null},{atom:H,value:[]}]),a(c=>[...c,{atom:P,value:null}])),[a]),t.length==0)return null;let o=t.filter(c=>c.canViewCourse!="0");return b("div",{style:e.style,children:b(ae,{courses:o,drivePathSyncKey:"main",types:["course"],isOneDriveSelect:!1})})}const ae=e=>{const{isOneDriveSelect:t,courses:a,drivePathSyncKey:o,types:c}=e,[d,h]=q(H),p=M(F),r=le(["(min-width: 1500px)","(min-width: 1000px)","(min-width: 600px)"],[5,4,3],2),[w,{width:g}]=J();let C=[];c[0]==="course"&&g!==0&&(C=a);const[R,y]=m.useMemo(()=>{let n=new Array(r).fill(0),i=C.map(s=>{const f=n.indexOf(Math.min(...n)),v=g/r*f+20,l=(n[f]+=270)-270;return{...s,x:v,y:l,width:g/r-40,height:230,drivePathSyncKey:o}});return[n,i]},[r,C,g]),S=U(y,{key:n=>n.courseId,from:({x:n,y:i,width:s,height:f})=>({opacity:0,x:n,y:i,width:s,height:f}),enter:{opacity:1},update:({x:n,y:i,width:s,height:f})=>({x:n,y:i,width:s,height:f}),leave:{height:0,opacity:0},config:{mass:5,tension:500,friction:100},trail:25}),I=X(({set:n})=>()=>{n(P,"SelectedCourse")});let k=M(Y);const O=(n,i)=>{k(i.courseId),p({page:"course",tool:"dashboard",view:"",params:{courseId:i.courseId}})},u=(n,i)=>{n.preventDefault(),n.stopPropagation(),t?!n.shiftKey&&!n.metaKey&&(h(()=>[i]),I()):!n.shiftKey&&!n.metaKey?(h(()=>[i]),I()):n.shiftKey&&!n.metaKey?h(s=>{if(s.length>0){let f=[],v="";s.length===1?v=s[0].driveId:(f=[...s],v=s[s.length-1].driveId);let l=y.findIndex(x=>x.driveId===i.driveId),A=y.findIndex(x=>x.driveId===v);if(l>A){let E=y.slice(A,l+1).map(D=>D);f=[...f,...E]}else{let E=y.slice(l,A+1).map(D=>D);f=[...f,...E]}return f.reduce((x,E)=>x.find(D=>D.driveId==E.driveId)?x:[...x,E],[])}else return[...s,i]}):!n.shiftKey&&n.metaKey&&h(s=>{if(s.filter(v=>v.driveId===i.driveId).length>0){const v=[];for(let l=0;l<s.length;l++)s[l].driveId!=i.driveId&&v.push(s[l]);return v}else return[...s,i]})},K=n=>d.length==0?!1:d.filter(s=>s.courseId===n.courseId&&s.drivePathSyncKey===o).length>0;return b("div",{className:"drivecardContainer",id:"test",children:b("div",{ref:w,className:"driveCardList",style:{height:Math.max(...R)},children:S((n,i,s,f)=>{let v=K(i);return b(G.div,{style:n,children:b(oe,{role:"button",style:{height:"100%"},tabIndex:"0",onClick:l=>{l.preventDefault(),l.stopPropagation(),u(l,i)},onKeyDown:l=>{l.key==="Enter"&&(v?O(l,i):u(l,i))},onDoubleClick:l=>{l.preventDefault(),l.stopPropagation(),O(l,i)},children:b(se,{image:i.image,color:i.color,label:i.label,isSelected:v,roleLabel:i.roleLabel})})})})})})};export{ge as default};
