import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { startAggregationJob } from '../services/aggregationService.js';
import { optionalAuth, requireAuth, requireCredits } from '../middleware/auth.js';

export const aggregationJobRoutes = Router();

// GET /api/aggregation-jobs/:countryId
aggregationJobRoutes.get('/:countryId', optionalAuth, async (req, res) => {
  try {
    // Build user filter
    const userFilter = req.userId ? { userId: req.userId } : {};
    
    const jobs = await prisma.dataAggregationJob.findMany({
      where: { 
        countryId: req.params.countryId,
        ...userFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
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
aggregationJobRoutes.get('/:countryId/active', optionalAuth, async (req, res) => {
  try {
    // Build user filter
    const userFilter = req.userId ? { userId: req.userId } : {};
    
    const job = await prisma.dataAggregationJob.findFirst({
      where: {
        countryId: req.params.countryId,
        status: { in: ['pending', 'running'] },
        ...userFilter,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
    res.json(job);
  } catch (error) {
    console.error('Error fetching active job:', error);
    res.status(500).json({ error: 'Failed to fetch active job' });
  }
});

// POST /api/aggregation-jobs - requires auth and minimum credits
// Aggregation uses many API calls, so require at least $1 in credits
aggregationJobRoutes.post('/', optionalAuth, async (req, res) => {
  try {
    const { countryId, year } = req.body;

    if (!countryId || !year) {
      return res.status(400).json({ error: 'countryId and year are required' });
    }

    // Check for existing job for this user (or globally if not authenticated)
    const userFilter = req.userId ? { userId: req.userId } : {};
    
    const existingJob = await prisma.dataAggregationJob.findFirst({
      where: {
        countryId,
        status: { in: ['pending', 'running'] },
        ...userFilter,
      },
    });

    if (existingJob) {
      return res.status(409).json({
        error: 'An aggregation job is already running for this country',
        job: existingJob,
      });
    }

    // Check credits if authenticated
    if (req.userId && req.user && req.user.creditBalance < 100) {
      return res.status(402).json({
        error: 'Insufficient credits for aggregation. Minimum $1.00 required.',
        creditBalance: req.user.creditBalance,
        required: 100,
      });
    }

    const job = await prisma.dataAggregationJob.create({
      data: {
        countryId,
        year,
        status: 'pending',
        userId: req.userId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Start the job with user context
    startAggregationJob(job.id, req.userId || undefined).catch((error) => {
      console.error('Aggregation job failed:', error);
    });

    res.json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/aggregation-jobs/:id/cancel
aggregationJobRoutes.post('/:id/cancel', optionalAuth, async (req, res) => {
  try {
    // Check ownership
    const existing = await prisma.dataAggregationJob.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (existing.userId && req.userId && existing.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this job' });
    }

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
aggregationJobRoutes.get('/:id/logs', optionalAuth, async (req, res) => {
  try {
    const job = await prisma.dataAggregationJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if user can view this job
    if (job.userId && req.userId && job.userId !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to view this job' });
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
