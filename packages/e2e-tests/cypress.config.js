import { defineConfig } from "cypress";
import addAccessibilityTasks from "wick-a11y/accessibility-tasks";
import { plugin as cypressGrepPlugin } from "@cypress/grep/plugin";

// // This is for db data testing/checking (CANNOT GET DATA AND CHECK VIA CYPRESS)
// //For connecting to SQL Server
// const mysql = require("mysql2");
// function queryTestDb(query, config) {
//   // creates a new mysql connection using credentials from cypress.json env's
//   const connection = mysql.createConnection(config.env.db);
//   // start connection to db
//   connection.connect();
//   // exec query + disconnect to db as a Promise
//   return new Promise((resolve, reject) => {
//     connection.query(query, (error, results) => {
//       if (error) reject(error);
//       else {
//         connection.end();
//         return resolve(results);
//       }
//     });
//   });
// }

export default defineConfig({
  numTestsKeptInMemory: 20,
  defaultCommandTimeout: 10000,
  retries: {
    runMode: 2, // Retry failed tests 2 times (3 total attempts) in CI
    openMode: 0,
  },
  e2e: {
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser = {}, launchOptions) => {
        if (browser.name === "chrome") {
          launchOptions.args.push("--mute-audio");
        }

        return launchOptions;
      });

      addAccessibilityTasks(on);

      // on("task", {
      //   queryDb: (query) => {
      //     return queryTestDb(query, config);
      //   },
      // }); //For running sql query

      cypressGrepPlugin(config);
      return config;
    },
    supportFile: "support/e2e.ts",
    specPattern: "e2e/**/*.cy.ts",

    baseUrl: "http://localhost:8000",
  },
  // env: {
  //   db: {
  //     host: "localhost",
  //     user: "root",
  //     password: "helloworld",
  //     database: "doenet_local",
  //   },
  // },
});
