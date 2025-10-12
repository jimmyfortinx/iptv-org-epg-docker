const cron = require("node-cron");
const dayjs = require("dayjs");
const { glob } = require("glob");
const { existsSync } = require("fs");
const { rmdir, readFile, writeFile, mkdir } = require("fs/promises");
const xmlJs = require("xml-js");
const path = require("path");

const tvpassportEnglishChannels = new Set([
  "hgtv-canada/167",
  "hgtv-canada-dv/3962",
  "hgtv-canada-hd/8793",
  "hgtv-canada-on-demand/4335",
  "hgtv-usa--eastern-feed/623",
  "hgtv-usa--hawaii/6073",
  "hgtv-usa--pacific-feed/1277",
  "hgtv-usa-hd--eastern/3690",
  "hgtv-usa-hd--pacific-feed/16232",
  "food-network-canada/169",
  "food-network-canada-dv/8388",
  "food-network-canada-hd/8389",
  "food-network-usa--eastern-feed/1054",
  "food-network-usa--pacific-feed/2032",
  "food-network-usa-hd--eastern-feed/3438",
  "food-network-usa-hd--pacific-feed/11581",
  "tmn--east-hd/2820",
  "tmn--east/72",
  "tmn--west-hd/4806",
  "tmn--west/158",
  "tmn-2--east-hd/7139",
  "tmn-2--east/86",
  "tmn-2--west-hd/8475",
  "tmn-2--west/250",
  "tmn-3--east-hd/7137",
  "tmn-3--east/85",
  "tmn-3--west-hd/10287",
  "tmn-3--west/354",
  "tmn-4-hd/10781",
  "tmn-4/320",
  "hbo--eastern-feed/614",
  "hbo--pacific-feed/1472",
  "hbo-2--eastern-feed-hd/6313",
  "hbo-2--eastern-feed/626",
  "hbo-2--pacific-feed-hd/6314",
  "hbo-2--pacific-feed/2205",
  "hbo-canada--west/292",
  "hbo-canada-1-hd/4230",
  "hbo-canada-1/84",
  "hbo-canada-2-hd/6425",
  "hbo-canada-2/6424",
  "hbo-canada-east-on-demand-hd/9313",
  "hbo-canada-east-on-demand/8252",
  "hbo-canada-west-on-demand-hd/9314",
  "hbo-canada-west-on-demand/8442",
  "hbo-comedy--east/629",
  "hbo-comedy--pacific/2593",
  "hbo-comedy-hd--east/7105",
  "hbo-comedy-hd--pacific/8469",
  "hbo-family--eastern-feed-hd/7104",
  "hbo-family--eastern-feed/628",
  "hbo-family--pacific-feed-hd/8250",
  "hbo-family--pacific-feed/1216",
  "hbo-hd--eastern-feed/627",
  "hbo-hd--pacific-feed/2629",
  "hbo-latino-hbo-7--eastern/631",
  "hbo-latino-hbo-7--pacific/2579",
  "hbo-latino-hbo-7-hd--eastern/7096",
  "hbo-latino-hbo-7-hd--pacific/8471",
  "hbo-on-demand-hd/8610",
  "hbo-on-demand/3479",
  "hbo-signature-hbo-3--eastern-hd/7099",
  "hbo-signature-hbo-3--eastern/1651",
  "hbo-signature-hbo-3--pacific-hd/7711",
  "hbo-signature-hbo-3--pacific/2580",
  "hbo-zone--east/630",
  "hbo-zone--pacific/2594",
  "hbo-zone-hd--east/7102",
  "hbo-zone-hd--pacific/8470",
]);

