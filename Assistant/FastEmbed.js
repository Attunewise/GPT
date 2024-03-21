const { EmbeddingModel, FlagEmbedding } = require("fastembed")

let embeddingModel
const vectorSize = 768
const createEmbeddings = async (documents, batchSize) => {
  batchSize = batchSize || 16
  if (!embeddingModel) {
    embeddingModel = await FlagEmbedding.init({
      model: EmbeddingModel.BGEBaseEN
    })
  }
  const start = Date.now()
  const embeddings = await embeddingModel.embed(documents, batchSize)
  const vectors = []
  for await (const batch of embeddings) {
    for (const embedding of batch) {
      const vector = []
      for (const i in embedding) {
        vector.push(embedding[i])
      }
      vectors.push(vector)
    }
  }
  const end = Date.now()
  const size = vectors[0].length
  //console.log("created embeddings:", documents.length, vectors.length, 'size', size, "in", (end - start), "ms")
  return { embeddings: vectors }
}

module.exports = { createEmbeddings }
