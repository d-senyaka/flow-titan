import express from 'express';
import cors from 'cors';
import * as vm from 'node:vm';
import { Queue, Worker } from 'bullmq'; // 💥 NEW: The Broker system
import { Redis } from 'ioredis';

const app = express();
app.use(cors());
app.use(express.json());

// 💥 NEW: Connect to our Docker Redis container
const redisConnection = new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: null });

// 💥 NEW: Create the Waiting Room (Queue)
const workflowQueue = new Queue('TitanWorkflows', { connection: redisConnection });

interface TitanNode { id: string; type: string; parameters: Record<string, any>; }
interface TitanWorkflow { name: string; nodes: TitanNode[]; }

function resolveParameters(params: Record<string, any>, context: Record<string, any>) {
  const resolved: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      resolved[key] = value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const keys = path.split('.');
        let currentData = context;
        for (const k of keys) {
          if (currentData[k] === undefined) return 'UNDEFINED';
          currentData = currentData[k];
        }
        return String(currentData);
      });
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

// Our core engine logic (Same as before, just moved inside the worker below)
async function executeWorkflow(workflow: TitanWorkflow, jobId: string) {
  const executionContext: Record<string, any> = {};
  
  for (const node of workflow.nodes) {
    console.log(`[Job ${jobId}] ⏳ Running ${node.id} (${node.type})`);
    const resolvedParams = resolveParameters(node.parameters, executionContext);
    let nodeOutput: Record<string, any> = {};

    switch (node.type) {
      case 'Start':
        nodeOutput = { timestamp: new Date().toISOString() };
        break;
      case 'Code':
        try {
          const sandboxEnvironment = { context: executionContext, output: {} as Record<string, any> };
          vm.createContext(sandboxEnvironment);
          const script = new vm.Script(resolvedParams.code);
          script.runInContext(sandboxEnvironment);
          nodeOutput = sandboxEnvironment.output;
        } catch (error: any) {
          nodeOutput = { error: error.message };
        }
        break;
      case 'Log':
        console.log(`[Job ${jobId}] 📝 LOG: ${resolvedParams.message}`);
        nodeOutput = { success: true };
        break;
    }
    
    executionContext[node.id] = nodeOutput;
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate heavy processing
  }
  return executionContext;
}

// 💥 NEW: The Worker (The Kitchen). It sits in the background waiting for jobs.
const workflowWorker = new Worker('TitanWorkflows', async job => {
  console.log(`\n⚙️ WORKER PICKED UP JOB: #${job.id} - ${job.data.name}`);
  const finalContext = await executeWorkflow(job.data, job.id as string);
  console.log(`✅ WORKER FINISHED JOB: #${job.id}\n`);
  return finalContext;
}, { connection: redisConnection });

// 💥 MODIFIED: The API (The Waiter). It just takes the order and gives a receipt.
app.post('/api/execute', async (req, res) => {
  try {
    const workflow: TitanWorkflow = req.body;
    
    // Add it to Redis instead of running it directly!
    const job = await workflowQueue.add('run-workflow', workflow);
    
    console.log(`📥 API RECEIVED ORDER: Added to queue as Job #${job.id}`);
    
    // Immediately reply to the UI
    res.json({ 
      success: true, 
      message: "Workflow queued successfully!", 
      jobId: job.id 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🌊 Flow-titan Enterprise Engine is running on port ${PORT}`);
  console.log(`🔌 Redis Queue Connected. Worker is standing by...`);
});