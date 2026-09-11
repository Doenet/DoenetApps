import React, { useEffect, useState } from "react";
import {
  Styles,
  Table,
  studentData,
  attemptData,
  assignmentData,
  attemptDataQuery,
  studentDataQuery,
  overviewDataQuery,
  overviewData,
} from "./Gradebook";

import {
  atom,
  useSetRecoilState,
  useRecoilValue,
  useRecoilValueLoadable,
  useRecoilCallback,
} from "recoil";

import { pageToolViewAtom, searchParamAtomFamily } from "../NewToolRoot";
import { useToast, toastType } from "../Toast";
import ButtonGroup from "../../../_reactComponents/PanelHeaderComponents/ButtonGroup";
import Button from "../../../_reactComponents/PanelHeaderComponents/Button";
import DropdownMenu from "../../../_reactComponents/PanelHeaderComponents/DropdownMenu";
import { suppressMenusAtom } from "../NewToolRoot";
import { effectivePermissionsByCourseId } from "../../../_reactComponents/PanelHeaderComponents/RoleDropdown";
import axios from "axios";
import { coursePermissionsAndSettingsByCourseId } from "../../../_reactComponents/Course/CourseActions";

export const processGradesAtom = atom({
  key: "processGradesAtom",
  default: "Assignment Table",
});

export const headersGradesAtom = atom({
  key: "headersGradesAtom",
  default: [],
});

export const entriesGradesAtom = atom({
  key: "entriesGradesAtom",
  default: [],
});

const getUserId = (students, name) => {
  for (let userId in students) {
    //console.log(userId, students[userId].firstName);

    if (students[userId].firstName + " " + students[userId].lastName == name) {
      return userId;
    }
  }
  return -1;
};

