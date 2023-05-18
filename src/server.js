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
      const { search, threshold: _threshold, limit: _limit } = req.query;

      if (!search) {
        res.status(400).json({ error: "'search' is mandatory" });

        return;
      }

      const threshold = _threshold ? parseFloat(_threshold) : 0.5;

      if (threshold <= 0 || threshold > 1) {
        res.status(400).json({ error: "'threshold' must be between 0 and 1" });

        return;
      }

      const limit = _limit ? parseInt(_limit) : 20;

      if (limit <= 0) {
        res.status(400).json({ error: "'limit' must be greater than 0" });

        return;
      }

      const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPEN_AI_KEY }));

      const createEmbeddingResult = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: search,
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
        data: similarities
          .filter((s) => s.similarity >= threshold)
          .slice(0, limit)
          .map((s) => ({
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
