import React from "react";
import styled from "styled-components";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight, faCog } from "@fortawesome/free-solid-svg-icons";
import { atom, useRecoilCallback, useSetRecoilState } from "recoil";
import { pageToolViewAtom } from "../NewToolRoot";
import Banner from "../../../_reactComponents/PanelHeaderComponents/Banner.jsx";
import MigrationBanner from "../../../_reactComponents/PanelHeaderComponents/MigrationBanner";

export const mainPanelClickAtom = atom({
  key: "mainPanelClickAtom",
  default: [],
});

const ContentWrapper = styled.div`
  grid-area: mainPanel;
  background-color: var(--canvas);
  color: var(--canvastext);
  height: 100%;
  // border-radius: 0 0 4px 4px;
  overflow: auto;
`;

const ControlsWrapper = styled.div`
  grid-area: mainControls;
  display: flex;
  flex-direction: row;
  gap: 4px;
  background-color: var(--canvas);
  // border-radius: 4px 4px 0 0;
  overflow: auto hidden;
  justify-content: flex-start;
  align-items: center;
  height: 40px;
  // border-bottom: 2px solid var(--mainGray);
`;

const OpenButton = styled.button`
  background-color: var(--mainBlue);
  height: 35px;
  width: 20px;
  color: var(--canvas);
  border: none;
  position: relative;
  cursor: pointer;
`;

export default function MainPanel({
  headerControls,
  children,
  setMenusOpen,
  openMenuButton,
  displaySettings,
  hasNoHeaderPanel,
}) {
  // console.log('>>>===main panel');
  const setPageToolView = useSetRecoilState(pageToolViewAtom);

  const mpOnClick = useRecoilCallback(({ set, snapshot }) => async () => {
    const atomArray = await snapshot.getPromise(mainPanelClickAtom);
    // console.log(">>>mpOnClick",atomArray)
    for (let obj of atomArray) {
      if (typeof obj === "function") {
        obj();
      } else {
        set(obj.atom, obj.value);
      }
      // console.log(">>>obj",obj)
    }
  });
  const controls = [];

  if (openMenuButton) {
    controls.push(
      <OpenButton key="openbutton" onClick={() => setMenusOpen(true)}>
        <FontAwesomeIcon icon={faChevronRight} />
      </OpenButton>,
    );
  }
  if (headerControls) {
    for (const [i, control] of Object.entries(headerControls)) {
      controls.push(<span key={`headControl${i}`}>{control}</span>);
    }
  }

  const contents = [];

  if (displaySettings) {
    //TODO
    // contents.push(<SettingsButton onClick={()=>setPageToolView({page:'settings',tool:'',view:''})}><FontAwesomeIcon icon={faCog}/></SettingsButton>)
  }
  if (children) {
    contents.push(children);
  }

  return (
    <>
      {hasNoHeaderPanel === true ? null : (
        <ControlsWrapper role="navigation" data-test="Main Panel Controls">
          {controls}
        </ControlsWrapper>
      )}
      <ContentWrapper
        onClick={mpOnClick}
        role="main"
        data-test="Main Panel"
        id="mainPanel"
      >
        <MigrationBanner variant="thin" />
        {contents}
      </ContentWrapper>
    </>
  );
}
