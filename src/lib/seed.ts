import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

const chunks = [
  {
    content:
      'Iris Classification: Built a multi-class classification model on the Iris dataset using scikit-learn Random Forest and SVM. Achieved 95% test accuracy with 5-fold cross-validation. Features: sepal/petal length and width. Visualized decision boundaries with matplotlib.',
    metadata: {
      project: 'Iris Classification',
      accuracy: 95,
      type: 'classification',
      color: '#6366f1',
      tech: 'scikit-learn, pandas, matplotlib',
    },
  },
  {
    content:
      'Sentiment Analysis: Fine-tuned DistilBERT on IMDB movie reviews for binary sentiment classification. Achieved 92% accuracy on 25k test samples. Implemented custom tokenization pipeline and deployed as REST API on Hugging Face Spaces.',
    metadata: {
      project: 'Sentiment Analysis',
      accuracy: 92,
      type: 'nlp',
      color: '#8b5cf6',
      tech: 'HuggingFace, PyTorch, FastAPI',
    },
  },
  {
    content:
      'Recommender System: Collaborative filtering recommender using matrix factorization (SVD) on MovieLens 1M dataset. Achieved RMSE of 0.87 and 89% precision@10. Built hybrid model combining content-based and collaborative filtering for cold-start problem.',
    metadata: {
      project: 'Recommender System',
      accuracy: 89,
      type: 'recommendation',
      color: '#a78bfa',
      tech: 'Surprise, NumPy, Flask',
    },
  },
  {
    content:
      'Object Detection: Trained YOLOv8 on custom dataset of 5,000 images for real-time object detection. Achieved 94% mAP@0.5 across 10 object classes. Optimized inference to 45ms per frame on CPU. Deployed with OpenCV video stream.',
    metadata: {
      project: 'Object Detection',
      accuracy: 94,
      type: 'computer_vision',
      color: '#ec4899',
      tech: 'YOLOv8, OpenCV, PyTorch',
    },
  },
  {
    content:
      'NLP Pipeline: End-to-end NLP pipeline for named entity recognition (NER) and relation extraction on medical texts. Built with spaCy and custom transformers. Achieved 91% F1 on NER task. Processes 1000 documents/minute with batch inference.',
    metadata: {
      project: 'NLP Pipeline',
      accuracy: 91,
      type: 'nlp',
      color: '#f59e0b',
      tech: 'spaCy, Transformers, FastAPI',
    },
  },
  {
    content:
      'Time Series Forecast: LSTM-based forecasting model for stock price prediction using 5 years of historical data. Achieved 88% directional accuracy and MAPE of 2.3%. Features: technical indicators, volume, sentiment scores. Backtested with 2-year holdout.',
    metadata: {
      project: 'Time Series Forecast',
      accuracy: 88,
      type: 'time_series',
      color: '#10b981',
      tech: 'TensorFlow, Keras, yfinance',
    },
  },
  {
    content:
      'GAN Image Generation: Trained a Progressive GAN on CelebA dataset to generate photorealistic 256x256 faces. Achieved FID score of 18.4 (87th percentile quality). Implemented custom training loop with gradient penalty. Generated 10k synthetic images for data augmentation.',
    metadata: {
      project: 'GAN Image Gen',
      accuracy: 87,
      type: 'generative',
      color: '#f97316',
      tech: 'PyTorch, CUDA, WandB',
    },
  },
  {
    content:
      'Transformer Fine-tune: Fine-tuned GPT-2 medium on domain-specific technical documentation using LoRA adapters. Achieved 93% accuracy on downstream QA tasks with only 2% of parameters trained. Reduced training cost by 10x vs full fine-tuning. BLEU score of 0.68.',
    metadata: {
      project: 'Transformer Fine-tune',
      accuracy: 93,
      type: 'llm',
      color: '#3b82f6',
      tech: 'Transformers, PEFT, LoRA',
    },
  },
]

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return res.data[0].embedding
}

async function main() {
  console.log('Seeding Supabase with AI project chunks...')

  // Clear existing documents
  await supabase.from('documents').delete().neq('id', 0)
  console.log('Cleared existing documents')

  for (const chunk of chunks) {
    console.log(`Embedding: ${chunk.metadata.project}...`)
    const embedding = await embed(chunk.content)

    const { error } = await supabase.from('documents').insert({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: JSON.stringify(embedding),
    })

    if (error) {
      console.error(`Error inserting ${chunk.metadata.project}:`, error)
    } else {
      console.log(`  ✓ ${chunk.metadata.project} (${chunk.metadata.accuracy}% accuracy)`)
    }
  }

  console.log('\n✅ Seeding complete! 8 AI project chunks loaded.')
}

main().catch(console.error)
