import { storage } from './storage';
import { PipelineStage } from '@shared/db/schema';

const DEFAULT_STAGES = [
  { name: 'New Lead', color: '#3a86ff', order: 1 },
  { name: 'Contacted', color: '#4cc9f0', order: 2 },
  { name: 'Meeting Scheduled', color: '#f8961e', order: 3 },
  { name: 'Proposal Sent', color: '#f72585', order: 4 },
  { name: 'Negotiation', color: '#7209b7', order: 5 },
  { name: 'Won', color: '#90be6d', order: 6 },
  { name: 'Lost', color: '#577590', order: 7 }
];

/**
 * Initialize default pipeline stages if none exist
 */
export async function initPipelineStages(): Promise<void> {
  try {
    const existingStages = await storage.getPipelineStages();
    
    if (existingStages.length === 0) {
      
      for (const stageData of DEFAULT_STAGES) {
        await storage.createPipelineStage(stageData);
      }
      
    } else {
    }
  } catch (error) {
    console.error('Error initializing pipeline stages:', error);
  }
}