const sites = {
  "epgshare01.online": {
    channels: "epgshare01.online_FR1",
    delay: 0,
    days: 7,
    languages: ["fr"],
    filter: [
      "FR1#France.info.fr",
      "FR1#France.2.fr",
      "FR1#France.5.fr",
      "FR1#BFM.TV.fr",
      "FR1#Discovery.Channel.(F).fr",
      "FR1#Discovery.Channel.fr",
      "FR1#CNews.fr",
      "FR1#LCI.fr",
    ],
  },
  "canalplus.com": {
    channels: "canalplus.com_fr",
    delay: 0,
    days: 7,
    languages: ["fr"],
    filter: ["#545", "#1094", "#26", "#633", "#174", "#480", "#553"],
  },
  "tvhebdo.com": {
    delay: 0,
    days: 7,
    languages: ["fr", "en"],
  },
  "tvpassport.com": {
    delay: 1000,
    days: 7,
    languages: ["fr", "en"],
    filter: (language, site) => {
      if (language === "fr") {
        return true;
      }

      return tvpassportEnglishChannels.has(site);
    },
  },
};

const filterChannels = async () => {
  await mkdir("guides/channels", { recursive: true });

  for (const [site, { channels, languages, filter }] of Object.entries(sites)) {
    for (const language of languages) {
      const siteFile = `sites/${site}/${channels ?? site}.channels.xml`;

      const xml = await readFile(siteFile, "utf8");
      const json = xmlJs.xml2js(xml, { compact: true });

      const filteredChannels = json.channels.channel.filter((channel) => {
        if (channel._attributes.lang !== language) {
          return false;
        }

        if (Array.isArray(filter)) {
          return filter.includes(channel._attributes.site_id);
        }

        if (filter === undefined) {
          return true;
        }

        return filter(channel._attributes.lang, channel._attributes.site_id);
      });

      const output = `guides/channels/${site}_${language}.channels.xml`;

      await writeFile(
        output,
        xmlJs.js2xml(
          {
            ...json,
            channels: {
              channel: filteredChannels,
            },
          },
          { compact: true }
        )
      );
    }
  }
};

const execute = async () => {
  const { $ } = await import("execa");

  console.log("Grabbing epg...");

  await filterChannels();

  await Promise.allSettled(
    Object.entries(sites).map(async ([site, { delay, days, languages }]) => {
      for (const language of languages) {
        console.log(`Grabbing epg from ${site} in ${language}...`);

        try {
          const siteFilename = `${site}.xml`;

          for (let i = 0; i < days; i++) {
            const date = dayjs().add(i, "day").format("YYYY-MM-DD");
            const output = `guides/daily/${date}/${language}/${siteFilename}`;

            if (existsSync(output)) {
              console.log(`${output} already exists, skipped`);
              continue;
            }

            try {
              await $({
                stdio: "inherit",
                cwd: "/usr/src/app",
                env: {
                  ...process.env,
                  CURR_DATE: dayjs(date).toISOString(),
                },
              })`npm run grab -- --channels guides/channels/${site}_${language}.channels.xml --lang ${language} --delay ${delay} --days 1 --output ${output}`;
            } catch (error) {
              console.error(
                `something went wront while grabbing epg from ${site} in ${language}`,
                error
              );
            }
          }

          const directories = await glob("guides/daily/*");

          for (const directory of directories) {
            const date = directory.split("/").pop();

            if (dayjs(date).isBefore(dayjs().subtract(1, "day"))) {
              await rmdir(directory, { recursive: true });
            }
          }

          const siteXmls = await glob(
            `guides/daily/*/${language}/${siteFilename}`
          );
          const sortedSiteXmls = siteXmls.sort();
          console.log(sortedSiteXmls);

          let mergedXml;

          for (const siteXml of sortedSiteXmls) {
            const xml = await readFile(siteXml, "utf8");
            const json = xmlJs.xml2js(xml, { compact: true });

            if (!mergedXml) {
              mergedXml = json;
            } else {
              mergedXml.tv.programme = [
                ...mergedXml.tv.programme,
                ...json.tv.programme,
              ];
            }
          }

          const output = `guides/${language}/${site.replace(
            ".channels.xml",
            ""
          )}.xml`;

          await mkdir(path.dirname(output), { recursive: true });
          await writeFile(output, xmlJs.js2xml(mergedXml, { compact: true }));
        } catch (error) {
          console.error(
            `Something went wrong while grabbing epg from ${site} in ${language}`,
            error
          );
        }
      }
    })
  );
};

cron.schedule("0 0 * * *", execute);

execute();
