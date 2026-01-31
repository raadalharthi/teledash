const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// GET /api/organizations/current - Get current org
router.get('/current', async (req, res) => {
  try {
    const user = await db.queryOne('SELECT organization_id FROM users WHERE id = $1', [req.user.id]);
    if (!user?.organization_id) {
      return res.json({ success: true, organization: null });
    }

    const org = await db.queryOne('SELECT * FROM organizations WHERE id = $1', [user.organization_id]);
    const memberCount = await db.queryOne(
      'SELECT COUNT(*) as count FROM organization_members WHERE organization_id = $1 AND is_active = true',
      [user.organization_id]
    );
    const myRole = await db.queryOne(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [user.organization_id, req.user.id]
    );

    res.json({
      success: true,
      organization: org,
      member_count: parseInt(memberCount?.count || '0'),
      my_role: myRole?.role || 'owner',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/organizations - Create org (auto on register if none)
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const org = await db.queryOne(
      `INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING *`,
      [name, slug + '-' + Date.now().toString(36)]
    );

    // Add creator as org_admin
    await db.query(
      `INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'org_admin')`,
      [org.id, req.user.id]
    );

    // Update user's organization_id
    await db.query('UPDATE users SET organization_id = $1 WHERE id = $2', [org.id, req.user.id]);

    // Update existing data to org
    await db.query('UPDATE conversations SET organization_id = $1 WHERE user_id = $2', [org.id, req.user.id]);
    await db.query('UPDATE contacts SET organization_id = $1 WHERE user_id = $2', [org.id, req.user.id]);
    await db.query('UPDATE channels SET organization_id = $1 WHERE user_id = $2', [org.id, req.user.id]);
    await db.query('UPDATE tickets SET organization_id = $1 WHERE user_id = $2', [org.id, req.user.id]);

    res.json({ success: true, organization: org });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/organizations/members - List members
router.get('/members', async (req, res) => {
  try {
    const user = await db.queryOne('SELECT organization_id FROM users WHERE id = $1', [req.user.id]);
    if (!user?.organization_id) {
      return res.json({ success: true, members: [] });
    }

    const members = await db.queryAll(
      `SELECT om.*, u.name, u.email, u.created_at as user_created_at
       FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1
       ORDER BY om.joined_at ASC`,
      [user.organization_id]
    );

    res.json({ success: true, members });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/organizations/invite - Invite member
router.post('/invite', async (req, res) => {
  try {
    const { email, role = 'agent' } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

    const user = await db.queryOne('SELECT organization_id FROM users WHERE id = $1', [req.user.id]);
    if (!user?.organization_id) {
      return res.status(400).json({ success: false, error: 'You need to create an organization first' });
    }

    // Check if already a member
    const existing = await db.queryOne(
      `SELECT id FROM organization_members om
       JOIN users u ON om.user_id = u.id
       WHERE om.organization_id = $1 AND u.email = $2`,
      [user.organization_id, email]
    );
    if (existing) {
      return res.status(400).json({ success: false, error: 'User is already a member' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await db.queryOne(
      `INSERT INTO invitations (organization_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.organization_id, email, role, token, req.user.id, expiresAt]
    );

    res.json({ success: true, invitation, invite_link: `/invite/${token}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/organizations/accept-invite - Accept invitation
router.post('/accept-invite', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });

    const invitation = await db.queryOne(
      `SELECT * FROM invitations WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );
    if (!invitation) {
      return res.status(400).json({ success: false, error: 'Invalid or expired invitation' });
    }

    // Add user to org
    await db.query(
      `INSERT INTO organization_members (organization_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, user_id) DO UPDATE SET is_active = true, role = $3`,
      [invitation.organization_id, req.user.id, invitation.role, invitation.invited_by]
    );

    // Update user's org
    await db.query('UPDATE users SET organization_id = $1 WHERE id = $2', [invitation.organization_id, req.user.id]);

    // Mark invitation as accepted
    await db.query('UPDATE invitations SET accepted_at = NOW() WHERE id = $1', [invitation.id]);

    const org = await db.queryOne('SELECT * FROM organizations WHERE id = $1', [invitation.organization_id]);

    res.json({ success: true, organization: org });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/organizations/members/:userId - Update member role
router.patch('/members/:userId', async (req, res) => {
  try {
    const { role, is_active } = req.body;
    const user = await db.queryOne('SELECT organization_id FROM users WHERE id = $1', [req.user.id]);
    if (!user?.organization_id) {
      return res.status(400).json({ success: false, error: 'No organization' });
    }

    const updates = [];
    const params = [];
    let idx = 1;

    if (role !== undefined) { updates.push(`role = $${idx++}`); params.push(role); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); params.push(is_active); }

    if (updates.length === 0) return res.json({ success: true });

    params.push(user.organization_id, req.params.userId);
    await db.query(
      `UPDATE organization_members SET ${updates.join(', ')} WHERE organization_id = $${idx++} AND user_id = $${idx}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
