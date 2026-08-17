import { defineConfig } from "vite";

export default defineConfig({
  test: {
    // The bridge tests build their own JSDOM per case (see test/helpers/sco.js)
    // rather than using a shared per-file DOM, because ptx_scorm_events.js is a
    // load-time IIFE that registers window listeners: two instances in one
    // window would each handle every SPLICE message.
    environment: "node",
    include: ["test/**/*.test.js"],
  },
});
