import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bullmq to avoid Redis connection in tests
vi.mock('bullmq', () => {
  const mockQueueAdd = vi.fn().mockResolvedValue({});
  const mockQueueClose = vi.fn().mockResolvedValue(undefined);
  const mockRemoveRepeatable = vi.fn().mockResolvedValue(undefined);

  const mockQueue = vi.fn().mockImplementation(() => ({
    add: mockQueueAdd,
    close: mockQueueClose,
    removeRepeatable: mockRemoveRepeatable,
  }));

  const mockWorkerOn = vi.fn();
  const mockWorker = vi.fn().mockImplementation(() => ({
    on: mockWorkerOn,
    close: vi.fn(),
  }));

  return {
    Queue: mockQueue,
    Worker: mockWorker,
    Job: vi.fn(),
  };
});

// Mock orchestrator so we don't hit the DB
vi.mock('../../src/pipeline/orchestrator', () => ({
  orchestrateDailyRun: vi.fn().mockResolvedValue(42),
}));

describe('Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('setupDailyScheduler', () => {
    it('creates a repeatable job with pattern "0 6 * * *"', async () => {
      const { Queue } = await import('bullmq');
      const { setupDailyScheduler } = await import('../../src/pipeline/scheduler');

      await setupDailyScheduler();

      // Queue constructor called with 'daily-pipeline'
      expect(Queue).toHaveBeenCalledWith('daily-pipeline', expect.anything());

      // queue.add called with repeat pattern
      const queueInstance = (Queue as any).mock.results[0].value;
      expect(queueInstance.add).toHaveBeenCalledWith(
        'daily-collection',
        {},
        expect.objectContaining({
          repeat: expect.objectContaining({
            pattern: '0 6 * * *',
          }),
        }),
      );
    });

    it('uses key "daily-collection" to prevent duplicates on restart', async () => {
      const { Queue } = await import('bullmq');
      const { setupDailyScheduler } = await import('../../src/pipeline/scheduler');

      await setupDailyScheduler();

      const queueInstance = (Queue as any).mock.results[0].value;
      const addCall = queueInstance.add.mock.calls[0];
      const opts = addCall[2];

      expect(opts.repeat.key).toBe('daily-collection');
    });

    it('closes the queue after setting up the job', async () => {
      const { Queue } = await import('bullmq');
      const { setupDailyScheduler } = await import('../../src/pipeline/scheduler');

      await setupDailyScheduler();

      const queueInstance = (Queue as any).mock.results[0].value;
      expect(queueInstance.close).toHaveBeenCalled();
    });
  });

  describe('removeDailyScheduler', () => {
    it('removes the repeatable job with correct pattern and key', async () => {
      const { Queue } = await import('bullmq');
      const { removeDailyScheduler } = await import('../../src/pipeline/scheduler');

      await removeDailyScheduler();

      const queueInstance = (Queue as any).mock.results[0].value;
      expect(queueInstance.removeRepeatable).toHaveBeenCalledWith(
        'daily-collection',
        { pattern: '0 6 * * *', key: 'daily-collection' },
      );
    });

    it('closes the queue after removing the job', async () => {
      const { Queue } = await import('bullmq');
      const { removeDailyScheduler } = await import('../../src/pipeline/scheduler');

      await removeDailyScheduler();

      const queueInstance = (Queue as any).mock.results[0].value;
      expect(queueInstance.close).toHaveBeenCalled();
    });
  });

  describe('createDailyPipelineWorker', () => {
    it('creates a Worker for the "daily-pipeline" queue', async () => {
      const { Worker } = await import('bullmq');
      const { createDailyPipelineWorker } = await import('../../src/pipeline/scheduler');

      createDailyPipelineWorker();

      expect(Worker).toHaveBeenCalledWith(
        'daily-pipeline',
        expect.any(Function),
        expect.objectContaining({ concurrency: 1 }),
      );
    });

    it('registers error, completed, and failed event handlers', async () => {
      const { Worker } = await import('bullmq');
      const { createDailyPipelineWorker } = await import('../../src/pipeline/scheduler');

      createDailyPipelineWorker();

      const workerInstance = (Worker as any).mock.results[0].value;
      expect(workerInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(workerInstance.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(workerInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('returns the Worker instance', async () => {
      const { createDailyPipelineWorker } = await import('../../src/pipeline/scheduler');

      const worker = createDailyPipelineWorker();

      expect(worker).toBeDefined();
    });
  });
});
