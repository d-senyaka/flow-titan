import * as fs from 'node:fs';

// 1. Define our Types (Strict typing is crucial for complex systems)
interface TitanNode {
  id: string;
  type: string;
  parameters: Record<string, any>;
}

interface TitanWorkflow {
  name: string;
  nodes: TitanNode[];
}

// 2. The Core Execution Engine
async function executeWorkflow(filePath: string) {
  // Read and parse the JSON file
  const rawData = fs.readFileSync(filePath, 'utf-8');
  const workflow: TitanWorkflow = JSON.parse(rawData);

  console.log(`🚀 Starting Workflow: ${workflow.name}\n`);

  // 3. The "Runner" Loop
  // For Phase 1, we are just executing them in array order. 
  // Later, we will upgrade this to a DAG solver!
  for (const node of workflow.nodes) {
    console.log(`⏳ [Running] ${node.id} (Type: ${node.type})`);
    
    // The "Action" router
    switch (node.type) {
      case 'Start':
        console.log(`   -> ${node.parameters.message}`);
        break;
      
      case 'Log':
        console.log(`   -> 📝 SYSTEM LOG: ${node.parameters.message}`);
        break;
      
      default:
        console.log(`   -> ⚠️ Unknown node type: ${node.type}`);
    }
    
    // Simulate a tiny bit of processing time so it feels real
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  console.log(`\n✅ Workflow [${workflow.name}] completed successfully!`);
}

// 4. Trigger the engine
executeWorkflow('./workflow.json').catch(console.error);