import cssesc from "cssesc";

// since component names include a "/", escape them before using them as css identifiers
function cesc(s: string) {
  s = cssesc(s, { isIdentifier: true });
  if (s.slice(0, 2) === "\\#") {
    // just for convenience in case have a hash, don't escape leading #
    s = s.slice(1);
  }
  return s;
}

// In cypress tests, we need to escape the escaped component names
// for it to find them in the dom.
// Use it as cy.get(cesc2('#/component_name))
function cesc2(s: string) {
  return cesc(cesc(s));
}

describe.skip("doenetEditor test", function () {
  // const userId = "cyuserId";
  // const studentUserId = "cyStudentUserId";
  // const userId = "devuserId";
  const courseId = "courseid1";
  const doenetId = "activity1id";
  // const pageDoenetId = "_page1id";

  const headerPixels = 40;

  it("basic test of update button", () => {
    const doenetMLString = "abcdefg";
    cy.get(".cm-content").type(doenetMLString);
    cy.get(cesc2("#/_document1")).should("not.contain", "a");
    cy.get('[data-test="Viewer Update Button"]').click();
    cy.get(cesc2("#/_document1")).contains(doenetMLString);
  });

  it("ctrl+s updates viewer", () => {
    const doenetMLString = "abcdefg";
    cy.get(".cm-content").type(doenetMLString);
    cy.get(cesc2("#/_document1")).should("not.contain", "a");
    cy.get(".cm-content").type("{control}{s}");
    cy.get(cesc2("#/_document1")).contains(doenetMLString);
  });

  it("undo event prompts save to server", () => {
    const doenetMLString = "abcdefg";
    cy.get(".cm-content").type(doenetMLString);

    cy.get(".cm-content").type("{control}{s}");
    cy.wait(1000); // wait for the doc to save to the server

    cy.reload();
    cy.get(".cm-content").contains(doenetMLString);
    cy.get(".cm-content").type("newly added content");
    cy.get(".cm-content").type("\n");
    cy.get(".cm-content").type("even more stuff");

    cy.wait(5000); // make sure we have a debounced save event from the newly typed text
    if (Cypress.platform === "darwin") {
      cy.get(".cm-content").type("{command}{z}");
      cy.get(".cm-content").type("{command}{z}");
      cy.get(".cm-content").type("{command}{shift}{z}");
    } else {
      cy.get(".cm-content").type("{control}{z}");
      cy.get(".cm-content").type("{control}{z}");
      cy.get(".cm-content").type("{control}{y}");
    }
    cy.wait(5000); // wait for another debounce after the undo event
    cy.reload();
    cy.get(cesc2("#/_document1")).contains(doenetMLString);
    cy.get(cesc2("#/_document1")).contains("newly added content");
    cy.get(cesc2("#/_document1")).should("not.contain", "even more stuff");
  });

  it("command+s updates viewer", () => {
    const doenetMLString = "abcdefg";
    cy.get(".cm-content").type(doenetMLString);
    cy.get(cesc2("#/_document1")).should("not.contain", "a");
    cy.get(".cm-content").type("{command}{s}");
    cy.get(cesc2("#/_document1")).contains(doenetMLString);
  });

  it("Page Variant Menu Test", () => {
    const componentName = "sequenceContainer";
    const doenetMLString = `<p name='${componentName}' ><selectFromSequence   /></p>`;
    // const doenetMLString = `<selectFromSequence  assignNames='${componentName}' />`
    cy.get(".cm-content").type(doenetMLString);
    cy.get('[data-test="Viewer Update Button"]').click();
    cy.get(cesc2(`#/${componentName}`)).contains("1");

    cy.get('[data-test="PageVariant Menu"]').click();

    cy.get('[data-test="Variant Index Input"]')
      .invoke("val", "3")
      .type(" {enter}");
    cy.get(cesc2(`#/${componentName}`)).contains("3");

    cy.get('[data-test="Variant Name Input"]')
      .invoke("val", "4")
      .trigger("change");
    cy.get(cesc2(`#/${componentName}`)).contains("4");
  });

  it("Assign activity and navigate directly to URL", () => {
    const doenetMLString =
      '<problem name="problem1"><answer>42</answer></problem>';

    cy.get(".cm-content").type(doenetMLString);
    // cy.get('[data-test="Viewer Update Button"]').click();

    cy.get('[data-test="AssignmentSettingsMenu Menu"]').click();
    cy.get('[data-test="Assign Activity"]').click();
    cy.get('[data-test="Unassign Activity"]').should("be.visible");

    cy.visit(`/course?tool=assignment&doenetId=${doenetId}`);
    cy.get(cesc2("#/problem1_title")).contains("Problem 1");
  });

  it("Assign activity and navigate using Breadcrumbs", () => {
    const doenetMLString =
      '<problem name="problem1"><answer>42</answer></problem>';

    cy.get(".cm-content").type(doenetMLString);
    // cy.get('[data-test="Viewer Update Button"]').click(); //Shouldn't need to click the update button
    cy.get('[data-test="AssignmentSettingsMenu Menu"]').click();
    cy.get('[data-test="Assign Activity"]').click();
    cy.get('[data-test="Unassign Activity"]').should("be.visible");
    cy.wait(200);
    cy.get('[data-test="Crumb Menu"]').click({ force: true });
    cy.get('[data-test="Crumb Menu Item 2"]').click();
    cy.get(".navigationRow").should("have.length", 1); //Need this to wait for the row to appear
    cy.get(".navigationRow").eq(0).get(".navigationColumn1").click();
    cy.get('[data-test="View Assigned Activity"]').click();
    cy.get(cesc2("#/problem1_title")).contains("Problem 1");
  });

  it("Assign two-page activity", () => {
    const doenetMLString1 = `
<section>
  <p><m>1+1 =</m> <answer name="a">2</answer></p>
  <p>Your answer: $a</p>
</section>`;

    const doenetMLString2 = `
<section>
  <p><m>1 \\times 1 =</m> <answer name="a">1</answer></p>
  <p>Your answer: $a</p>
</section>`;

    cy.get(".cm-content").type(doenetMLString1);
    // cy.get('[data-test="Viewer Update Button"]').click();

    cy.get('[data-test="AssignmentSettingsMenu Menu"]').click();
    cy.get('[data-test="Assign Activity"]').click();
    cy.get('[data-test="Unassign Activity"]').should("be.visible");

    cy.wait(200);

    cy.get('[data-test="Crumb Menu"]').click({ force: true });
    cy.get('[data-test="Crumb Menu Item 2"]').click();

    cy.get(".navigationRow").should("have.length", 1); //Need this to wait for the row to appear
    cy.get(".navigationRow").eq(0).get(".navigationColumn1").click();
    cy.get('[data-test="Add Page"]').click();
    cy.get(".navigationRow")
      .eq(0)
      .get('[data-test="folderToggleOpenIcon"]')
      .click();

    // cy.get('.navigationRow').should('have.length',3);

    cy.get(".navigationRow").eq(2).find(".navigationColumn1").click();
    cy.get('[data-test="Edit Page"]').click();

    cy.get(".cm-content").type(doenetMLString2);

    cy.get('[data-test="AssignmentSettingsMenu Menu"]').click();
    cy.get('[data-test="Assign Activity"]').click();

    cy.get('[data-test="Unassign Activity"]').should("be.visible");

    cy.wait(500);

    cy.get('[data-test="Crumb Menu"]').click({ force: true });
    cy.get('[data-test="Crumb Menu Item 2"]').click();
    cy.get(".navigationRow").eq(0).find(".navigationColumn1").click();

    // cy.signin({ userId: studentUserId });

    cy.visit(`/course?tool=navigation&courseId=${courseId}`);

    cy.get(".navigationRow").should("have.length", 1); //Need this to wait for the row to appear
    cy.get(".navigationRow").eq(0).find(".navigationColumn1").click();

    cy.get('[data-test="View Activity"]').click();

    cy.get(cesc2("#page1/_section1_title")).should("have.text", "Section 1");

    cy.get('[data-test="Possible Points"]').should("have.text", "10");
    cy.get('[data-test="Final Score"]').should("have.text", "0");
    cy.get('[data-test="Attempt Percent"]').should("have.text", "0%");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "0%");

    cy.get(cesc2("#page1/a") + " textarea").type("{enter}", { force: true });
    cy.get(cesc2("#page1/_p2") + " .mjx-mrow").should("contain.text", "\uff3f");

    cy.get('[data-test="Item 1 Credit"]').should("have.text", "0%");
    cy.get('[data-test="Item 2 Credit"]').should("have.text", "0%");
    cy.get('[data-test="Final Score"]').should("have.text", "0");
    cy.get('[data-test="Attempt Percent"]').should("have.text", "0%");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "0%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");

    // TODO: why does this frequently fail if don't wait here?
    cy.wait(500);
    cy.get(cesc2("#page1/a") + " textarea").type("2{enter}", { force: true });
    cy.get(cesc2("#page1/_p2") + " .mjx-mrow").should("contain.text", "2");

    cy.get('[data-test="Final Score"]').should("have.text", "5");
    cy.get('[data-test="Attempt Percent"]').should("have.text", "50%");
    cy.get('[data-test="Item 1 Credit"]').should("have.text", "100%");
    cy.get('[data-test="Item 2 Credit"]').should("have.text", "0%");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "50%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");

    cy.get("[data-test=next]").click();

    cy.wait(2000); // make sure debounce occurred while waiting

    cy.get(cesc2("#page2/_section1_title")).should("have.text", "Section 2");

    cy.get('[data-test="Final Score"]').should("have.text", "5");
    cy.get('[data-test="Attempt Percent"]').should("have.text", "50%");
    cy.get('[data-test="Item 1 Credit"]').should("have.text", "100%");
    cy.get('[data-test="Item 2 Credit"]').should("have.text", "0%");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "50%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");

    cy.get(cesc2("#page2/a") + " textarea").type("1{enter}", { force: true });
    cy.get(cesc2("#page2/_p2") + " .mjx-mrow").should("contain.text", "1");

    // cy.get('[data-test="Final Score"]').should('have.text', '10')
    // cy.get('[data-test="Attempt Percent"]').should('have.text', '100%')
    // cy.get('[data-test="Item 1 Credit"]').should('have.text', '100%')
    // cy.get('[data-test="Item 2 Credit"]').should('have.text', '100%')
    // cy.get('[data-test="Assignment Percent"]').should('have.text', '100%')
    // cy.get('[data-test="Possible Points"]').should('have.text', '10')

    cy.log(
      "Reloading immediately does not save state but saves credit achieved",
    );
    cy.reload();

    cy.get(cesc2("#page2/_section1_title")).should("have.text", "Section 2");

    cy.get('[data-test="Final Score"]').should("have.text", "10");
    cy.get('[data-test="Attempt Percent"]').should("have.text", "100%");
    cy.get('[data-test="Item 1 Credit"]').should("have.text", "100%");
    cy.get('[data-test="Item 2 Credit"]').should("have.text", "100%");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "100%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");

    cy.log("State on previous page was saved");
    cy.get("[data-test=previous]").click();
    cy.get(cesc2("#page1/_section1_title")).should("have.text", "Section 1");
    cy.get(cesc2("#page1/_p2") + " .mjx-mrow").should("contain.text", "2");

    cy.get("[data-test=next]").click();
    cy.get(cesc2("#page2/_section1_title")).should("have.text", "Section 2");

    cy.log("New attempt, goes back to page 1");
    cy.get('[data-test="New Attempt"]').click();

    cy.get(cesc2("#page1/_section1_title")).should("have.text", "Section 1");

    cy.get('[data-test="Attempt Percent"]').should("have.text", "0%");
    cy.get('[data-test="Final Score"]').should("have.text", "10");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "100%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");

    cy.get("[data-test=next]").click();
    cy.get(cesc2("#page2/a") + " textarea").type("1{enter}", { force: true });

    cy.get(cesc2("#page2/_p2") + " .mjx-mrow").should("contain.text", "1");

    cy.get('[data-test="Attempt Percent"]').should("have.text", "50%");
    cy.get('[data-test="Item 1 Credit"]').should("have.text", "0%");
    cy.get('[data-test="Item 2 Credit"]').should("have.text", "100%");
    cy.get('[data-test="Final Score"]').should("have.text", "10");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "100%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");

    cy.wait(2000); // wait for debounce

    cy.log("Reloading after a wait does save state and credit achieved");
    cy.reload();

    cy.get(cesc2("#page2/_section1_title")).should("have.text", "Section 2");
    cy.get(cesc2("#page2/_p2") + " .mjx-mrow").should("contain.text", "1");

    cy.get('[data-test="Final Score"]').should("have.text", "10");
    cy.get('[data-test="Attempt Percent"]').should("have.text", "50%");
    cy.get('[data-test="Item 1 Credit"]').should("have.text", "0%");
    cy.get('[data-test="Item 2 Credit"]').should("have.text", "100%");
    cy.get('[data-test="Assignment Percent"]').should("have.text", "100%");
    cy.get('[data-test="Possible Points"]').should("have.text", "10");
  });

  it("animation stopped when click update button", () => {
    const doenetMLString = `
<number name="n">1</number>

<animateFromSequence target="n" animationMode="increase once" from="1" to="100" animationInterval="100" name="a" />

<p><callAction target="a" actionName="toggleAnimation" name="ca" >
<label>Toggle animation</label>
</callAction></p>
`;
    cy.get(".cm-content").type(doenetMLString);
    cy.get('[data-test="Viewer Update Button"]').click();
    cy.get(cesc2("#/n")).should("have.text", "1");

    cy.get(cesc2("#/ca_button")).click();
    cy.get(cesc2("#/n")).should("have.text", "2");
    cy.get(cesc2("#/n")).should("have.text", "3");

    cy.get(".cm-content").type("{ctrl+end}<p name='np'>More text</p>{enter}");

    cy.get('[data-test="Viewer Update Button"]').click();

    cy.get(cesc2("#/np")).should("have.text", "More text");

    cy.log("ensure animation has stopped");
    cy.get(cesc2("#/n")).should("have.text", "1");
    cy.wait(200);
    cy.get(cesc2("#/n")).should("have.text", "1");

    cy.get(cesc2("#/ca_button")).click();
    cy.get(cesc2("#/n")).should("have.text", "2");
    cy.get(cesc2("#/n")).should("have.text", "3");

    cy.get(cesc2("#/ca_button")).click();
    cy.wait(200);
    cy.get(cesc2("#/n")).contains(/3|4/);

    cy.get(".cm-content").type("{ctrl+end}<p name='np2'>And more</p>{enter}");

    cy.get('[data-test="Viewer Update Button"]').click();

    cy.get(cesc2("#/np2")).should("have.text", "And more");

    cy.log("ensure animation has stopped");
    cy.get(cesc2("#/n")).should("have.text", "1");
    cy.wait(200);
    cy.get(cesc2("#/n")).should("have.text", "1");

    cy.get(cesc2("#/ca_button")).click();
    cy.get(cesc2("#/n")).should("have.text", "2");
    cy.get(cesc2("#/n")).should("have.text", "3");

    cy.get(cesc2("#/ca_button")).click();
    cy.wait(200);
    cy.get(cesc2("#/n")).contains(/3|4/);
  });

  it("animation on when click update button", () => {
    const doenetMLString = `
<number name="n">1</number>

<animateFromSequence target="n" animationMode="increase once" from="1" to="100" animationInterval="100" name="a" animationOn />

<p><callAction target="a" actionName="toggleAnimation" name="ca" >
<label>Toggle animation</label>
</callAction></p>
`;
    cy.get(".cm-content").type(doenetMLString);
    cy.get('[data-test="Viewer Update Button"]').click();
    cy.get(cesc2("#/n")).should("have.text", "1");
    cy.get(cesc2("#/n")).should("have.text", "2");
    cy.get(cesc2("#/n")).should("have.text", "3");

    cy.get(".cm-content").type("{ctrl+end}<p name='np'>More text</p>{enter}");

    cy.get('[data-test="Viewer Update Button"]').click();

    cy.get(cesc2("#/np")).should("have.text", "More text");

    cy.log("ensure animation has started again");
    cy.get(cesc2("#/n")).should("have.text", "1");
    cy.get(cesc2("#/n")).should("have.text", "2");
    cy.get(cesc2("#/n")).should("have.text", "3");

    cy.get(cesc2("#/ca_button")).click();
    cy.wait(200);
    cy.get(cesc2("#/n")).contains(/3|4/);

    cy.get(".cm-content").type("{ctrl+end}<p name='np2'>And more</p>{enter}");

    cy.get('[data-test="Viewer Update Button"]').click();

    cy.get(cesc2("#/np2")).should("have.text", "And more");

    cy.log("ensure animation has started again");
    cy.get(cesc2("#/n")).should("have.text", "1");
    cy.get(cesc2("#/n")).should("have.text", "2");
    cy.get(cesc2("#/n")).should("have.text", "3");

    cy.get(cesc2("#/ca_button")).click();
    cy.wait(200);
    cy.get(cesc2("#/n")).contains(/3|4/);
  });

  it("Repeatedly select same internal link", () => {
    const doenetMLString = `
<section>
<p><ref name="toAside" target="aside">Link to aside</ref></p>

<lorem generateParagraphs="8" />

<aside name="aside">
  <title name="asideTitle">The aside</title>
  <p name="insideAside">Content in aside</p>
</aside>

<lorem generateParagraphs="8" />

</section>`;

    cy.get(".cm-content").type(doenetMLString);
    cy.get('[data-test="Viewer Update Button"]').click();

    cy.get(cesc2("#/_section1_title")).should("have.text", "Section 1");
    cy.url().should("match", /[^#]/);

    cy.get('[data-test="Main Panel"]').then((el) => {
      expect(el.scrollTop()).eq(0);
    });

    cy.get(cesc2("#/asideTitle")).should("have.text", "The aside");
    cy.get(cesc2("#/insideAside")).should("not.exist");

    cy.get(cesc2("#/toAside")).click();
    cy.url().should("match", /#\\\/aside$/);

    cy.get(cesc2("#/aside")).then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });

    cy.get(cesc2("#/insideAside")).should("have.text", "Content in aside");

    cy.get(cesc2("#/asideTitle")).click();
    cy.get(cesc2("#/insideAside")).should("not.exist");

    cy.get(cesc2("#/toAside")).scrollIntoView();

    cy.get(cesc2("#/toAside")).then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });

    cy.url().should("match", /#\\\/aside$/);

    cy.get(cesc2("#/toAside")).click();
    cy.get(cesc2("#/insideAside")).should("have.text", "Content in aside");

    cy.url().should("match", /#\\\/aside$/);

    cy.get(cesc2("#/aside")).then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });
  });

  //This is broken
  it.skip("Navigating back remembers position where clicked internal link", () => {
    const doenetMLString = `
<section>
<lorem generateParagraphs="8" />

<p><ref name="toAside" target="aside">Link to aside</ref></p>

<lorem generateParagraphs="8" />

<aside name="aside">
  <title name="asideTitle">The aside</title>
  <p name="insideAside">Content in aside</p>
</aside>

<lorem generateParagraphs="8" />

<p name="bottom">bottom</p>

<lorem generateParagraphs="8" />

</section>`;

    cy.get(".cm-content").type(doenetMLString);
    cy.get('[data-test="Viewer Update Button"]').click();

    cy.get("#\\/_section1_title").should("have.text", "Section 1");
    cy.url().should("match", /[^#]/);

    cy.get('[data-test="Main Panel"]').then((el) => {
      expect(el.scrollTop()).eq(0);
    });

    cy.get(cesc2("#/asideTitle")).should("have.text", "The aside");
    cy.get(cesc2("#/insideAside")).should("not.exist");

    cy.get(cesc2("#/toAside")).scrollIntoView();

    cy.get(cesc2("#/toAside")).then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });

    cy.get(cesc2("#/toAside")).click();
    cy.url().should("match", /#\/aside$/);

    cy.get(cesc2("#/aside")).then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });

    cy.get(cesc2("#/insideAside")).should("have.text", "Content in aside");

    cy.get("#\\/bottom").scrollIntoView();

    cy.get("#\\/bottom").then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });

    cy.go("back");
    cy.url().should("match", /[^#]/);

    cy.get(cesc2("#/toAside")).then((el) => {
      const rect = el[0].getBoundingClientRect();
      expect(rect.top)
        .gt(headerPixels - 1)
        .lt(headerPixels + 1);
    });
  });
});
