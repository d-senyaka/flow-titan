import * as fs from 'node:fs';
import * as vm from 'node:vm'; // 💥 NEW: The Virtual Machine module

interface TitanNode {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

interface TitanWorkflow {
  name: string;
  nodes: TitanNode[];
}

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

async function executeWorkflow(filePath: string) {
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const workflow: TitanWorkflow = JSON.parse(rawData);

  console.log(`🚀 Starting Workflow: ${workflow.name}\n`);
  const executionContext: Record<string, any> = {};

  for (const node of workflow.nodes) {
    console.log(`⏳ [Running] ${node.id} (Type: ${node.type})`);
    const resolvedParams = resolveParameters(node.parameters, executionContext);
    let nodeOutput: Record<string, any> = {};

    switch (node.type) {
      case 'Start':
        console.log(`   -> ${resolvedParams.message}`);
        nodeOutput = { timestamp: new Date().toISOString() };
        break;
      
      // 💥 NEW: The Code Sandbox Node
      case 'Code':
        console.log(`   -> 🛠️  Executing custom JavaScript sandbox...`);
        try {
          // 1. Define the safe environment (only allow access to 'context' and 'output')
          const sandboxEnvironment = { 
            context: executionContext, 
            output: {} as Record<string, any> 
          };
          
          // 2. Create the VM context
          vm.createContext(sandboxEnvironment);
          
          // 3. Run the user's code inside the bubble safely
          const script = new vm.Script(resolvedParams.code);
          script.runInContext(sandboxEnvironment);
          
          // 4. Capture whatever the user put into 'output'
          nodeOutput = sandboxEnvironment.output;
        } catch (error: any) {
          console.log(`   -> ❌ Sandbox Error: ${error.message}`);
          nodeOutput = { error: error.message };
        }
        break;

      case 'Log':
        console.log(`   -> 📝 SYSTEM LOG: ${resolvedParams.message}`);
        nodeOutput = { success: true };
        break;
      
      default:
        console.log(`   -> ⚠️ Unknown node type: ${node.type}`);
    }
    
    executionContext[node.id] = nodeOutput;
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log(`\n✅ Workflow [${workflow.name}] completed successfully!`);
}

executeWorkflow('./workflow.json').catch(console.error);