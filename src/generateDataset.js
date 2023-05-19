const fetch = require("node-fetch");
const getImageColors = require("get-image-colors");
const fs = require("fs");
const path = require("path");
const pLimit = require("p-limit");
const namer = require("color-namer");

async function main() {
  const items = await getItems();

  const limit = pLimit(50);

  const input = [];

  for (const item of items) {
    async function getColors() {
      console.log("Getting colors for", `${item.collection.id}-${item.blockchainId}`);

      const thumbnailPath = path.resolve(__dirname, "temp", `${item.collection.id}-${item.blockchainId}.png`);
      const res = await fetch(item.image);

      if (res.status !== 200) {
        console.log("Error getting colors for", `${item.collection.id}-${item.blockchainId}`);

        return [];
      }

      try {
        const fileStream = fs.createWriteStream(thumbnailPath);
        const stream = res.body.pipe(fileStream);

        await new Promise((resolve, reject) => {
          stream.on("finish", resolve);
          stream.on("error", reject);
        });

        const buffer = fs.readFileSync(thumbnailPath);
        const colors = await getImageColors(buffer, { count: 2, type: "image/png" });

        return colors.map((c) => namer(c.hex()).basic[0].name);
      } catch (e) {
        console.log("Error getting colors for", `${item.collection.id}-${item.blockchainId}`, e.message);

        return [];
      } finally {
        if (fs.existsSync(thumbnailPath)) {
          fs.rmSync(thumbnailPath);
        }
      }
    }

    input.push(
      limit(async () => {
        const colors = await getColors();

        return {
          id: `${item.collection.id}-${item.blockchainId}`,
          description: `${item.metadata.wearable.name} ${item.metadata.wearable.description} ${
            item.metadata.wearable.category
          } ${colors.join(" ")}`,
        };
      })
    );
  }

  const output = await Promise.all(input);

  fs.writeFileSync(path.resolve(__dirname, "data", "dataset.json"), JSON.stringify(output, null, 2));
}

async function getItems() {
  const limit = pLimit(5);

  const input = [
    limit(() => querySubgraph(3000, "eyebrows")),
    limit(() => querySubgraph(3000, "facial_hair")),
    limit(() => querySubgraph(3000, "hair")),
    limit(() => querySubgraph(3000, "mouth")),
    limit(() => querySubgraph(3000, "upper_body")),
    limit(() => querySubgraph(3000, "lower_body")),
    limit(() => querySubgraph(3000, "feet")),
    limit(() => querySubgraph(3000, "earring")),
    limit(() => querySubgraph(3000, "hat")),
    limit(() => querySubgraph(3000, "helmet")),
    limit(() => querySubgraph(3000, "mask")),
    limit(() => querySubgraph(3000, "tiara")),
    limit(() => querySubgraph(3000, "top_head")),
  ];

  const results = await Promise.all(input);

  return results.reduce((acc, next) => acc.concat(next), []);
}

async function querySubgraph(first, category) {
  console.log(`Getting ${first} items of ${category} category`);

  const max = 1000;

  const iterations = Math.trunc(first / max);

  let output = [];

  for (let i = 0; i < iterations; i++) {
    const filters = `
    first: ${max}, 
    skip: ${i * max}, 
    where: { 
      searchIsStoreMinter: true, 
      searchWearableCategory: ${category} 
    }
    `;

    const response = await fetch("https://api.thegraph.com/subgraphs/name/decentraland/collections-matic-mainnet", {
      method: "post",
      body: JSON.stringify({
        query: `
          {
            items(${filters}) {
              collection {
                id
              }
              blockchainId
              image
              metadata {
                wearable {
                  name
                  description
                  category
                }
              }
            }
          }
          `,
      }),
    });

    const { data } = await response.json();

    output = output.concat(data.items);
  }

  return output;
}

main();
