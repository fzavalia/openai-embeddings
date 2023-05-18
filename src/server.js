const express = require("express");
const dotenv = require("dotenv");
const { OpenAIApi, Configuration } = require("openai");
const path = require("path");
const fs = require("fs");
const similarity = require("compute-cosine-similarity");
const morgan = require("morgan");

async function main() {
  dotenv.config();

  const app = express();

  app.use(morgan("dev"));

  app.get("*", async (req, res) => {
    try {
      const { q } = req.query;

      if (!q) {
        res.status(400).json({ error: "Missing query parameter 'q'" });

        return;
      }

      const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPEN_AI_KEY }));

      const createEmbeddingResult = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: q,
      });

      const embeddings = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "data", "dataset.embeddings.json"), "utf-8")
      );
      const similarities = [];

      for (const entry of embeddings) {
        similarities.push({
          ...entry,
          similarity: similarity(entry.embedding, createEmbeddingResult.data.data[0].embedding),
        });
      }

      similarities.sort((a, b) => b.similarity - a.similarity);

      res.json({
        data: similarities.map((s) => ({
          id: s.id,
          similarity: s.similarity,
        })),
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.listen(8080, () => {
    console.log("Listening on port 8080");
  });
}

main();
