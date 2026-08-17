// The tests load the package's constant files exactly the way the CLI does, so
// what they exercise is the real templates and the real vendored bridge.
export { loadNodeAssets as loadAssets } from "../../src/node-assets.js";
