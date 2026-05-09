import express from 'express';
import cors from 'cors';
import * as vm from 'node:vm';

const app = express();
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Allow server to read JSON

// Our existing Types
interface TitanNode {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

interface TitanWorkflow {
  name: string;
  nodes: TitanNode[];
}

// Our existing Template Resolver
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

// 💥 MODIFIED: Now it accepts a JSON object directly instead of a file path!
async function executeWorkflow(workflow: TitanWorkflow) {
  console.log(`\n🚀 API RECEIVED WORKFLOW: ${workflow.name}`);
  const executionContext: Record<string, any> = {};
  const logs: string[] = []; // Keep track of logs to send back to UI

  for (const node of workflow.nodes) {
    const logMsg = `⏳ [Running] ${node.id} (Type: ${node.type})`;
    console.log(logMsg);
    logs.push(logMsg);
    
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
        const finalLog = `📝 SYSTEM LOG: ${resolvedParams.message}`;
        console.log(`   -> ${finalLog}`);
        logs.push(finalLog);
        nodeOutput = { success: true };
        break;
    }
    
    executionContext[node.id] = nodeOutput;
    await new Promise(resolve => setTimeout(resolve, 500)); // slightly faster
  }

  console.log(`✅ Workflow completed!\n`);
  return { success: true, logs, finalContext: executionContext };
}

// 💥 NEW: The API Endpoint
app.post('/api/execute', async (req, res) => {
  try {
    const workflow: TitanWorkflow = req.body;
    const result = await executeWorkflow(workflow);
    res.json(result); // Send results back to frontend
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`\n🌊 Flow-titan Engine API is running on http://localhost:${PORT}`);
  console.log(`Waiting for workflows from the UI...`);
});