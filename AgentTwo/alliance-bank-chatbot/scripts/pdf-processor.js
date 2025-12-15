// scripts/pdf-processor.js
const { DocumentAnalysisClient } = require("@azure/ai-form-recognizer");
const { AzureKeyCredential } = require("@azure/core-auth");
const fs = require("fs");
const path = require("path");

// Load environment variables
require('dotenv').config();

const key = process.env.REACT_APP_DOCUMENT_INTELLIGENCE_KEY;
const endpoint = process.env.REACT_APP_DOCUMENT_INTELLIGENCE_ENDPOINT;

// Function to process a single PDF
async function processPdf(pdfPath) {
  console.log(`Processing PDF: ${pdfPath}`);
  
  const client = new DocumentAnalysisClient(
    endpoint,
    new AzureKeyCredential(key)
  );
  
  const readStream = fs.createReadStream(pdfPath);
  const poller = await client.beginAnalyzeDocument("prebuilt-layout", readStream);
  const result = await poller.pollUntilDone();
  
  let extractedText = "";
  if (result && result.paragraphs) {
    for (const paragraph of result.paragraphs) {
      extractedText += paragraph.content + "\n";
    }
  }
  
  return extractedText;
}

// Modified version for better extraction
function convertToTrainingExamples(text, pdfName) {
  // Extract the PDF name without extension for context
  const documentName = path.basename(pdfName, path.extname(pdfName));
  
  // Split by paragraphs using different methods
  const paragraphs = [];
  
  // Method 1: Split by double newlines
  const sections1 = text.split('\n\n').filter(s => s.trim().length > 5);
  paragraphs.push(...sections1);
  
  // Method 2: Split by single newlines with length filtering
  const sections2 = text.split('\n')
    .filter(s => s.trim().length > 15)  // Only substantial lines
    .filter(s => !paragraphs.some(p => p.includes(s))); // Avoid duplicates
  paragraphs.push(...sections2);
  
  const examples = [];
  
  // Generate examples based on document name and content
  if (paragraphs.length > 0) {
    examples.push({
      messages: [
        { role: "system", content: "You are an Alliance Bank assistant that helps with Standard Operating Procedures (SOP). Be concise and helpful." },
        { role: "user", content: `What is the ${documentName}?` },
        { role: "assistant", content: `The ${documentName} is a document that ${paragraphs.slice(0, 3).join(' ')}` }
      ]
    });
  }
  
  // Generate specific examples from longer paragraphs
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    if (paragraph.length > 50) {
      // Create a question from paragraph content
      const words = paragraph.split(' ').slice(0, 5).join(' ');
      const question = `Tell me about ${words}...`;
      
      examples.push({
        messages: [
          { role: "system", content: "You are an Alliance Bank assistant that helps with Standard Operating Procedures (SOP). Be concise and helpful." },
          { role: "user", content: question },
          { role: "assistant", content: paragraph }
        ]
      });
    }
  }
  
  // Add document-wide questions
  if (paragraphs.length > 0) {
    examples.push({
      messages: [
        { role: "system", content: "You are an Alliance Bank assistant that helps with Standard Operating Procedures (SOP). Be concise and helpful." },
        { role: "user", content: `Summarize the key points of the ${documentName}` },
        { role: "assistant", content: `The key points of the ${documentName} include: ${paragraphs.slice(0, 5).join(' ')}` }
      ]
    });
  }
  
  return examples;
}

// Process all PDFs in a directory
async function processAllPdfs(pdfDir, outputPath) {
  const files = fs.readdirSync(pdfDir).filter(f => f.toLowerCase().endsWith('.pdf'));
  let allExamples = [];
  
  for (const file of files) {
    const filePath = path.join(pdfDir, file);
    try {
      const text = await processPdf(filePath);
      const examples = convertToTrainingExamples(text, file);
      allExamples = allExamples.concat(examples);
      console.log(`Extracted ${examples.length} examples from ${file}`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
  
  // Write to JSONL file
  const jsonlContent = allExamples.map(ex => JSON.stringify(ex)).join('\n');
  fs.writeFileSync(outputPath, jsonlContent);
  console.log(`Written ${allExamples.length} examples to ${outputPath}`);
  
  return allExamples.length;
}

// Directory containing your PDFs
const PDF_DIR = path.join(__dirname, '../pdfs'); 
const OUTPUT_PATH = path.join(__dirname, '../generated-training-data.jsonl');

// Create pdfs directory if it doesn't exist
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  console.log(`Created directory: ${PDF_DIR}`);
  console.log('Please place your PDF files in this directory');
} else {
  // Process PDFs
  processAllPdfs(PDF_DIR, OUTPUT_PATH)
    .then(count => {
      console.log(`Process complete. ${count} examples generated.`);
      if (count > 0) {
        console.log('You can now combine this with your existing training data');
      }
    })
    .catch(err => console.error('Error:', err));
}