function UploadChoices({ doenetId, maxAttempts }) {
  let headers = useRecoilValue(headersGradesAtom);
  let rows = useRecoilValue(entriesGradesAtom);
  const addToast = useToast();
  const setProcess = useSetRecoilState(processGradesAtom);
  let assignments = useRecoilValueLoadable(assignmentData);
  let [scoreIndex, setScoreIndex] = useState(null);
  let [selectedColumnIndex, setSelectedColumnIndex] = useState(1);
  let [attemptNumber, setAttemptNumber] = useState(null);
  let [selectedAttemptIndex, setSelectedAttemptIndex] = useState(1);
  //Need points for assignment, but wait for loaded

  const refreshGradebook = useRecoilCallback(
    ({ set, snapshot }) =>
      async ({ doenetId, addToast }) => {
        const courseId = await snapshot.getPromise(
          searchParamAtomFamily("courseId"),
        );

        //TODO: switch this to a refersher with sync
        const {
          data: { assignmentAttemptsData },
        } = await axios.get("/api/loadGradebookAssignmentAttempts.php", {
          params: { courseId, doenetId },
        });
        const {
          data: { gradebookEnrollment },
        } = await axios.get("/api/loadGradebookEnrollment.php", {
          params: { courseId },
        });
        const {
          data: { overview },
        } = await axios.get("/api/loadGradebookOverview.php", {
          params: { courseId },
        });

        set(attemptDataQuery(doenetId), assignmentAttemptsData);
        set(studentDataQuery, gradebookEnrollment);
        set(overviewDataQuery, overview);

        addToast(`Updated scores!`);
        set(processGradesAtom, "Assignment Table");
      },
  );

  if (assignments.state !== "hasValue") {
    return null;
  }

  const totalPointsOrPercent =
    assignments.contents?.[doenetId]?.totalPointsOrPercent;

  if (!headers.includes("Email")) {
    addToast("Need a column header named 'Email' ", toastType.ERROR);
    setProcess("Assignment Table");
    return null;
  }

  let columnIndexes = [];
  let validColumns = headers.filter((_, i) => {
    //TODO: Handle percent.  We need number to handle 200.00 is 200
    let columnPoints = Number(rows?.[0]?.[i]);
    if (columnPoints == totalPointsOrPercent) {
      columnIndexes.push(i);
    }
    return columnPoints == totalPointsOrPercent;
  });

  if (validColumns.length < 1) {
    addToast(
      `Need a column with an assignment worth ${totalPointsOrPercent} points in the second row`,
      toastType.ERROR,
    );
    setProcess("Assignment Table");
    return null;
  }

  if (!scoreIndex) {
    setScoreIndex(columnIndexes[0]); //Default to the first one
  }

  let studentColumn = headers.indexOf("Student");
  let emailColumn = headers.indexOf("Email");

  let tableRows = [];
  let emails = [];
  let scores = [];
  for (let row of rows) {
    let name = studentColumn === -1 ? null : row[studentColumn];
    let email = row[emailColumn];
    let score = row[scoreIndex];

    if (email !== "") {
      emails.push(email); //needed for payload
      scores.push(score); //needed for payload
      tableRows.push(
        <tr key={email}>
          {" "}
          <td>{name}</td>
          <td>{email}</td>
          <td>{score}</td>
        </tr>,
      );
    }
  }

  let importTable = (
    <table>
      <tr>
        <th style={{ width: "200px" }}>Student</th>
        <th style={{ width: "200px" }}>Email</th>
        <th style={{ width: "50px" }}>Score</th>
      </tr>

      {tableRows}
    </table>
  );

  let dropdownItems = [];
  for (let [i, name] of Object.entries(validColumns)) {
    dropdownItems.push([i, name]);
  }

  let attemptDropdownItems = [];
  if (attemptNumber === null) {
    attemptDropdownItems.push([0, `Select Attempt Number`]);
  }

  for (let i = 1; i <= maxAttempts; i++) {
    attemptDropdownItems.push([i, `Attempt Number ${i}`]);
  }
  attemptDropdownItems.push([Number(maxAttempts) + 1, `New Attempt Number`]);

  let descriptionOfUpload = null;
  if (attemptNumber) {
    if (Number(maxAttempts) + 1 === attemptNumber) {
      //insert
      descriptionOfUpload = (
        <div>
          Use column <b>{validColumns[Number(selectedColumnIndex) - 1]}</b> to
          insert a new <b>Attempt Number {attemptNumber}</b>?
        </div>
      );
    } else {
      //update
      descriptionOfUpload = (
        <div>
          Use column <b>{validColumns[Number(selectedColumnIndex) - 1]}</b> to
          change <b>Attempt Number {attemptNumber}</b> scores?
        </div>
      );
    }
  }

  {
    attemptNumber ? (
      <div>
        Use column <b>{validColumns[Number(selectedColumnIndex) - 1]}</b> as{" "}
        <b>Attempt Number {attemptNumber}</b> to{" "}
        {Number(maxAttempts) + 1 === attemptNumber ? "insert" : "override"}{" "}
        scores?
      </div>
    ) : null;
  }

  return (
    <>
      <div>
        {validColumns.length} column{validColumns.length > 1 ? "s" : null} match{" "}
        {totalPointsOrPercent} total points{" "}
      </div>
      <div>
        <DropdownMenu
          items={dropdownItems}
          valueIndex={selectedColumnIndex}
          width="400px"
          onChange={({ value }) => {
            setSelectedColumnIndex(Number(value) + 1);
            setScoreIndex(columnIndexes[value]);
          }}
        />
      </div>
      <br />
      <div>
        <DropdownMenu
          items={attemptDropdownItems}
          valueIndex={selectedAttemptIndex}
          width="400px"
          onChange={({ value }) => {
            setSelectedAttemptIndex(value);
            setAttemptNumber(value);
          }}
        />
      </div>
      <br />

      {descriptionOfUpload}
      <ButtonGroup>
        <Button
          alert
          value="Cancel"
          onClick={() => {
            addToast(`Override Cancelled`);
            setProcess("Assignment Table");
          }}
        />
        {attemptNumber ? (
          <Button
            value="Accept"
            onClick={() => {
              let payload = {
                doenetId,
                attemptNumber,
                emails,
                scores,
              };
              axios
                .post("/api/saveOverrideGrades.php", payload)
                .then(({ data }) => {
                  if (data.success) {
                    if (data.failedEmails?.length > 0) {
                      addToast(
                        `Skipped ${
                          data.failedEmails.length
                        } row(s) with no enrolled student or an unreadable score: ${data.failedEmails.join(
                          ", ",
                        )}`,
                        toastType.ERROR,
                      );
                    }
                    refreshGradebook({ doenetId, addToast });
                  } else {
                    addToast(data.message, toastType.ERROR);
                    setProcess("Assignment Table");
                  }
                })
                .catch((e) => {
                  addToast(
                    e?.message ?? "Error saving grades",
                    toastType.ERROR,
                  );
                  setProcess("Assignment Table");
                });
            }}
          />
        ) : null}
      </ButtonGroup>
      <br />

      {importTable}
    </>
  );
}

