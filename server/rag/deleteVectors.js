require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

async function deleteCourseVectors(courseId) {
  await index.deleteMany({ filter: { courseId: String(courseId) } });
}

async function deleteDocumentVectors(courseId, document) {
  if (document._id) {
    await index.deleteMany({
      filter: { courseId: String(courseId), documentId: String(document._id) },
    });
  }

  // Older uploads did not store documentId in Pinecone metadata, so keep a
  // filename fallback for documents created before this delete flow existed.
  if (document.vectorMetadataVersion !== 2) {
    await index.deleteMany({
      filter: { courseId: String(courseId), source: document.filename },
    });
  }
}

module.exports = { deleteCourseVectors, deleteDocumentVectors };
