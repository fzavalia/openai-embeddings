# OpenAI Embeddings

Create a `dataset.json` file inside `src/data` composed of an array of elements with `id` and `description` properties.

## Generate Dataset

Generate the dataset based on the data on the collections-matic-mainnet subgraph. Will also download thumbnails to obtain the main colors of the item as an extra flavor.

`npm run gen-dataset`

## Generate Embeddings

Generate the embeddings for each element in the `dataset.json` and store it in your filesystem to be used by the server.

`npm run gen-embeddings`

The server only need the embeddings to work, the original dataset is required only to generate those embeddings.

## Server

After having the embeddings generated, run the server with:

`npm run server`

This will expose a server on `:8080`

```
GET *?search={string}&threshold={float}&limit={number}
```

- `search` is the input used to search for elements that have a description that might fit.
- `threshold` is the minimum similarity value the element must have to the input. Ranges from 0 to 1.
- `limit` is the maximum amount of elements to be returned.

Responds with an array of elements sorted (DESC) by similarity to the search prompt.
