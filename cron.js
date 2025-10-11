const { execSync } = require("child_process");
var cron = require("node-cron");

const sites = {
  "canalplus.com": {
    delay: 0,
    days: 7,
    languages: ["fr"],
  },
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
  "tvpassport.com.channels.xml": {
    delay: 1000,
    days: 7,
    languages: ["en"],
  },
};

const execute = () => {
  console.log("Grabbing epg...");

  for (const [site, { delay, days, languages }] of Object.entries(sites)) {
    for (const language of languages) {
      const siteParameter = site.endsWith(".channels.xml")
        ? `--channels ${site}`
        : `--site ${site}`;

      const output = `guides/${language}/${site.replace(
        ".channels.xml",
        ""
      )}.xml`;

      try {
        execSync(
          `npm run grab -- ${siteParameter} --lang ${language} --delay ${delay} --days ${days} --output ${output}`,
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
};

cron.schedule("0 0 * * *", execute);

execute();
