import cron from 'node-cron';
import Flow from '../Model/Flow.js';
import { runFlow } from './flowRunner.js';

// Map of flowId -> scheduled cron Task
const activeCronTasks = new Map();

export const initializeScheduler = () => {
  console.log('Initializing Flow Scheduler...');

  // Master ticker runs every 1 minute to sync active flows and trigger one-time schedules
  cron.schedule('* * * * *', async () => {
    try {
      await syncFlowSchedules();
    } catch (err) {
      console.error('Error in scheduler sync tick:', err);
    }
  });
};

export const syncFlowSchedules = async () => {
  const activeFlows = await Flow.find({ status: 'active' });
  const activeFlowIds = new Set(activeFlows.map((f) => f._id.toString()));

  // Cancel cron jobs for flows that are no longer active or deleted
  for (const [flowId, task] of activeCronTasks.entries()) {
    if (!activeFlowIds.has(flowId)) {
      task.stop();
      activeCronTasks.delete(flowId);
      console.log(`Stopped scheduled task for inactive flow ${flowId}`);
    }
  }

  const now = new Date();

  for (const flow of activeFlows) {
    const flowId = flow._id.toString();

    // 1. One-time schedule
    if (flow.scheduleType === 'one_time') {
      if (flow.scheduleTime && flow.scheduleTime <= now) {
        console.log(`Triggering one-time schedule for flow ${flow.name} (${flowId})`);
        runFlow(flowId).catch((e) => console.error(`Error running one-time flow ${flowId}:`, e));
      }
    }

    // 2. Recurring cron schedule
    if (flow.scheduleType === 'recurring' && flow.cronExpression) {
      if (!activeCronTasks.has(flowId)) {
        try {
          const tz = flow.timezone || 'UTC';
          if (cron.validate(flow.cronExpression)) {
            const task = cron.schedule(
              flow.cronExpression,
              async () => {
                console.log(`Triggering cron schedule [${flow.cronExpression}] in ${tz} for flow ${flow.name}`);
                try {
                  await runFlow(flowId);
                } catch (e) {
                  console.error(`Error running cron flow ${flowId}:`, e);
                }
              },
              {
                timezone: tz,
              }
            );

            activeCronTasks.set(flowId, task);
            console.log(`Registered cron schedule for flow ${flow.name} (${flowId}) in timezone ${tz}`);
          }
        } catch (cronErr) {
          console.error(`Invalid cron expression or timezone for flow ${flowId}:`, cronErr);
        }
      }
    }
  }
};
