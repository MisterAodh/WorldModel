import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { startAggregationJob } from '../services/aggregationService.js';

export const aggregationJobRoutes = Router();

// GET /api/aggregation-jobs/:countryId
aggregationJobRoutes.get('/:countryId', async (req, res) => {
  try {
    const jobs = await prisma.dataAggregationJob.findMany({
      where: { countryId: req.params.countryId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/aggregation-jobs/:countryId/active
aggregationJobRoutes.get('/:countryId/active', async (req, res) => {
  try {
    const job = await prisma.dataAggregationJob.findFirst({
      where: {
        countryId: req.params.countryId,
        status: { in: ['pending', 'running'] },
      },
    });
    res.json(job);
  } catch (error) {
    console.error('Error fetching active job:', error);
    res.status(500).json({ error: 'Failed to fetch active job' });
  }
});

// POST /api/aggregation-jobs
aggregationJobRoutes.post('/', async (req, res) => {
  try {
    const { countryId, year } = req.body;

    if (!countryId || !year) {
      return res.status(400).json({ error: 'countryId and year are required' });
    }

    const existingJob = await prisma.dataAggregationJob.findFirst({
      where: {
        countryId,
        status: { in: ['pending', 'running'] },
      },
    });

    if (existingJob) {
      return res.status(409).json({
        error: 'An aggregation job is already running for this country',
        job: existingJob,
      });
    }

    const job = await prisma.dataAggregationJob.create({
      data: {
        countryId,
        year,
        status: 'pending',
      },
    });

    startAggregationJob(job.id).catch((error) => {
      console.error('Aggregation job failed:', error);
    });

    res.json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/aggregation-jobs/:id/cancel
aggregationJobRoutes.post('/:id/cancel', async (req, res) => {
  try {
    const job = await prisma.dataAggregationJob.update({
      where: { id: req.params.id },
      data: {
        status: 'failed',
        logs: {
          push: {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: 'Job cancelled by user',
          },
        },
      },
    });
    res.json(job);
  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ error: 'Failed to cancel job' });
  }
});

// GET /api/aggregation-jobs/:id/logs
aggregationJobRoutes.get('/:id/logs', async (req, res) => {
  try {
    const job = await prisma.dataAggregationJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      status: job.status,
      currentMetric: job.currentMetric,
      progress: {
        completed: job.completedMetrics,
        failed: job.failedMetrics,
        total: job.totalMetrics,
        percent: job.totalMetrics ? Math.round((job.completedMetrics / job.totalMetrics) * 100) : 0,
      },
      logs: job.logs,
    });
  } catch (error) {
    console.error('Error fetching job logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});
