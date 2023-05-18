const { OpenAIApi, Configuration } = require("openai");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const pLimit = require("p-limit");

async function main() {
  dotenv.config();

  const dataset = JSON.parse(fs.readFileSync(path.resolve(__dirname, "data", "dataset.json"), "utf-8"));

  const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPEN_AI_KEY }));

  const limit = pLimit(10);

  const input = [];

  for (const entry of dataset) {
    input.push(
      limit(async () => {
        console.log("Getting embedding for", entry.id);

        const createEmbeddingResult = await openai.createEmbedding({
          model: "text-embedding-ada-002",
          input: entry.description,
        });

        return {
          id: entry.id,
          embedding: createEmbeddingResult.data.data[0].embedding,
        };
      })
    );
  }

  const embeddings = await Promise.all(input);

  fs.writeFileSync(path.resolve(__dirname, "data", "dataset.embeddings.json"), JSON.stringify(embeddings, null, 2));
}

main();
