import { prisma } from '../lib/prisma.js';
import { claude } from '../lib/claude.js';

// Concurrency settings
const BATCH_SIZE = 5; // Process 5 metrics in parallel

type MetricSearchResult = {
  found: boolean;
  value?: number | string;
  sourceUrl?: string;
  sourceName?: string;
  confidenceScore?: number;
  reasoning?: string;
  sourceType: 'OFFICIAL' | 'AGGREGATOR' | 'NEWS_DERIVED';
};

type MetricResult = {
  metric: any;
  existing: any;
  result: MetricSearchResult | null;
  error?: string;
};

export async function startAggregationJob(jobId: string): Promise<void> {
  const job = await prisma.dataAggregationJob.findUnique({
    where: { id: jobId },
    include: { country: true },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  await updateJob(jobId, { status: 'running', startedAt: new Date() });

  const metrics = await prisma.metricDefinition.findMany({
    orderBy: { category: 'asc' },
  });

  const year = job.year;
  const total = metrics.length;

  await updateJob(jobId, { totalMetrics: total });

  await addJobLog(jobId, 'info', `Starting aggregation for ${job.country.name} (${year})`);
  await addJobLog(jobId, 'info', `Total metrics: ${total} (processing ${BATCH_SIZE} in parallel)`);

  let completed = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches
  for (let i = 0; i < metrics.length; i += BATCH_SIZE) {
    // Check if job was cancelled
    const currentJob = await prisma.dataAggregationJob.findUnique({
      where: { id: jobId },
    });
    if (currentJob?.status === 'failed') {
      await addJobLog(jobId, 'info', 'Job cancelled');
      return;
    }

    const batch = metrics.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(metrics.length / BATCH_SIZE);
    
    await addJobLog(jobId, 'info', `── Batch ${batchNum}/${totalBatches}: ${batch.map(m => m.code).join(', ')}`);
    await updateJob(jobId, { currentMetric: `Batch ${batchNum}/${totalBatches}` });

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(metric => processMetric(jobId, job, metric, year))
    );

    // Handle results and save to DB
    for (const { metric, existing, result, error } of batchResults) {
      if (error) {
        failed++;
        await addJobLog(jobId, 'error', `${metric.code}: ${error}`);
        continue;
      }

      if (result === null) {
        // Skipped - already have data
        skipped++;
        continue;
      }

      if (result.found && result.value !== undefined) {
        const dataPayload = {
          valueNumeric: typeof result.value === 'number' ? result.value : null,
          valueText: typeof result.value === 'string' ? result.value : null,
          sourceType: result.sourceType,
          sourceUrl: result.sourceUrl,
          sourceName: result.sourceName,
          confidenceScore: result.confidenceScore,
          aiReasoning: result.reasoning,
        };

        try {
          if (existing) {
            await prisma.countryMetricData.update({
              where: { id: existing.id },
              data: dataPayload,
            });
          } else {
            await prisma.countryMetricData.create({
              data: {
                countryId: job.countryId,
                metricId: metric.id,
                year,
                quarter: null,
                ...dataPayload,
                createdBy: 'ai-aggregation',
              },
            });
          }

          const displayValue = typeof result.value === 'number' 
            ? result.value.toLocaleString() 
            : result.value;
          await addJobLog(
            jobId,
            'success',
            `${metric.code}: ${displayValue} (${result.sourceType}, conf: ${result.confidenceScore || '?'}/10)`
          );
          completed++;
        } catch (dbError) {
          failed++;
          await addJobLog(jobId, 'error', `${metric.code}: DB error - ${dbError instanceof Error ? dbError.message : 'Unknown'}`);
        }
      } else {
        await addJobLog(jobId, 'warning', `${metric.code}: No data found`);
        completed++; // Count as completed even if no data
      }
    }

    await updateJob(jobId, { 
      completedMetrics: completed + skipped, 
      failedMetrics: failed 
    });
  }

  await updateJob(jobId, { status: 'completed', completedAt: new Date() });
  await addJobLog(jobId, 'info', `Done! ${completed} found, ${skipped} skipped, ${failed} failed`);
}

async function processMetric(
  jobId: string,
  job: any,
  metric: any,
  year: number
): Promise<MetricResult> {
  try {
    // Check if we already have good data
    const existing = await prisma.countryMetricData.findFirst({
      where: {
        countryId: job.countryId,
        metricId: metric.id,
        year,
        quarter: null,
      },
    });

    if (existing && existing.sourceType !== 'NEWS_DERIVED') {
      console.log(`[Aggregation] ${metric.code}: Skipping (already have ${existing.sourceType} data)`);
      return { metric, existing, result: null }; // null = skipped
    }

    // Search for the metric
    const result = await searchForMetric(
      jobId,
      job.country.name,
      job.country.iso2,
      metric,
      year
    );

    return { metric, existing, result };
  } catch (error) {
    return { 
      metric, 
      existing: null, 
      result: null, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function searchForMetric(
  jobId: string,
  countryName: string,
  countryCode: string,
  metric: any,
  year: number
): Promise<MetricSearchResult> {
  
  const prompt = `Search the web and tell me: What is ${countryName}'s ${metric.name} for ${year}?

${metric.unit ? `The unit should be: ${metric.unit}` : ''}

Reply with a SHORT answer in this format:
VALUE: [the number or text value]
SOURCE: [source name, e.g. "World Bank" or "Trading Economics"]
URL: [the URL where you found this]
CONFIDENCE: [1-10, where 10 = official government/IMF data, 5 = aggregator site, 1 = rough estimate]
TYPE: [OFFICIAL if government/IMF/World Bank, AGGREGATOR if trading economics/similar, NEWS_DERIVED if from news]
NOTE: [one sentence about the source or any caveats]

If you absolutely cannot find any data, reply with: NOT_FOUND`;

  try {
    console.log(`[Aggregation] Calling Claude for ${metric.code}...`);
    
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 3,
        } as any
      ],
    });

    console.log(`[Aggregation] ${metric.code} - stop_reason: ${response.stop_reason}`);
    
    // Extract text from response
    let fullText = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        fullText += block.text + '\n';
      }
    }
    
    const text = fullText.trim();
    
    // Log a short preview
    const preview = text.slice(0, 100).replace(/\n/g, ' ').trim();
    console.log(`[Aggregation] ${metric.code} response: "${preview}..."`);

    // Check for NOT_FOUND
    if (text.includes('NOT_FOUND') || text.toLowerCase().includes('could not find') || text.toLowerCase().includes('no data available')) {
      return { found: false, sourceType: 'NEWS_DERIVED' };
    }

    // Parse the response
    const result = parseResponse(text);
    
    if (result.value !== undefined) {
      return {
        found: true,
        value: result.value,
        sourceUrl: result.url,
        sourceName: result.source,
        confidenceScore: result.confidence,
        reasoning: result.note,
        sourceType: result.type as any || 'AGGREGATOR',
      };
    }
    
    // Fallback: try to extract just a number
    const numberMatch = text.match(/(\$?[\d,]+\.?\d*)\s*(trillion|billion|million|%)?/i);
    if (numberMatch) {
      let value = parseFloat(numberMatch[1].replace(/[$,]/g, ''));
      const unit = numberMatch[2]?.toLowerCase();
      if (unit === 'trillion') value *= 1e12;
      else if (unit === 'billion') value *= 1e9;
      else if (unit === 'million') value *= 1e6;
      
      return {
        found: true,
        value,
        sourceType: 'NEWS_DERIVED',
        confidenceScore: 3,
        reasoning: 'Extracted from unstructured response',
      };
    }

    return { found: false, sourceType: 'NEWS_DERIVED' };
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Aggregation] Error for ${metric.code}:`, error);
    throw new Error(`Claude API: ${errMsg}`);
  }
}

function parseResponse(text: string): {
  value?: number | string;
  source?: string;
  url?: string;
  confidence?: number;
  type?: string;
  note?: string;
} {
  const result: any = {};
  
  // VALUE: line
  const valueMatch = text.match(/VALUE:\s*(.+?)(?:\n|$)/i);
  if (valueMatch) {
    let rawValue = valueMatch[1].trim();
    const numStr = rawValue.replace(/[$€£,]/g, '').trim();
    const numMatch = numStr.match(/([\d.]+)\s*(trillion|billion|million|%)?/i);
    
    if (numMatch) {
      let num = parseFloat(numMatch[1]);
      const unit = numMatch[2]?.toLowerCase();
      if (unit === 'trillion') num *= 1e12;
      else if (unit === 'billion') num *= 1e9;
      else if (unit === 'million') num *= 1e6;
      result.value = num;
    } else {
      result.value = rawValue;
    }
  }
  
  // SOURCE: line
  const sourceMatch = text.match(/SOURCE:\s*(.+?)(?:\n|$)/i);
  if (sourceMatch) result.source = sourceMatch[1].trim();
  
  // URL: line
  const urlMatch = text.match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
  if (urlMatch) result.url = urlMatch[1].trim();
  
  // CONFIDENCE: line
  const confMatch = text.match(/CONFIDENCE:\s*(\d+)/i);
  if (confMatch) result.confidence = parseInt(confMatch[1]);
  
  // TYPE: line
  const typeMatch = text.match(/TYPE:\s*(OFFICIAL|AGGREGATOR|NEWS_DERIVED)/i);
  if (typeMatch) result.type = typeMatch[1].toUpperCase();
  
  // NOTE: line
  const noteMatch = text.match(/NOTE:\s*(.+?)(?:\n|$)/i);
  if (noteMatch) result.note = noteMatch[1].trim();
  
  return result;
}

async function updateJob(jobId: string, data: any) {
  await prisma.dataAggregationJob.update({
    where: { id: jobId },
    data,
  });
}

async function addJobLog(jobId: string, level: string, message: string) {
  console.log(`[Job ${jobId.slice(-6)}] [${level}] ${message}`);
  
  await prisma.dataAggregationJob.update({
    where: { id: jobId },
    data: {
      logs: {
        push: {
          timestamp: new Date().toISOString(),
          level,
          message,
        },
      },
    },
  });
}
