import { parseEmbedDisplayFlags } from "./RawViewer";

function parse(query: string) {
  return parseEmbedDisplayFlags(new URLSearchParams(query));
}

describe("parseEmbedDisplayFlags", { tags: ["@group4"] }, () => {
  it("returns no flags when no parameters are given", () => {
    expect(parse("")).to.deep.equal({});
  });

  it("reads solutionDisplayMode and boolean display flags", () => {
    expect(
      parse(
        "solutionDisplayMode=none&showHints=false&showCorrectness=false&showFeedback=true",
      ),
    ).to.deep.equal({
      solutionDisplayMode: "none",
      showHints: false,
      showCorrectness: false,
      showFeedback: true,
    });
  });

  it("accepts each supported solutionDisplayMode", () => {
    for (const mode of ["button", "displayed", "none"]) {
      expect(parse(`solutionDisplayMode=${mode}`)).to.deep.equal({
        solutionDisplayMode: mode,
      });
    }
  });

  it("ignores unrecognized values", () => {
    expect(
      parse(
        "solutionDisplayMode=buttonRequirePermission&showHints=no&showFeedback=1",
      ),
    ).to.deep.equal({});
  });

  it("ignores flags that are not display flags", () => {
    expect(
      parse("allowSaveState=false&allowLocalState=true&readOnly=true"),
    ).to.deep.equal({});
  });
});
