import { Router } from 'express';
import { ensureAuthenticated, ensureSuperAdmin } from '../middleware';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();


const updateUsageSchema = z.object({
  storageUsed: z.number().int().min(0).optional(),
  bandwidthUsed: z.number().int().min(0).optional(),
  filesCount: z.number().int().min(0).optional()
});


const overrideUsageSchema = z.object({
  currentStorageUsed: z.number().int().min(0).optional(),
  currentBandwidthUsed: z.number().int().min(0).optional(),
  filesCount: z.number().int().min(0).optional(),
  reason: z.string().optional()
});

/**
 * Get company data usage and limits
 */
router.get('/:companyId/usage', ensureSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }


    let plan = null;
    if (company.planId) {
      plan = await storage.getPlan(company.planId);
    }


    const storagePercentage = plan?.storageLimit 
      ? Math.round((company.currentStorageUsed || 0) / plan.storageLimit * 100)
      : 0;
    
    const bandwidthPercentage = plan?.bandwidthLimit
      ? Math.round((company.currentBandwidthUsed || 0) / plan.bandwidthLimit * 100)
      : 0;

    const filesPercentage = plan?.totalFilesLimit
      ? Math.round((company.filesCount || 0) / plan.totalFilesLimit * 100)
      : 0;

    const usageData = {
      companyId: company.id,
      companyName: company.name,
      planName: plan?.name || 'No Plan',
      

      currentUsage: {
        storage: company.currentStorageUsed || 0, // in MB
        bandwidth: company.currentBandwidthUsed || 0, // in MB
        files: company.filesCount || 0
      },
      

      limits: {
        storage: plan?.storageLimit || 0, // in MB
        bandwidth: plan?.bandwidthLimit || 0, // in MB
        fileUpload: plan?.fileUploadLimit || 0, // in MB
        totalFiles: plan?.totalFilesLimit || 0
      },
      

      percentages: {
        storage: storagePercentage,
        bandwidth: bandwidthPercentage,
        files: filesPercentage
      },
      

      status: {
        storageNearLimit: storagePercentage >= 80,
        bandwidthNearLimit: bandwidthPercentage >= 80,
        filesNearLimit: filesPercentage >= 80,
        storageExceeded: storagePercentage >= 100,
        bandwidthExceeded: bandwidthPercentage >= 100,
        filesExceeded: filesPercentage >= 100
      },
      
      lastUpdated: company.lastUsageUpdate
    };

    res.json(usageData);

  } catch (error) {
    console.error('Error fetching company usage:', error);
    res.status(500).json({ error: 'Failed to fetch company usage data' });
  }
});

/**
 * Update company usage (internal API for system use)
 */
router.post('/:companyId/usage/update', ensureAuthenticated, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const validatedData = updateUsageSchema.parse(req.body);

    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }


    const updateData: any = {
      lastUsageUpdate: new Date()
    };

    if (validatedData.storageUsed !== undefined) {
      updateData.currentStorageUsed = validatedData.storageUsed;
    }
    if (validatedData.bandwidthUsed !== undefined) {
      updateData.currentBandwidthUsed = validatedData.bandwidthUsed;
    }
    if (validatedData.filesCount !== undefined) {
      updateData.filesCount = validatedData.filesCount;
    }

    await storage.updateCompany(companyId, updateData);

    res.json({
      success: true,
      message: 'Usage updated successfully',
      updatedFields: Object.keys(updateData)
    });

  } catch (error) {
    console.error('Error updating company usage:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Failed to update company usage' });
  }
});

/**
 * Override company usage manually (admin only)
 */
router.post('/:companyId/usage/override', ensureSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    const validatedData = overrideUsageSchema.parse(req.body);

    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }


    const updateData: any = {
      lastUsageUpdate: new Date()
    };

    if (validatedData.currentStorageUsed !== undefined) {
      updateData.currentStorageUsed = validatedData.currentStorageUsed;
    }
    if (validatedData.currentBandwidthUsed !== undefined) {
      updateData.currentBandwidthUsed = validatedData.currentBandwidthUsed;
    }
    if (validatedData.filesCount !== undefined) {
      updateData.filesCount = validatedData.filesCount;
    }

    await storage.updateCompany(companyId, updateData);




    res.json({
      success: true,
      message: 'Usage overridden successfully',
      reason: validatedData.reason,
      updatedFields: Object.keys(updateData).filter(key => key !== 'lastUsageUpdate')
    });

  } catch (error) {
    console.error('Error overriding company usage:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Failed to override company usage' });
  }
});

/**
 * Reset monthly bandwidth usage (typically called by a cron job)
 */
router.post('/:companyId/usage/reset-bandwidth', ensureSuperAdmin, async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId);
    
    if (isNaN(companyId)) {
      return res.status(400).json({ error: 'Invalid company ID' });
    }

    await storage.updateCompany(companyId, {
      currentBandwidthUsed: 0,
      lastUsageUpdate: new Date()
    });

    res.json({
      success: true,
      message: 'Bandwidth usage reset successfully'
    });

  } catch (error) {
    console.error('Error resetting bandwidth usage:', error);
    res.status(500).json({ error: 'Failed to reset bandwidth usage' });
  }
});

export default router;
