import{a as g,j as d,h as a}from"./index-5795133f.js";const x=a.div`
  display: ${e=>e.align};
  width: auto;
  align-items: center;
`,w=a.select`
  width: ${e=>e.width==="menu"?"var(--menuWidth)":e.width};
  /* background-color: var(--lightBlue); */
  border: ${e=>e.alert?"2px solid var(--mainRed)":e.disabled?"2px solid var(--mainGray)":"var(--mainBorder)"};
  border-radius: var(--mainBorderRadius);
  size: ${e=>e.size};
  overflow: auto;
  cursor: ${e=>e.disabled?"not-allowed":"auto"};
  &:focus {
    outline: 2px solid
      ${e=>e.alert?"var(--mainRed)":"var(--canvastext)"};
    outline-offset: 2px;
  }
`;a.option`
  key: ${e=>e.key};
  value: ${e=>e.value};
  selected: ${e=>e.selected};

  &:focus {
    background-color: var(--lightBlue);
  }
`;const y=a.p`
  font-size: 14px;
  display: ${e=>e.labelVisible};
  margin-right: 5px;
  margin-bottom: ${e=>e.align=="flex"?"none":"2px"};
`;function C(e){const o=e.label?"static":"none",c=e.width?e.width:"200px",u=e.size?e.size:4,s=e.alert?e.alert:null,r=e.disabled?e.disabled:null,b=!!e.disabled;var i="flex",n="";e.label&&(n=e.label,e.vertical&&(i="static"));function f(l){e.onChange&&e.onChange(l)}function h(l){e.onClick&&e.onClick(l)}function m(l){e.onBlur&&e.onBlur(l)}function v(l){e.onKeyDown&&e.onKeyDown(l)}var t="";return e.options&&(t=e.options),g(x,{align:i,children:[d(y,{id:"related-items-label",labelVisible:o,align:i,children:n}),d(w,{"data-test":e.dataTest,readOnly:b,width:c,size:u,onChange:l=>{f(l)},onClick:l=>{h(l)},onBlur:l=>{m(l)},onKeyDown:l=>{v(l)},alert:s,disabled:r,multiple:e.multiple,"aria-labelledby":"related-items-label","aria-disabled":!!e.disabled,role:"listbox","aria-multiselectable":e.multiple,children:t})]})}export{C as R};
