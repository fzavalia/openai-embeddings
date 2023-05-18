const fetch = require("node-fetch");
const getImageColors = require("get-image-colors");
const fs = require("fs");
const path = require("path");
const pLimit = require("p-limit");
const namer = require("color-namer");

async function main() {
  const response = await fetch("https://api.thegraph.com/subgraphs/name/decentraland/collections-matic-mainnet", {
    method: "post",
    body: JSON.stringify({
      query: `
      {
        items(first:150, where:{itemType:wearable_v2}) {
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

  const limit = pLimit(5);

  const input = [];

  for (const item of data.items) {
    async function getColors() {
      console.log("Getting colors for", item.collection.id, item.blockchainId);

      const p = path.resolve(__dirname, "temp", `${item.collection.id}-${item.blockchainId}.png`);
      const res = await fetch(item.image);

      if (res.status !== 200) {
        return [];
      }

      const fileStream = fs.createWriteStream(p);
      const stream = res.body.pipe(fileStream);

      await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
      });

      const buffer = fs.readFileSync(p);
      const colors = await getImageColors(buffer, { count: 2, type: "image/png" });

      fs.rmSync(p);

      return colors.map((c) => namer(c.hex()).basic[0].name);
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

main();