export default function GradebookAssignmentView() {
  const setPageToolView = useSetRecoilState(pageToolViewAtom);
  let doenetId = useRecoilValue(searchParamAtomFamily("doenetId"));
  let courseId = useRecoilValue(searchParamAtomFamily("courseId"));
  let attempts = useRecoilValueLoadable(attemptData(doenetId));
  let overview = useRecoilValueLoadable(overviewData);
  let students = useRecoilValueLoadable(studentData);
  let noStudentHasASection =
    students.contents[Object.keys(students.contents)?.[0]]
      ?.noStudentHasASection;
  let process = useRecoilValue(processGradesAtom);
  const setSuppressMenus = useSetRecoilState(suppressMenusAtom);
  let { canViewAndModifyGrades } = useRecoilValue(
    effectivePermissionsByCourseId(courseId),
  );
  let assignments = useRecoilValueLoadable(assignmentData);

  useEffect(() => {
    if (canViewAndModifyGrades === "1") {
      setSuppressMenus([]);
    } else {
      setSuppressMenus(["GradeUpload"]);
    }
  }, [canViewAndModifyGrades, setSuppressMenus]);

  let course = useRecoilValue(coursePermissionsAndSettingsByCourseId(courseId));

  if (course?.canViewCourse == "0") {
    return <h1>No Access to view this page.</h1>;
  }

  //Wait for attempts and students to load
  if (
    attempts.state !== "hasValue" ||
    students.state !== "hasValue" ||
    assignments.state !== "hasValue"
  ) {
    return null;
  }

  const label = assignments.contents[doenetId].label;
  const totalPossiblePoints = Number(
    assignments.contents[doenetId]?.totalPointsOrPercent,
  );

  let assignmentsTable = {};
  let maxAttempts = 0;

  for (let userId in attempts.contents) {
    if (attempts.contents[userId]?.attempts) {
      let lastAttemptNumber = Math.max(
        ...Object.keys(attempts.contents[userId].attempts).map(Number),
      );

      if (lastAttemptNumber > maxAttempts) {
        maxAttempts = lastAttemptNumber;
      }
    }
  }

  if (process === "Upload Choice Table") {
    return <UploadChoices doenetId={doenetId} maxAttempts={maxAttempts} />;
  }

  assignmentsTable.headers = [];
  assignmentsTable.headers.push({
    Header: "Student",
    Footer: "Possible Points",
    accessor: "student",
  });

  if (!noStudentHasASection) {
    assignmentsTable.headers.push({
      Header: "Section",
      Footer: "",
      accessor: "section",
      disableFilters: true,
    });
  }

  for (let i = 1; i <= maxAttempts; i++) {
    assignmentsTable.headers.push({
      Header: "Attempt " + i,
      Footer: totalPossiblePoints,
      accessor: "a" + i,
      disableFilters: true,
      Cell: (row) => (
        <a
          onClick={() => {
            //TODO: proper access method from tableV8
            let name = row.cell.row.cells[0].value.props.children;
            let userId = getUserId(students.contents, name);

            //e.stopPropagation()
            //open("calendar", "fdsa", "f001");

            setPageToolView({
              page: "course",
              tool: "gradebookStudentAssignment",
              view: "",
              params: {
                courseId,
                doenetId,
                userId,
                attemptNumber: i,
                previousCrumb: "assignment",
              },
            });
          }}
        >
          {row.value}
        </a>
      ),
    });
  }

  assignmentsTable.headers.push({
    Header: "Assignment Total",
    Footer: totalPossiblePoints,
    accessor: "grade",
    disableFilters: true,
  });

  assignmentsTable.rows = [];

  for (let userId in students.contents) {
    let firstName = students.contents[userId].firstName;
    let lastName = students.contents[userId].lastName;
    let section = students.contents[userId].section;
    let row = {};

    let name = firstName + " " + lastName;
    row["student"] = (
      <a
        onClick={() => {
          setPageToolView({
            page: "course",
            tool: "gradebookStudentAssignment",
            view: "",
            params: { courseId, doenetId, userId, previousCrumb: "assignment" },
          });
        }}
      >
        {name}
      </a>
    );
    if (!noStudentHasASection) {
      row["section"] = section;
    }
    for (let i = 1; i <= maxAttempts; i++) {
      let attemptCredit = attempts.contents[userId]?.attempts[i];
      let pointsEarned =
        Math.round(attemptCredit * totalPossiblePoints * 100) / 100;

      row["a" + i] = attemptCredit === undefined ? "" : pointsEarned;
      // <Link to={`/attempt/?doenetId=${doenetId}&userId=${userId}&attemptNumber=${i}`}>
      // {
      //     attemptCredit ? attemptCredit * 100 + "%" : "" // if attemptCredit is `undefined`, we still want a table cell so that the footer column still shows up right.
      // }
      // </Link>
    }

    let totalCredit = overview?.contents?.[userId]?.assignments?.[doenetId];
    let totalPointsEarned =
      Math.round(totalCredit * totalPossiblePoints * 100) / 100;
    row["grade"] = totalCredit ? totalPointsEarned : "0";

    assignmentsTable.rows.push(row);
  }

  //TODO CRITIAL: update to use new table interface and remove the dep on rows
  return (
    <>
      <div style={{ paddingLeft: "8px" }}>
        <b>{label}</b>
      </div>
      <div style={{ paddingLeft: "8px" }}>
        {totalPossiblePoints} Points Possible
      </div>
      <Styles>
        <Table
          columns={assignmentsTable.headers}
          data={assignmentsTable.rows}
        />
      </Styles>
    </>
  );
}
