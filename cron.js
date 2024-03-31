const { execSync } = require("child_process");
var cron = require("node-cron");

const sites = ["tvhebdo.com", "tvpassport.com"];
const languages = ["fr", "en"];

const execute = () => {
  console.log("Grabbing epg...");

  for (const site of sites) {
    for (const language of languages) {
      try {
        execSync(`npm run grab -- --site ${site} --lang ${language}`, {
          stdio: "inherit",
          cwd: "/usr/src/app",
        });
      } catch (error) {
        console.error(
          `something went wront while grabbing epg from ${site} in ${language}`,
          error
        );
      }
    }
  }
};

cron.schedule("0 0 * * *", execute);

execute();
