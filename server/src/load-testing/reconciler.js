import TestRun, { TEST_RUN_STATUS } from '../modules/tests/testRun.model.js';

/**
 * Reconciles orphaned test runs after server restarts.
 *
 * When the server process restarts (due to crash, deployment, or reboot), any test runs
 * left in 'running' or 'queued' state no longer have active child worker processes.
 * This function marks them as 'failed' with category 'INTERNAL_ERROR' and a clear explanation.
 *
 * @returns {Promise<number>} Number of reconciled test runs
 */
export async function reconcileInterruptedRuns() {
  try {
    const interruptedRuns = await TestRun.find({
      status: { $in: [TEST_RUN_STATUS.RUNNING, TEST_RUN_STATUS.QUEUED] },
    });

    if (interruptedRuns.length === 0) {
      return 0;
    }

    let count = 0;
    for (const run of interruptedRuns) {
      try {
        run.transitionTo(TEST_RUN_STATUS.FAILED, {
          category: 'INTERNAL_ERROR',
          message: 'Server was restarted while this test run was in progress or queued.',
          isSimulated: false,
        });
        await run.save();
        count++;
      } catch (err) {
        console.warn(`[Reconciler] Failed to reconcile test run '${run._id}':`, err.message);
      }
    }

    if (count > 0) {
      console.log(`[Reconciler] Successfully reconciled ${count} interrupted test run(s) from previous server session.`);
    }

    return count;
  } catch (error) {
    console.error('[Reconciler] Error during startup reconciliation of interrupted test runs:', error.message);
    return 0;
  }
}

export default {
  reconcileInterruptedRuns,
};

