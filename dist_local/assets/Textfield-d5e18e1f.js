import{r as l,j as u,F as y,a as w,h as $}from"./index-ff2008c3.js";const S=$.input`
  /* margin: 0px 4px 0px 0px; */
  height: 24px;
  width: ${e=>e.width}; // Menu prop
  border: 2px solid
    ${e=>e.disabled?"var(--mainGray)":e.alert?"var(--mainRed)":"var(--canvastext)"};
  font-family: Arial;
  border-radius: var(--mainBorderRadius);
  color: var(--canvastext);
  resize: none;
  white-space: nowrap;
  /* padding: 0px 5px 0px 5px; */
  line-height: 24px;
  font-size: 14px;
  background-color: var(--canvas);
  cursor: ${e=>e.disabled?"not-allowed":"auto"};
  pointer-events: ${e=>e.disabled?"none":"auto"};
  &:focus {
    outline: 2px solid
      ${e=>e.disabled?"var(--mainGray)":e.alert?"var(--mainRed)":"var(--canvastext)"};
    outline-offset: 2px;
  }
`;function C(e){const s=e.label?"static":"none",c=e.vertical?"initial":"flex",[f,v]=l.useState(0),[x,h]=l.useState(0),n=l.useRef(null);var t={value:`${e.value}`},i={value:"Label:",fontSize:"14px",display:`${s}`,marginRight:"5px",marginBottom:`${c=="flex"?"none":"2px"}`},d={display:`${c}`,width:"auto",alignItems:"center"};l.useEffect(()=>{n.current.selectionStart=f,n.current.selectionEnd=x}),e.label&&(i.value=e.label),e.value&&(t.value=e.value),e.placeholder&&(t.placeholder=e.placeholder);var o=!1;e.disabled&&(o=!0);var r="";e.width&&e.width==="menu"&&(d.width="calc(var(--menuWidth) - 10px)",r="calc(var(--menuWidth) - 14px)",e.label&&!e.vertical&&(d.width="calc(var(--menuWidth) - 4px)",r="100%"));function b(a){e.onChange&&e.onChange(a),v(a.target.selectionStart),h(a.target.selectionEnd)}function g(a){e.onBlur&&e.onBlur(a)}function m(a){e.onKeyDown&&e.onKeyDown(a)}return u(y,{children:w("div",{style:d,children:[u("p",{style:i,id:"textfield-label",children:i.value}),u(S,{"data-test":e.dataTest,"aria-disabled":!!e.disabled,"aria-labelledby":"textfield-label",type:"text",width:r,readOnly:o,alert:e.alert,disabled:e.disabled,ref:n,value:e.value,placeholder:t.placeholder,"aria-label":t.ariaLabel,style:t,onChange:a=>{b(a)},onBlur:a=>{g(a)},onKeyDown:a=>{m(a)}})]})})}export{C as T};
