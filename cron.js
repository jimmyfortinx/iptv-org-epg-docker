const { execSync } = require("child_process");
var cron = require("node-cron");

const sites = {
  "tvhebdo.com": {
    delay: 0,
    days: 7,
    languages: ["fr", "en"],
  },
  "tvpassport.com": {
    delay: 1000,
    days: 7,
    languages: ["fr"],
  },
};

const execute = () => {
  console.log("Grabbing epg...");

  for (const [site, { delay, days, languages }] of Object.entries(sites)) {
    for (const language of languages) {
      try {
        execSync(
          `npm run grab -- --site ${site} --lang ${language} --delay ${delay} --days ${days}`,
          {
            stdio: "inherit",
            cwd: "/usr/src/app",
          }
        );
      } catch (error) {
        console.error(
          `something went wront while grabbing epg from ${site} in ${language}`,
          error
        );
      }
    }
  }

  try {
    execSync(
      `npm run grab -- --channels tvpassport.com.channels.xml --lang en --delay 1000 --days 7`,
      {
        stdio: "inherit",
        cwd: "/usr/src/app",
      }
    );
  } catch (error) {
    console.error(
      `something went wront while grabbing epg from tvpassport.com in en`,
      error
    );
  }
};

cron.schedule("0 0 * * *", execute);

execute();
