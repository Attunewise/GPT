function dotProduct(vecA, vecB) {
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

function norm(vec) {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

function cosineSimilarity(vecA, vecB) {
  return dotProduct(vecA, vecB) / (norm(vecA) * norm(vecB));
}

class InMemorySearch {
  constructor(createEmbeddings) {
    this.createEmbeddings = createEmbeddings
  }

  memory = {}

  async index(contents) {
    const { embeddings } = await this.createEmbeddings(contents)
    contents.forEach((content, i) => {
      this.memory[i] = {
        id: i,
        content,
        embedding: embeddings[i]
      }
    })
  }

  remove = id => {
    delete this.memory[id]
  }

  add = ({id, content, embedding}) => {
    this.memory[id] = {
      id,
      content,
      embedding
    }
  }

  async search(query, limit) {
    const { embeddings } = await this.createEmbeddings([query])
    const [queryEmbedding] = embeddings
    const scored = Object.values(this.memory).map(({id, content, embedding}) => ({
      id,
      score: cosineSimilarity(embedding, queryEmbedding),
      doc: content
    })).filter(item => {
      const {doc, score} = item
      //console.log(query, score, '=>', doc)
      return item.score >= 0.7
    }); // Threshold can be adjusted
    //console.log('got scored', scored)
    scored.sort((a, b) => b.score - a.score)
    let results = scored
    if (limit) {
      results = scored.slice(0, limit)
    }
    return { results }
  }
}


module.exports = { InMemorySearch }

