import express from 'express';
import { createSupabaseClient } from '../lib/supabase.js';
import { validateInput, projectSchema, projectUpdateSchema } from '../utils/validation.js';

const router = express.Router();

// Get all projects for a user
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const supabase = createSupabaseClient();
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        currency,
        status,
        created_at,
        updated_at,
        expenses:expenses(count)
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch projects' 
      });
    }

    // Calculate total amount and transaction count for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const { data: expenseStats, error: statsError } = await supabase
          .from('expenses')
          .select('total')
          .eq('project_id', project.id);

        if (statsError) {
          console.error('Error fetching expense stats:', statsError);
          return {
            ...project,
            transaction_count: 0,
            total_amount: 0
          };
        }

        const transactionCount = expenseStats.length;
        const totalAmount = expenseStats.reduce((sum, expense) => sum + expense.total, 0);

        return {
          ...project,
          transaction_count: transactionCount,
          total_amount: totalAmount
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithStats
    });

  } catch (error) {
    console.error('Error in GET /projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get projects by status for a user
router.get('/by-status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'status must be either "open" or "closed"' 
      });
    }

    const supabase = createSupabaseClient();
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('id, name, currency, status, created_at')
      .eq('user_id', user_id)
      .eq('status', status)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching projects by status:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch projects' 
      });
    }

    res.json({
      success: true,
      data: projects
    });

  } catch (error) {
    console.error('Error in GET /projects/by-status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create new project
router.post('/', async (req, res) => {
  try {
    const validation = validateInput(req.body, projectSchema);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.error 
      });
    }

    const supabase = createSupabaseClient();
    const { name, currency, user_id, status = 'open' } = validation.data;

    // Check if project name already exists for this user
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', name)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing project:', checkError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create project' 
      });
    }

    if (existingProject) {
      return res.status(400).json({ 
        success: false, 
        message: 'A project with this name already exists' 
      });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert([{ 
        name, 
        currency, 
        user_id,
        status
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create project' 
      });
    }

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project
    });

  } catch (error) {
    console.error('Error in POST /projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const validation = validateInput(req.body, projectUpdateSchema);
    
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.error 
      });
    }

    const supabase = createSupabaseClient();

    // Check if project exists and belongs to user
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (checkError || !existingProject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(validation.data)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update project' 
      });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: project
    });

  } catch (error) {
    console.error('Error in PUT /projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const supabase = createSupabaseClient();

    // Check if project exists and belongs to user
    const { data: existingProject, error: checkError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (checkError || !existingProject) {
      return res.status(404).json({ 
        success: false, 
        message: 'Project not found' 
      });
    }

    // Delete project (CASCADE will handle related expenses)
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete project' 
      });
    }

    res.json({
      success: true,
      message: 'Project and all associated expenses deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /projects:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;