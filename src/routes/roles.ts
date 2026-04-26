import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

export const ALL_PERMISSIONS = [
  { id: 'register_patients',  description: 'Register and manage patients' },
  { id: 'view_all_patients',  description: 'View all patient records' },
  { id: 'delete_patients',    description: 'Delete patient records' },
  { id: 'record_vitals',      description: 'Record patient vitals' },
  { id: 'create_consultations', description: 'Create clinical consultations' },
  { id: 'view_medical_history', description: 'View full medical history' },
  { id: 'create_lab_requests',  description: 'Create laboratory requests' },
  { id: 'manage_lab_results',   description: 'Manage lab results' },
  { id: 'view_prescriptions',   description: 'View prescriptions' },
  { id: 'amend_prescriptions',  description: 'Amend prescriptions' },
  { id: 'manage_inventory',     description: 'Manage pharmacy inventory' },
  { id: 'manage_users',         description: 'Create and manage staff accounts' },
  { id: 'manage_roles',         description: 'Configure roles and permissions' },
  { id: 'manage_admissions',    description: 'Manage patient admissions' },
  { id: 'manage_appointments',  description: 'Manage appointments' },
  { id: 'manage_notices',       description: 'Post hospital notices' },
  { id: 'view_reports',         description: 'Access analytics and reports' },
  { id: 'manage_billing',       description: 'Process payments and billing' },
  { id: 'view_billing',         description: 'View billing records' },
];

const permById = (ids: string[]) =>
  ids.map(id => ALL_PERMISSIONS.find(p => p.id === id)).filter(Boolean);

/* In-memory role store — seeded with the 6 fixed roles */
let ROLES: any[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Full system access',
    permissions: permById([
      'register_patients','view_all_patients','delete_patients',
      'record_vitals','create_consultations','view_medical_history',
      'create_lab_requests','manage_lab_results',
      'view_prescriptions','amend_prescriptions','manage_inventory',
      'manage_users','manage_roles','manage_admissions','manage_appointments',
      'manage_notices','view_reports','manage_billing','view_billing',
    ]),
  },
  {
    id: 'doctor',
    name: 'Doctor',
    description: 'Clinical management',
    permissions: permById([
      'view_all_patients','create_consultations','view_medical_history',
      'create_lab_requests','view_prescriptions','manage_appointments',
    ]),
  },
  {
    id: 'nurse',
    name: 'Nurse',
    description: 'Patient care and vitals',
    permissions: permById([
      'register_patients','view_all_patients','record_vitals','manage_appointments',
    ]),
  },
  {
    id: 'pharmacist',
    name: 'Pharmacist',
    description: 'Pharmacy management',
    permissions: permById([
      'view_prescriptions','amend_prescriptions','manage_inventory',
    ]),
  },
  {
    id: 'lab_technician',
    name: 'Lab Technician',
    description: 'Laboratory tests',
    permissions: permById([
      'create_lab_requests','manage_lab_results','view_all_patients',
    ]),
  },
  {
    id: 'accounts',
    name: 'Accounts',
    description: 'Billing and payments',
    permissions: permById([
      'manage_billing','view_billing','view_reports',
    ]),
  },
];

router.get('/', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  res.json(ROLES);
});

router.get('/permissions', authenticateToken, authorizeRole(['admin']), (_req, res) => {
  res.json(ALL_PERMISSIONS);
});

router.post('/', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { name, description, permissionIds } = req.body;
  if (!name) return res.status(400).json({ error: 'Role name is required' });
  const id = name.toLowerCase().replace(/\s+/g, '_');
  if (ROLES.find(r => r.id === id)) {
    return res.status(409).json({ error: 'A role with that name already exists' });
  }
  const role = { id, name, description: description || '', permissions: permById(permissionIds || []) };
  ROLES.push(role);
  res.status(201).json(role);
});

router.put('/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { name, description, permissionIds } = req.body;
  const idx = ROLES.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Role not found' });
  ROLES[idx] = {
    ...ROLES[idx],
    name: name ?? ROLES[idx].name,
    description: description ?? ROLES[idx].description,
    permissions: permissionIds ? permById(permissionIds) : ROLES[idx].permissions,
  };
  res.json(ROLES[idx]);
});

router.delete('/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  if (req.params.id === 'admin') {
    return res.status(403).json({ error: 'Cannot delete the admin role' });
  }
  const before = ROLES.length;
  ROLES = ROLES.filter(r => r.id !== req.params.id);
  if (ROLES.length === before) return res.status(404).json({ error: 'Role not found' });
  res.json({ message: 'Role deleted' });
});

export default router;
