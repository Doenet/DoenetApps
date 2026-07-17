import{r as o,a,b6 as r,j as e,b7 as s,b8 as d,h as l}from"./index-ff2008c3.js";const c=l.video`
  width: 1200px;
  /* margin-left: 20vw; */
  //transform: scale(1.3);
  object-fit: cover;
  object-position: 25% 25%;
  @media (max-width: 780px) {
    height: 500px;
  }
  @media (max-width: 450px) {
    height: 150px;
  }
`;function h(){const t=o.useRef(null),i=()=>{t&&t.current&&t.current.play().catch(n=>{console.error("Error attempting to play",n)})};return o.useEffect(()=>{i()},[]),a(r,{overflow:"hidden",width:["350px","30vw","30vw","30vw"],children:[e(r,{marginLeft:["-70px","-300px","-300px","-300px"],overflow:"hidden",width:["500px","100vw","100vw","100vw"],children:e(c,{fluid:"false",loop:!0,muted:!0,playsInline:!0,alt:"Demonstration video on making DoenetML content",ref:t,controls:!0,zIndex:"1",children:e("source",{src:"/planet_orbits_smooth.webm",type:"video/webm"})})}),e(s,{above:"sm",children:e(d,{color:"white",href:"https://www.doenet.org/portfolioviewer/_IDTeopxcrVV2EzMEA4Cg9",children:"How to Make this Animation"})})]})}export{h as default};
