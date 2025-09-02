import cron from 'node-cron';
import { getRedisClient } from './redis';

// Store for active jobs
const activeJobs: Record<string, cron.ScheduledTask> = {};

/**
 * Schedule a cron job to run at a specific time
 * @param jobId Unique identifier for the job
 * @param scheduledTime Date when the job should run
 * @param callback Function to execute when the job runs
 */
export const scheduleCronJob = async (
  jobId: string,
  scheduledTime: Date,
  callback: () => Promise<void>
): Promise<void> => {
  try {
    // Cancel existing job with the same ID if it exists
    await cancelCronJob(jobId);
    
    // Convert the date to cron expression
    const cronExpression = dateToCronExpression(scheduledTime);
    
    // Schedule the job
    const task = cron.schedule(cronExpression, async () => {
      try {
        // Execute the callback
        await callback();
        
        // Remove the job from active jobs after execution
        delete activeJobs[jobId];
        
        // Remove from Redis
        await getRedisClient().del(`cron:job:${jobId}`);
      } catch (error) {
        console.error(`Error executing cron job ${jobId}:`, error);
      }
    });
    
    // Store the job
    activeJobs[jobId] = task;
    
    // Store in Redis for persistence across restarts
    await getRedisClient().set(
      `cron:job:${jobId}`,
      JSON.stringify({
        scheduledTime: scheduledTime.toISOString(),
        createdAt: new Date().toISOString()
      })
    );
    
    console.log(`Cron job ${jobId} scheduled for ${scheduledTime}`);
  } catch (error) {
    console.error(`Error scheduling cron job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Cancel a scheduled cron job
 * @param jobId Unique identifier for the job
 */
export const cancelCronJob = async (jobId: string): Promise<void> => {
  try {
    // Stop the job if it exists
    if (activeJobs[jobId]) {
      activeJobs[jobId].stop();
      delete activeJobs[jobId];
      console.log(`Cron job ${jobId} cancelled`);
    }
    
    // Remove from Redis
    await getRedisClient().del(`cron:job:${jobId}`);
  } catch (error) {
    console.error(`Error cancelling cron job ${jobId}:`, error);
    throw error;
  }
};

/**
 * Convert a Date object to a cron expression
 * @param date Date to convert
 * @returns Cron expression
 */
const dateToCronExpression = (date: Date): string => {
  const minutes = date.getMinutes();
  const hours = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-indexed in JS
  const dayOfWeek = date.getDay();
  
  return `${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;
};

/**
 * Initialize cron jobs from Redis on server start
 */
export const initCronJobs = async (): Promise<void> => {
  try {
    // Get all cron jobs from Redis
    const keys = await getRedisClient().keys('cron:job:*');
    
    for (const key of keys) {
      try {
        const jobData = await getRedisClient().get(key);
        if (!jobData) continue;
        
        const { scheduledTime } = JSON.parse(jobData);
        const jobId = key.replace('cron:job:', '');
        
        // Only reschedule if the time is in the future
        const scheduledDate = new Date(scheduledTime);
        if (scheduledDate > new Date()) {
          // Reschedule the job
          // Note: This is a placeholder. In a real implementation,
          // you would need to store the callback function or job type
          // and reconstruct the appropriate callback.
          await scheduleCronJob(jobId, scheduledDate, async () => {
            console.log(`Executed restored job ${jobId}`);
            // In a real implementation, you would dispatch to the appropriate handler
            // based on the job type (e.g., homework delivery, notification, etc.)
          });
        } else {
          // Remove expired jobs
          await getRedisClient().del(key);
        }
      } catch (jobError) {
        console.error(`Error restoring cron job ${key}:`, jobError);
      }
    }
    
    console.log(`Initialized ${keys.length} cron jobs from Redis`);
  } catch (error) {
    console.error('Error initializing cron jobs:', error);
  }
};

/**
 * Shutdown all active cron jobs
 */
export const shutdownCronJobs = (): void => {
  Object.values(activeJobs).forEach(job => job.stop());
  console.log(`Shutdown ${Object.keys(activeJobs).length} active cron jobs`);
};